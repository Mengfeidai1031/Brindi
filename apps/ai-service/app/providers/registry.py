"""Construye las cascadas de proveedores por tarea a partir de la configuración."""

from __future__ import annotations

from ..config import Settings
from .base import ProviderConfig


def gemini_keys(settings: Settings) -> list[str]:
    """Pool de claves de Gemini: las de `gemini_api_keys` (coma) + la suelta de compat."""
    keys = [k.strip() for k in (settings.gemini_api_keys or "").split(",") if k.strip()]
    if settings.gemini_api_key and settings.gemini_api_key not in keys:
        keys.append(settings.gemini_api_key)
    return keys


def vision_providers(settings: Settings) -> list[ProviderConfig]:
    """OCR: pool de Gemini (rotación) y, opcionalmente, Groq Vision de respaldo."""
    providers: list[ProviderConfig] = []
    for i, key in enumerate(gemini_keys(settings), start=1):
        providers.append(
            ProviderConfig(
                name=f"gemini#{i}",
                base_url=settings.gemini_base_url,
                api_key=key,
                model=settings.gemini_vision_model,
                supports_vision=True,
            )
        )
    if settings.ocr_use_groq_fallback and settings.groq_api_key:
        providers.append(
            ProviderConfig(
                name="groq-vision",
                base_url=settings.groq_base_url,
                api_key=settings.groq_api_key,
                model=settings.groq_vision_model,
                supports_vision=True,
            )
        )
    return providers


def text_providers(settings: Settings) -> list[ProviderConfig]:
    """Plan y trivia "Otros": Groq -> Gemini -> Mistral -> Together (los configurados)."""
    providers: list[ProviderConfig] = []
    if settings.groq_api_key:
        providers.append(
            ProviderConfig("groq", settings.groq_base_url, settings.groq_api_key, settings.groq_text_model)
        )
    for i, key in enumerate(gemini_keys(settings), start=1):
        providers.append(
            ProviderConfig(
                name=f"gemini-text#{i}",
                base_url=settings.gemini_base_url,
                api_key=key,
                model=settings.gemini_text_model,
            )
        )
    if settings.mistral_api_key:
        providers.append(
            ProviderConfig(
                "mistral", settings.mistral_base_url, settings.mistral_api_key, settings.mistral_text_model
            )
        )
    if settings.together_api_key:
        providers.append(
            ProviderConfig(
                "together", settings.together_base_url, settings.together_api_key, settings.together_text_model
            )
        )
    return providers
