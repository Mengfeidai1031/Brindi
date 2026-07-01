"""Endpoint de salud (público, sin clave): para healthchecks del contenedor."""

import logging

from fastapi import APIRouter, Depends

from ..config import get_settings
from ..db import Database
from ..dependencies import get_db, get_gemini
from ..gemini import GeminiClient

logger = logging.getLogger("brindi.ai.health")

router = APIRouter(tags=["health"])


@router.get("/health")
async def health(db: Database = Depends(get_db), gemini: GeminiClient = Depends(get_gemini)) -> dict:
    db_up = False
    try:
        db_up = await db.ping()
    except Exception:  # noqa: BLE001 - reflejamos el estado, no propagamos
        db_up = False
    return {
        "status": "ok",
        "service": f"{get_settings().app_name.lower()}-ai",
        "db": "up" if db_up else "down",
        # Indica si hay clave de Gemini, sin exponerla.
        "gemini": "configured" if gemini.configured else "missing",
    }
