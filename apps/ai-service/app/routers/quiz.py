"""Endpoint interno de generación de trivia.

Enrutado:
- Categorías predefinidas (fútbol, cine, etc.) -> banco local, sin IA (gratis e infinito).
- "Otros" (tema libre) -> cascada de IA (Groq -> Mistral -> Together) con respaldo al
  banco "Variado" si todos los proveedores fallan.
"""

import logging

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.concurrency import run_in_threadpool

from ..ai import AIEngine, AIUnavailableError
from ..db import Database
from ..dependencies import get_ai, get_db
from ..models import QUIZ_LOCAL_CATEGORIES, QuizRequest, QuizResponse
from ..security import require_internal_key

logger = logging.getLogger("brindi.ai.quiz")

router = APIRouter(tags=["quiz"], dependencies=[Depends(require_internal_key)])


async def _from_bank(db: Database, category: str, locale: str, count: int) -> list:
    """Lee del banco local, cayendo al español si no hay para el idioma pedido."""
    questions = await db.fetch_fallback_questions(category, locale, count)
    if not questions and locale != "es":
        questions = await db.fetch_fallback_questions(category, "es", count)
    return questions


@router.post("/generate-quiz", response_model=QuizResponse)
async def generate_quiz(
    req: QuizRequest,
    db: Database = Depends(get_db),
    ai: AIEngine = Depends(get_ai),
) -> QuizResponse:
    # 1) Categorías predefinidas: banco local (sin IA).
    if req.category in QUIZ_LOCAL_CATEGORIES:
        questions = await _from_bank(db, req.category, req.locale, req.count)
        await db.log_usage("GENERATE_QUIZ", "local", 0, bool(questions))
        if not questions:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="No se pudieron generar preguntas",
            )
        logger.info("trivia servida del banco local", extra={"service": "GENERATE_QUIZ"})
        return QuizResponse(questions=questions, source="local", model_used=None)

    # 2) "Otros" (tema libre): cascada de IA.
    try:
        questions, provider, tokens = await run_in_threadpool(
            ai.generate_quiz, req.category, req.level, req.count, req.locale, req.topic
        )
        await db.log_usage("GENERATE_QUIZ", provider, tokens, True)
        logger.info("trivia generada por IA", extra={"service": "GENERATE_QUIZ", "provider": provider})
        return QuizResponse(questions=questions, source="ai", model_used=provider)
    except AIUnavailableError:
        pass  # respaldo al banco "Variado"

    # 3) Respaldo: banco "Variado" (RANDOM).
    questions = await _from_bank(db, "RANDOM", req.locale, req.count)
    await db.log_usage("GENERATE_QUIZ", "fallback", 0, bool(questions))
    if not questions:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="No se pudieron generar preguntas",
        )
    logger.info("trivia 'Otros' servida del banco de respaldo", extra={"service": "GENERATE_QUIZ"})
    return QuizResponse(questions=questions, source="fallback", model_used=None)
