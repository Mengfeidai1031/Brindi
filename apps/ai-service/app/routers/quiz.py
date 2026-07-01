"""Endpoint interno de generación de quiz: IA (cascada Gemini) con fallback al banco local."""

import logging

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.concurrency import run_in_threadpool

from ..db import Database
from ..dependencies import get_db, get_gemini
from ..gemini import GeminiClient, GeminiUnavailableError
from ..models import QuizRequest, QuizResponse
from ..security import require_internal_key

logger = logging.getLogger("brindi.ai.quiz")

router = APIRouter(tags=["quiz"], dependencies=[Depends(require_internal_key)])


@router.post("/generate-quiz", response_model=QuizResponse)
async def generate_quiz(
    req: QuizRequest,
    db: Database = Depends(get_db),
    gemini: GeminiClient = Depends(get_gemini),
) -> QuizResponse:
    # 1) Intento con IA (cascada de modelos). La generación es bloqueante -> threadpool.
    try:
        questions, model = await run_in_threadpool(
            gemini.generate_quiz, req.category, req.level, req.count, req.locale
        )
        await db.log_usage("GENERATE_QUIZ", model, 0, True)
        logger.info("quiz generado por IA", extra={"service": "GENERATE_QUIZ", "model": model})
        return QuizResponse(questions=questions, source="ai", model_used=model)
    except GeminiUnavailableError:
        pass  # se cae al banco local

    # 2) Fallback al banco local. Si no hay para el idioma pedido, se usa el español.
    questions = await db.fetch_fallback_questions(req.category, req.locale, req.count)
    if not questions and req.locale != "es":
        questions = await db.fetch_fallback_questions(req.category, "es", req.count)

    await db.log_usage("GENERATE_QUIZ", "fallback", 0, bool(questions))
    if not questions:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="No se pudieron generar preguntas",
        )
    logger.info("quiz servido desde banco local", extra={"service": "GENERATE_QUIZ"})
    return QuizResponse(questions=questions, source="fallback", model_used=None)
