"""Modelos Pydantic de entrada/salida y conversión de importes a céntimos."""

from decimal import ROUND_HALF_UP, Decimal

from pydantic import BaseModel, ConfigDict, Field


def to_cents(amount: float | int | str) -> int:
    """Convierte un importe a céntimos enteros con redondeo bancario estándar.

    Usa Decimal a partir de la representación en texto para evitar el ruido de
    la coma flotante (p. ej. 12.50 -> 1250, no 1249).
    """
    quantized = (Decimal(str(amount)) * 100).quantize(Decimal("1"), rounding=ROUND_HALF_UP)
    return int(quantized)


# --- Esquema que se le pide a Gemini (structured output) ---


class ReceiptItemRaw(BaseModel):
    """Una línea del ticket tal como la lee el modelo."""

    description: str = Field(description="Descripción corta del producto o cargo")
    amount: float = Field(description="Precio de la línea en la moneda del ticket (decimal con punto)")


class ReceiptExtraction(BaseModel):
    """Datos extraídos del ticket por el modelo."""

    items: list[ReceiptItemRaw] = Field(default_factory=list)
    total: float | None = Field(default=None, description="Total impreso en el ticket, si es visible")
    currency: str | None = Field(default=None, description="Código de moneda ISO, si es visible")


# --- Respuesta del endpoint /ocr-receipt ---


class ReceiptItem(BaseModel):
    description: str
    amount_cents: int


class OcrResponse(BaseModel):
    # Evita el espacio de nombres protegido "model_" de Pydantic v2.
    model_config = ConfigDict(protected_namespaces=())

    items: list[ReceiptItem]
    total_cents: int
    currency: str | None = None
    model_used: str


# --- Respuesta del endpoint /usage ---


class UsageByService(BaseModel):
    service: str
    total: int
    successes: int
    failures: int
    tokens: int


class UsageResponse(BaseModel):
    by_service: list[UsageByService]
