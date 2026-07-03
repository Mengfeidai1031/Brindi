"""Tipos base de los proveedores de IA."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class ProviderConfig:
    """Configuración de un proveedor concreto (una entrada de la cascada)."""

    name: str  # identificador para logs/uso, p. ej. "gemini#1", "groq", "mistral"
    base_url: str  # raíz OpenAI-compatible, terminada o no en "/"
    api_key: str
    model: str
    supports_vision: bool = False


class ProviderError(RuntimeError):
    """Fallo recuperable de un proveedor: se intenta el siguiente de la cascada."""


class RateLimitError(ProviderError):
    """El proveedor respondió 429 (cuota/límite). Se rota al siguiente."""


class AllProvidersFailedError(RuntimeError):
    """Ningún proveedor de la cascada pudo completar la petición."""
