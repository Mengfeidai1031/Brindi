"""Cliente mínimo para APIs de chat OpenAI-compatible (Gemini, Groq, Mistral, Together).

Una sola función `complete_json` sirve para texto y para visión: el contenido del
mensaje de usuario puede ser una cadena o una lista de partes (texto + imagen).
El cliente httpx se inyecta para poder testear sin red.
"""

from __future__ import annotations

import logging
from typing import Any

import httpx

from .base import ProviderConfig, ProviderError, RateLimitError

logger = logging.getLogger("brindi.ai.provider")


def build_image_content(prompt: str, image_bytes: bytes, mime_type: str) -> list[dict[str, Any]]:
    """Construye el contenido multimodal (texto + imagen en data URL base64)."""
    import base64

    b64 = base64.b64encode(image_bytes).decode("ascii")
    return [
        {"type": "text", "text": prompt},
        {"type": "image_url", "image_url": {"url": f"data:{mime_type};base64,{b64}"}},
    ]


def complete_json(
    http: httpx.Client,
    cfg: ProviderConfig,
    *,
    system: str,
    user_content: str | list[dict[str, Any]],
    temperature: float,
    max_tokens: int = 2048,
) -> tuple[str, int]:
    """Llama al endpoint /chat/completions pidiendo JSON. Devuelve (contenido, tokens).

    Lanza RateLimitError ante 429 y ProviderError ante cualquier otro fallo, para que
    la cascada pruebe el siguiente proveedor.
    """
    url = cfg.base_url.rstrip("/") + "/chat/completions"
    payload: dict[str, Any] = {
        "model": cfg.model,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user_content},
        ],
        "temperature": temperature,
        "max_tokens": max_tokens,
        "response_format": {"type": "json_object"},
    }
    headers = {
        "Authorization": f"Bearer {cfg.api_key}",
        "Content-Type": "application/json",
    }

    try:
        resp = http.post(url, json=payload, headers=headers)
    except httpx.HTTPError as exc:
        raise ProviderError(f"{cfg.name}: error de red ({exc})") from exc

    if resp.status_code == 429:
        raise RateLimitError(f"{cfg.name}: 429 (límite de uso)")
    if resp.status_code >= 400:
        raise ProviderError(f"{cfg.name}: HTTP {resp.status_code}")

    try:
        data = resp.json()
        content = data["choices"][0]["message"]["content"]
    except (ValueError, KeyError, IndexError, TypeError) as exc:
        raise ProviderError(f"{cfg.name}: respuesta inesperada ({exc})") from exc

    if not content or not str(content).strip():
        raise ProviderError(f"{cfg.name}: respuesta vacía")

    usage = data.get("usage") or {}
    tokens = int(usage.get("total_tokens", 0) or 0)
    return str(content), tokens
