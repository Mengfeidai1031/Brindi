"""Endpoint interno de consumo de IA (lectura de la tabla ai_usage)."""

from fastapi import APIRouter, Depends

from ..db import Database
from ..dependencies import get_db
from ..models import UsageResponse
from ..security import require_internal_key

router = APIRouter(tags=["usage"], dependencies=[Depends(require_internal_key)])


@router.get("/usage", response_model=UsageResponse)
async def usage(db: Database = Depends(get_db)) -> UsageResponse:
    return await db.usage_summary()
