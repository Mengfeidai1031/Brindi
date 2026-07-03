"""Endpoint interno de generación de planes con IA.

Cascada de texto: Groq -> Mistral -> Together. Un plan no se puede pre-cocinar:
si no hay ningún proveedor disponible, responde 503.
"""

import logging

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.concurrency import run_in_threadpool

from ..ai import AIEngine, AIUnavailableError
from ..db import Database
from ..dependencies import get_ai, get_db
from ..models import PlanRequest, PlanResponse
from ..security import require_internal_key

logger = logging.getLogger("brindi.ai.plan")

router = APIRouter(tags=["plan"], dependencies=[Depends(require_internal_key)])


@router.post("/generate-plan", response_model=PlanResponse)
async def generate_plan(
    req: PlanRequest,
    db: Database = Depends(get_db),
    ai: AIEngine = Depends(get_ai),
) -> PlanResponse:
    try:
        intro, activities, provider, tokens = await run_in_threadpool(ai.generate_plan, req)
    except AIUnavailableError as exc:
        await db.log_usage("GENERATE_PLAN", "unavailable", 0, False)
        logger.warning("plan no disponible: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="El generador de planes no está disponible",
        ) from exc

    await db.log_usage("GENERATE_PLAN", provider, tokens, True)
    logger.info("plan generado", extra={"service": "GENERATE_PLAN", "provider": provider})
    return PlanResponse(intro=intro, activities=activities, source="ai", model_used=provider)
