"""Endpoint interno de OCR de tickets: imagen -> ítems estructurados vía cascada Gemini."""

import logging

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.concurrency import run_in_threadpool

from ..config import get_settings
from ..db import Database
from ..dependencies import get_db, get_gemini
from ..gemini import GeminiClient, GeminiUnavailableError
from ..models import OcrResponse, ReceiptItem, to_cents
from ..security import require_internal_key

logger = logging.getLogger("brindi.ai.ocr")

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"}

router = APIRouter(tags=["ocr"], dependencies=[Depends(require_internal_key)])


@router.post("/ocr-receipt", response_model=OcrResponse)
async def ocr_receipt(
    file: UploadFile = File(...),
    db: Database = Depends(get_db),
    gemini: GeminiClient = Depends(get_gemini),
) -> OcrResponse:
    mime = (file.content_type or "").lower()
    if mime not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Tipo de imagen no soportado",
        )

    data = await file.read()
    if len(data) == 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Imagen vacía")
    if len(data) > get_settings().max_image_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Imagen demasiado grande",
        )

    # La llamada al SDK es bloqueante: se ejecuta en un threadpool.
    try:
        result = await run_in_threadpool(gemini.extract_receipt, data, mime)
    except GeminiUnavailableError as exc:
        await db.log_usage("OCR_RECEIPT", "none", 0, False)
        logger.warning("OCR no disponible", extra={"service": "OCR_RECEIPT"})
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="No se pudo procesar el ticket",
        ) from exc

    items = [
        ReceiptItem(description=it.description.strip(), amount_cents=to_cents(it.amount))
        for it in result.extraction.items
    ]
    total_cents = (
        to_cents(result.extraction.total)
        if result.extraction.total is not None
        else sum(it.amount_cents for it in items)
    )

    await db.log_usage("OCR_RECEIPT", result.model, result.tokens, True)
    logger.info("OCR completado", extra={"service": "OCR_RECEIPT", "model": result.model})

    return OcrResponse(
        items=items,
        total_cents=total_cents,
        currency=result.extraction.currency,
        model_used=result.model,
    )
