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
from .models import ReceiptExtraction

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
