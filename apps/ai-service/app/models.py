"""Modelos Pydantic de entrada/salida y conversión de importes a céntimos."""

from decimal import ROUND_HALF_UP, Decimal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


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


# --- Quiz (trivia) ---

QUIZ_CATEGORIES = {
    "FUTBOL",
    "PELICULAS_SERIES",
    "MUSICA",
    "GEOGRAFIA",
    "HISTORIA",
    "CIENCIA",
    "RANDOM",
}
QUIZ_LEVELS = {"FACIL", "MEDIO", "DIFICIL", "IMPOSIBLE"}
QUIZ_LOCALES = {"es", "en"}


class QuizQuestionRaw(BaseModel):
    """Pregunta tal como la genera el modelo (esquema de salida estructurada)."""

    question: str
    options: list[str]
    correct_index: int
    explanation: str = ""


class QuizGeneration(BaseModel):
    questions: list[QuizQuestionRaw] = Field(default_factory=list)


class QuizQuestion(BaseModel):
    question: str
    options: list[str]
    correct_index: int
    explanation: str


class QuizRequest(BaseModel):
    category: str
    level: str
    count: int = Field(ge=3, le=20)
    locale: str = "es"

    @field_validator("category")
    @classmethod
    def _validate_category(cls, value: str) -> str:
        if value not in QUIZ_CATEGORIES:
            raise ValueError("categoría no válida")
        return value

    @field_validator("level")
    @classmethod
    def _validate_level(cls, value: str) -> str:
        if value not in QUIZ_LEVELS:
            raise ValueError("nivel no válido")
        return value

    @field_validator("locale")
    @classmethod
    def _validate_locale(cls, value: str) -> str:
        return value if value in QUIZ_LOCALES else "es"


class QuizResponse(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

    questions: list[QuizQuestion]
    # "ai" si las generó Gemini; "fallback" si vienen del banco local.
    source: str
    model_used: str | None = None


def clean_quiz_questions(generation: QuizGeneration, limit: int) -> list[QuizQuestion]:
    """Filtra a preguntas válidas (4 opciones, índice correcto en rango) y recorta a `limit`."""
    out: list[QuizQuestion] = []
    for q in generation.questions:
        if len(q.options) != 4:
            continue
        if not (0 <= q.correct_index < 4):
            continue
        if not q.question.strip():
            continue
        out.append(
            QuizQuestion(
                question=q.question.strip(),
                options=[o.strip() for o in q.options],
                correct_index=q.correct_index,
                explanation=q.explanation.strip(),
            )
        )
        if len(out) >= limit:
            break
    return out


# --- Plan (planificador de actividades) ---

PLAN_CATEGORIES = {
    "COMIDA",
    "COPAS",
    "CULTURA",
    "AIRE_LIBRE",
    "FIESTA",
    "TRANQUILO",
    "SORPRESA",
}
PLAN_BUDGETS = {"BAJO", "MEDIO", "ALTO"}
PLAN_DURATIONS = {"UN_RATO", "MEDIA_JORNADA", "DIA_COMPLETO", "NOCHE"}
PLAN_LOCALES = {"es", "en"}


class PlanActivityRaw(BaseModel):
    """Actividad tal como la genera el modelo (esquema de salida estructurada)."""

    title: str
    place_name: str = ""
    description: str = ""
    duration_label: str = ""
    cost_label: str = ""
    map_query: str = ""


class PlanGeneration(BaseModel):
    intro: str = ""
    activities: list[PlanActivityRaw] = Field(default_factory=list)


class PlanActivity(BaseModel):
    title: str
    place_name: str
    description: str
    duration_label: str
    cost_label: str
    # Texto de búsqueda para el deep link de "Cómo llegar" (Google Maps).
    map_query: str


class PlanRequest(BaseModel):
    location_text: str | None = None
    lat: float | None = None
    lng: float | None = None
    party_size: int = Field(ge=1, le=50)
    category: str
    budget: str
    duration: str
    locale: str = "es"

    @field_validator("category")
    @classmethod
    def _validate_category(cls, value: str) -> str:
        if value not in PLAN_CATEGORIES:
            raise ValueError("categoría no válida")
        return value

    @field_validator("budget")
    @classmethod
    def _validate_budget(cls, value: str) -> str:
        if value not in PLAN_BUDGETS:
            raise ValueError("presupuesto no válido")
        return value

    @field_validator("duration")
    @classmethod
    def _validate_duration(cls, value: str) -> str:
        if value not in PLAN_DURATIONS:
            raise ValueError("duración no válida")
        return value

    @field_validator("locale")
    @classmethod
    def _validate_locale(cls, value: str) -> str:
        return value if value in PLAN_LOCALES else "es"

    @model_validator(mode="after")
    def _require_location(self) -> "PlanRequest":
        has_text = bool(self.location_text and self.location_text.strip())
        has_coords = self.lat is not None and self.lng is not None
        if not has_text and not has_coords:
            raise ValueError("se requiere una ciudad o coordenadas")
        return self


class PlanResponse(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

    intro: str
    activities: list[PlanActivity]
    source: str  # "ai"
    model_used: str | None = None


def clean_plan(generation: PlanGeneration, max_activities: int = 3) -> tuple[str, list[PlanActivity]]:
    """Filtra actividades válidas (con título) y recorta a `max_activities`."""
    activities: list[PlanActivity] = []
    for a in generation.activities:
        if not a.title.strip():
            continue
        place = a.place_name.strip() or a.title.strip()
        activities.append(
            PlanActivity(
                title=a.title.strip(),
                place_name=place,
                description=a.description.strip(),
                duration_label=a.duration_label.strip(),
                cost_label=a.cost_label.strip(),
                map_query=a.map_query.strip() or place,
            )
        )
        if len(activities) >= max_activities:
            break
    return generation.intro.strip(), activities
