"""Endpoint de salud (público, sin clave): para healthchecks del contenedor."""

import logging

from fastapi import APIRouter, Depends

from ..ai import AIEngine
from ..config import get_settings
from ..db import Database
from ..dependencies import get_ai, get_db

logger = logging.getLogger("brindi.ai.health")

router = APIRouter(tags=["health"])


@router.get("/health")
async def health(db: Database = Depends(get_db), ai: AIEngine = Depends(get_ai)) -> dict:
    db_up = False
    try:
        db_up = await db.ping()
    except Exception:  # noqa: BLE001 - reflejamos el estado, no propagamos
        db_up = False
    return {
        "status": "ok",
        "service": f"{get_settings().app_name.lower()}-ai",
        "db": "up" if db_up else "down",
        # Disponibilidad de IA (sin exponer claves): visión para OCR, texto para plan/trivia.
        "ai": {
            "vision": "ready" if ai.has_vision else "unavailable",
            "text": "ready" if ai.has_text else "unavailable",
        },
    }
