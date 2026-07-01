"""Autenticación de las llamadas internas mediante un secreto compartido."""

import hmac

from fastapi import Header, HTTPException, status

from .config import get_settings


async def require_internal_key(x_internal_key: str = Header(default="")) -> None:
    """Exige la cabecera X-Internal-Key. Solo la API de NestJS conoce el secreto."""
    expected = get_settings().internal_api_key
    # Comparación en tiempo constante; si no hay secreto configurado, se rechaza todo.
    if not expected or not hmac.compare_digest(x_internal_key, expected):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Clave interna inválida")
