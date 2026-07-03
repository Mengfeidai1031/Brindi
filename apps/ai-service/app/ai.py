"""Motor de IA: recorre la cascada de proveedores configurada para cada tarea.

Reemplaza al antiguo cliente de Gemini. Todos los proveedores hablan la API de chat
OpenAI-compatible (ver `providers/`). La lógica de parseo/validación con Pydantic se
mantiene aislada para poder testearse inyectando un cliente HTTP falso.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Any

import httpx

from .config import Settings
from .models import (
    PlanActivity,
    PlanGeneration,
    QuizGeneration,
    QuizQuestion,
    ReceiptExtraction,
    clean_plan,
    clean_quiz_questions,
)
from .models import PlanRequest as PlanRequestModel
from .prompts import (
    OCR_PROMPT,
    OCR_SYSTEM_INSTRUCTION,
    PLAN_SYSTEM_INSTRUCTION,
    QUIZ_SYSTEM_INSTRUCTION,
    build_plan_prompt,
    build_quiz_prompt,
)
from .providers import openai_compat as oc
from .providers.base import ProviderConfig, ProviderError
from .providers.registry import text_providers, vision_providers

logger = logging.getLogger("brindi.ai")


class AIUnavailableError(RuntimeError):
    """No hay proveedores configurados o todos fallaron para la tarea pedida."""


@dataclass
class OcrResult:
    extraction: ReceiptExtraction
    provider: str
    tokens: int


class AIEngine:
    """Orquesta las cascadas de proveedores para OCR, trivia y planes."""

    def __init__(self, settings: Settings, http_client: Any | None = None) -> None:
        self._settings = settings
        self._vision = vision_providers(settings)
        self._text = text_providers(settings)
        self._http = http_client or httpx.Client(timeout=settings.provider_timeout_seconds)

    @property
    def has_vision(self) -> bool:
        return bool(self._vision)

    @property
    def has_text(self) -> bool:
        return bool(self._text)

    # --- OCR (cascada de visión) ---

    def extract_receipt(self, image_bytes: bytes, mime_type: str) -> OcrResult:
        if not self._vision:
            raise AIUnavailableError("sin proveedores de visión configurados")
        content = oc.build_image_content(OCR_PROMPT, image_bytes, mime_type)

        def parse(raw: str) -> ReceiptExtraction:
            return ReceiptExtraction.model_validate_json(raw)

        extraction, provider, tokens = self._run_cascade(
            self._vision, OCR_SYSTEM_INSTRUCTION, content, temperature=0.0, parse=parse
        )
        return OcrResult(extraction=extraction, provider=provider, tokens=tokens)

    # --- Trivia (cascada de texto; solo para "Otros") ---

    def generate_quiz(
        self, category: str, level: str, count: int, locale: str, topic: str | None = None
    ) -> tuple[list[QuizQuestion], str, int]:
        if not self._text:
            raise AIUnavailableError("sin proveedores de texto configurados")
        prompt = build_quiz_prompt(category, level, count, locale, topic)

        def parse(raw: str) -> list[QuizQuestion]:
            questions = clean_quiz_questions(QuizGeneration.model_validate_json(raw), count)
            if not questions:
                raise ValueError("sin preguntas válidas")
            return questions

        return self._run_cascade(
            self._text, QUIZ_SYSTEM_INSTRUCTION, prompt, temperature=0.7, parse=parse
        )

    # --- Plan (cascada de texto) ---

    def generate_plan(self, req: PlanRequestModel) -> tuple[str, list[PlanActivity], str, int]:
        if not self._text:
            raise AIUnavailableError("sin proveedores de texto configurados")
        prompt = build_plan_prompt(req)

        def parse(raw: str) -> tuple[str, list[PlanActivity]]:
            intro, activities = clean_plan(PlanGeneration.model_validate_json(raw))
            if not activities:
                raise ValueError("sin actividades válidas")
            return intro, activities

        intro_activities, provider, tokens = self._run_cascade(
            self._text, PLAN_SYSTEM_INSTRUCTION, prompt, temperature=0.8, parse=parse
        )
        intro, activities = intro_activities
        return intro, activities, provider, tokens

    # --- Núcleo de la cascada ---

    def _run_cascade(
        self,
        providers: list[ProviderConfig],
        system: str,
        user_content: str | list[dict[str, Any]],
        *,
        temperature: float,
        parse: Any,
    ) -> tuple[Any, str, int]:
        errors: list[str] = []
        for cfg in providers:
            try:
                raw, tokens = oc.complete_json(
                    self._http,
                    cfg,
                    system=system,
                    user_content=user_content,
                    temperature=temperature,
                )
                result = parse(raw)
                return result, cfg.name, tokens
            except (ProviderError, ValueError) as exc:
                logger.warning("proveedor falló", extra={"provider": cfg.name})
                errors.append(f"{cfg.name}: {exc}")
                continue
        raise AIUnavailableError("; ".join(errors) or "sin proveedores disponibles")
