"""Cliente de Gemini con cascada de modelos para el OCR de tickets.

La cascada prueba los modelos configurados en orden (2.5-flash -> 2.0-flash ->
2.5-pro) y se queda con el primero que responde de forma válida. La lógica de
parseo y de cascada está aislada para poder testearse sin llamar a la red.
"""

import json
import logging
from dataclasses import dataclass

from google import genai
from google.genai import types

from .config import Settings
from .models import (
    QuizGeneration,
    QuizQuestion,
    ReceiptExtraction,
    clean_quiz_questions,
)

logger = logging.getLogger("brindi.ai.gemini")

OCR_SYSTEM_INSTRUCTION = (
    "Eres un lector de tickets preciso para una app de división de cuentas. "
    "Extrae únicamente lo que puedas leer en la imagen; nunca inventes productos "
    "ni importes. Responde estrictamente con el esquema JSON indicado."
)

OCR_PROMPT = (
    "Extrae las líneas de este ticket. Para cada producto incluye una descripción "
    "corta y su precio como número (usa punto como separador decimal). Incluye "
    "cargos como servicio o impuestos como líneas si aparecen, pero excluye "
    "subtotal, total, propinas sugeridas, cambio y líneas de método de pago. "
    "Indica además el total impreso y el código de moneda ISO si son visibles."
)

# --- Quiz (trivia) ---

QUIZ_SYSTEM_INSTRUCTION = (
    "Eres un generador de trivia preciso y factual. Cada pregunta debe tener "
    "exactamente cuatro opciones y una única respuesta correcta; la opción marcada "
    "como correcta debe ser verdadera. Responde solo con el esquema JSON indicado."
)

CATEGORY_LABELS: dict[str, dict[str, str]] = {
    "FUTBOL": {"es": "fútbol", "en": "football (soccer)"},
    "PELICULAS_SERIES": {"es": "películas y series", "en": "movies and TV series"},
    "MUSICA": {"es": "música", "en": "music"},
    "GEOGRAFIA": {"es": "geografía", "en": "geography"},
    "HISTORIA": {"es": "historia", "en": "history"},
    "CIENCIA": {"es": "ciencia", "en": "science"},
    "RANDOM": {"es": "cultura general variada", "en": "mixed general knowledge"},
}
LEVEL_LABELS: dict[str, dict[str, str]] = {
    "FACIL": {"es": "fácil", "en": "easy"},
    "MEDIO": {"es": "media", "en": "medium"},
    "DIFICIL": {"es": "difícil", "en": "hard"},
    "IMPOSIBLE": {"es": "casi imposible", "en": "nearly impossible"},
}
LANGUAGE = {"es": "español", "en": "English"}


def build_quiz_prompt(category: str, level: str, count: int, locale: str) -> str:
    cat = CATEGORY_LABELS.get(category, {}).get(locale, category)
    lvl = LEVEL_LABELS.get(level, {}).get(locale, level)
    lang = LANGUAGE.get(locale, "español")
    return (
        f"Genera {count} preguntas de trivia tipo test sobre {cat}, dificultad {lvl}. "
        f"Escribe las preguntas, las opciones y las explicaciones en {lang}. "
        "Cada pregunta debe tener exactamente 4 opciones, una sola correcta "
        "(indica su índice 0-3 en correct_index) y una explicación breve. "
        "No repitas preguntas ni opciones."
    )


@dataclass
class GeminiResult:
    extraction: ReceiptExtraction
    model: str
    tokens: int


class GeminiUnavailableError(RuntimeError):
    """Se lanza cuando no hay clave configurada o todos los modelos fallan."""


def parse_extraction(raw_text: str | None) -> ReceiptExtraction:
    """Parsea y valida el JSON devuelto por el modelo. Lanza si está vacío o es inválido."""
    if raw_text is None or not raw_text.strip():
        raise ValueError("respuesta vacía del modelo")
    data = json.loads(raw_text)
    return ReceiptExtraction.model_validate(data)


def extract_token_count(response: object) -> int:
    """Lee el total de tokens del metadato de uso, si está disponible."""
    meta = getattr(response, "usage_metadata", None)
    if meta is None:
        return 0
    total = getattr(meta, "total_token_count", None)
    return int(total) if total else 0


class GeminiClient:
    def __init__(self, settings: Settings, client: object | None = None) -> None:
        self._settings = settings
        if client is not None:
            self._client = client
        elif settings.gemini_api_key:
            self._client = genai.Client(api_key=settings.gemini_api_key)
        else:
            self._client = None

    @property
    def configured(self) -> bool:
        return self._client is not None

    def extract_receipt(self, image_bytes: bytes, mime_type: str) -> GeminiResult:
        """Recorre la cascada de modelos hasta obtener una extracción válida."""
        if self._client is None:
            raise GeminiUnavailableError("GEMINI_API_KEY no configurada")

        errors: list[str] = []
        for model in self._settings.ocr_models:
            try:
                return self._try_model(model, image_bytes, mime_type)
            except Exception as exc:  # noqa: BLE001 - se intenta el siguiente modelo de la cascada
                logger.warning("modelo OCR falló", extra={"model": model})
                errors.append(f"{model}: {exc}")
                continue
        raise GeminiUnavailableError("; ".join(errors) or "sin modelos disponibles")

    def _try_model(self, model: str, image_bytes: bytes, mime_type: str) -> GeminiResult:
        response = self._client.models.generate_content(  # type: ignore[union-attr]
            model=model,
            contents=[
                OCR_PROMPT,
                types.Part.from_bytes(data=image_bytes, mime_type=mime_type),
            ],
            config=types.GenerateContentConfig(
                system_instruction=OCR_SYSTEM_INSTRUCTION,
                response_mime_type="application/json",
                response_schema=ReceiptExtraction,
                temperature=0.0,
            ),
        )
        extraction = parse_extraction(getattr(response, "text", None))
        return GeminiResult(extraction=extraction, model=model, tokens=extract_token_count(response))

    def generate_quiz(
        self, category: str, level: str, count: int, locale: str
    ) -> tuple[list[QuizQuestion], str]:
        """Recorre la cascada hasta obtener preguntas válidas. Devuelve (preguntas, modelo)."""
        if self._client is None:
            raise GeminiUnavailableError("GEMINI_API_KEY no configurada")

        errors: list[str] = []
        for model in self._settings.quiz_models:
            try:
                questions = self._try_quiz_model(model, category, level, count, locale)
                if not questions:
                    raise ValueError("sin preguntas válidas")
                return questions, model
            except Exception as exc:  # noqa: BLE001 - se intenta el siguiente modelo
                logger.warning("modelo quiz falló", extra={"model": model})
                errors.append(f"{model}: {exc}")
                continue
        raise GeminiUnavailableError("; ".join(errors) or "sin modelos disponibles")

    def _try_quiz_model(
        self, model: str, category: str, level: str, count: int, locale: str
    ) -> list[QuizQuestion]:
        response = self._client.models.generate_content(  # type: ignore[union-attr]
            model=model,
            contents=[build_quiz_prompt(category, level, count, locale)],
            config=types.GenerateContentConfig(
                system_instruction=QUIZ_SYSTEM_INSTRUCTION,
                response_mime_type="application/json",
                response_schema=QuizGeneration,
                temperature=0.7,
            ),
        )
        raw = getattr(response, "text", None)
        if raw is None or not raw.strip():
            raise ValueError("respuesta vacía del modelo")
        generation = QuizGeneration.model_validate_json(raw)
        return clean_quiz_questions(generation, count)
