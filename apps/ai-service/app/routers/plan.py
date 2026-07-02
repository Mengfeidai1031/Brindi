"""Endpoint interno de generación de planes con IA (sin fallback: requiere Gemini)."""

import logging

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.concurrency import run_in_threadpool

from ..db import Database
from ..dependencies import get_db, get_gemini
from ..gemini import GeminiClient, GeminiUnavailableError
from ..models import PlanRequest, PlanResponse
from ..security import require_internal_key

logger = logging.getLogger("brindi.ai.plan")

router = APIRouter(tags=["plan"], dependencies=[Depends(require_internal_key)])


@router.post("/generate-plan", response_model=PlanResponse)
async def generate_plan(
    req: PlanRequest,
    db: Database = Depends(get_db),
    gemini: GeminiClient = Depends(get_gemini),
) -> PlanResponse:
    # Un plan personalizado no se puede pre-cocinar: si no hay IA, no hay plan.
    try:
        intro, activities, model = await run_in_threadpool(gemini.generate_plan, req)
    except GeminiUnavailableError as exc:
        await db.log_usage("GENERATE_PLAN", "unavailable", 0, False)
        logger.warning("plan no disponible: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="El generador de planes no está disponible",
        ) from exc

    await db.log_usage("GENERATE_PLAN", model, 0, True)
    logger.info("plan generado", extra={"service": "GENERATE_PLAN", "model": model})
    return PlanResponse(intro=intro, activities=activities, source="ai", model_used=model)
