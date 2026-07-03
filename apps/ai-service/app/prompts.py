"""Instrucciones de sistema y constructores de prompt para OCR, trivia y planes."""

from __future__ import annotations

from .models import PlanRequest as PlanRequestModel

# --- OCR de tickets ---

OCR_SYSTEM_INSTRUCTION = (
    "Eres un lector de tickets preciso para una app de división de cuentas. "
    "Extrae únicamente lo que puedas leer en la imagen; nunca inventes productos "
    "ni importes. Responde estrictamente con un objeto JSON con esta forma: "
    '{"items":[{"description":string,"amount":number}],"total":number|null,'
    '"currency":string|null}.'
)

OCR_PROMPT = (
    "Extrae las líneas de este ticket. Para cada producto incluye una descripción "
    "corta y su precio como número (usa punto como separador decimal). Incluye "
    "cargos como servicio o impuestos como líneas si aparecen, pero excluye "
    "subtotal, total, propinas sugeridas, cambio y líneas de método de pago. "
    "Indica además el total impreso (total) y el código de moneda ISO (currency) "
    "si son visibles. Devuelve solo el objeto JSON."
)

# --- Trivia ---

QUIZ_SYSTEM_INSTRUCTION = (
    "Eres un generador de trivia preciso y factual. Responde solo con un objeto JSON "
    'con la forma {"questions":[{"question":string,"options":[string,string,string,'
    'string],"correct_index":0,"explanation":string}]}. Cada pregunta debe tener '
    "exactamente cuatro opciones y una única respuesta correcta verdadera."
)

CATEGORY_LABELS: dict[str, dict[str, str]] = {
    "FUTBOL": {"es": "fútbol", "en": "football (soccer)"},
    "PELICULAS_SERIES": {"es": "películas y series", "en": "movies and TV series"},
    "MUSICA": {"es": "música", "en": "music"},
    "GEOGRAFIA": {"es": "geografía", "en": "geography"},
    "HISTORIA": {"es": "historia", "en": "history"},
    "CIENCIA": {"es": "ciencia", "en": "science"},
    "RANDOM": {"es": "cultura general variada", "en": "mixed general knowledge"},
    "OTROS": {"es": "el tema indicado", "en": "the given topic"},
}
LEVEL_LABELS: dict[str, dict[str, str]] = {
    "FACIL": {"es": "fácil", "en": "easy"},
    "MEDIO": {"es": "media", "en": "medium"},
    "DIFICIL": {"es": "difícil", "en": "hard"},
    "IMPOSIBLE": {"es": "casi imposible", "en": "nearly impossible"},
}
LANGUAGE = {"es": "español", "en": "English"}


def build_quiz_prompt(
    category: str, level: str, count: int, locale: str, topic: str | None = None
) -> str:
    """Prompt de trivia. Si category == OTROS, usa el tema libre indicado."""
    if category == "OTROS" and topic and topic.strip():
        subject = topic.strip()
    else:
        subject = CATEGORY_LABELS.get(category, {}).get(locale, category)
    lvl = LEVEL_LABELS.get(level, {}).get(locale, level)
    lang = LANGUAGE.get(locale, "español")
    return (
        f"Genera {count} preguntas de trivia tipo test sobre {subject}, dificultad {lvl}. "
        f"Escribe las preguntas, las opciones y las explicaciones en {lang}. "
        "Cada pregunta debe tener exactamente 4 opciones, una sola correcta "
        "(indica su índice 0-3 en correct_index) y una explicación breve. "
        "No repitas preguntas ni opciones. Devuelve solo el objeto JSON."
    )


# --- Planes ---

PLAN_SYSTEM_INSTRUCTION = (
    "Eres un guía local que propone planes reales y concretos. Sugiere sitios y "
    "actividades que existan de verdad en la zona indicada, ajustados al grupo, "
    "presupuesto y tiempo disponibles. Responde solo con un objeto JSON con la forma "
    '{"intro":string,"activities":[{"title":string,"place_name":string,'
    '"description":string,"duration_label":string,"cost_label":string,'
    '"map_query":string}]}.'
)

PLAN_CATEGORY_LABELS: dict[str, dict[str, str]] = {
    "COMIDA": {"es": "comer", "en": "eating out"},
    "COPAS": {"es": "tomar algo", "en": "drinks"},
    "CULTURA": {"es": "cultura y turismo", "en": "culture and sightseeing"},
    "AIRE_LIBRE": {"es": "aire libre", "en": "outdoors"},
    "FIESTA": {"es": "fiesta y vida nocturna", "en": "party and nightlife"},
    "TRANQUILO": {"es": "plan tranquilo", "en": "a relaxed plan"},
    "SORPRESA": {"es": "sorpréndeme", "en": "surprise me"},
}
PLAN_BUDGET_LABELS: dict[str, dict[str, str]] = {
    "BAJO": {"es": "económico", "en": "budget-friendly"},
    "MEDIO": {"es": "moderado", "en": "moderate"},
    "ALTO": {"es": "sin límite ajustado", "en": "premium"},
}
PLAN_DURATION_LABELS: dict[str, dict[str, str]] = {
    "UN_RATO": {"es": "un par de horas", "en": "a couple of hours"},
    "MEDIA_JORNADA": {"es": "media jornada", "en": "half a day"},
    "DIA_COMPLETO": {"es": "todo el día", "en": "a full day"},
    "NOCHE": {"es": "una salida nocturna", "en": "a night out"},
}


def build_plan_prompt(req: PlanRequestModel) -> str:
    locale = req.locale
    lang = LANGUAGE.get(locale, "español")
    if req.location_text and req.location_text.strip():
        location = req.location_text.strip()
    else:
        location = f"las coordenadas {req.lat}, {req.lng}"
    cat = PLAN_CATEGORY_LABELS.get(req.category, {}).get(locale, req.category)
    budget = PLAN_BUDGET_LABELS.get(req.budget, {}).get(locale, req.budget)
    duration = PLAN_DURATION_LABELS.get(req.duration, {}).get(locale, req.duration)
    return (
        f"Crea un plan para {req.party_size} personas en {location}. "
        f"Tipo de plan: {cat}. Presupuesto: {budget}. Tiempo disponible: {duration}. "
        "Devuelve una introducción breve y motivadora (intro) y entre 1 y 3 actividades "
        "reales y concretas en esa zona. Para cada actividad incluye: un título (title), "
        "el nombre del sitio concreto (place_name), qué hacer en 2-3 frases (description), "
        "la duración aproximada (duration_label), el coste aproximado por persona "
        "(cost_label) y un texto de búsqueda para Google Maps con el sitio y la ciudad "
        f"(map_query). Escribe todos los textos en {lang}. Devuelve solo el objeto JSON."
    )
