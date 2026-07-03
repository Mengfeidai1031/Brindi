"""Planes: prompt, limpieza y cascada de texto del motor."""

import pytest

from app.ai import AIEngine, AIUnavailableError
from app.models import PlanGeneration, PlanRequest, clean_plan
from app.prompts import build_plan_prompt
from tests.conftest import FakeHTTP, FakeResponse, chat_ok, make_settings

VALID_PLAN = (
    '{"intro":"Una tarde estupenda.","activities":[{"title":"Café con vistas",'
    '"place_name":"Café Central","description":"Tomad algo.","duration_label":"1 h",'
    '"cost_label":"5 € pp","map_query":"Café Central Las Palmas"}]}'
)


def _req(**over) -> PlanRequest:
    base = dict(
        location_text="Las Palmas", party_size=4, category="COPAS", budget="BAJO",
        duration="NOCHE", locale="es",
    )
    base.update(over)
    return PlanRequest(**base)


def test_prompt_includes_location_and_prefs():
    prompt = build_plan_prompt(_req())
    assert "Las Palmas" in prompt
    assert "4 personas" in prompt


def test_clean_plan_parses_activities():
    intro, activities = clean_plan(PlanGeneration.model_validate_json(VALID_PLAN))
    assert intro.startswith("Una tarde")
    assert len(activities) == 1
    assert activities[0].map_query == "Café Central Las Palmas"


def test_generate_plan_first_provider_ok():
    engine = AIEngine(make_settings(groq_api_key="g"), http_client=FakeHTTP([chat_ok(VALID_PLAN)]))
    intro, activities, provider, _ = engine.generate_plan(_req())
    assert provider == "groq"
    assert len(activities) == 1


def test_generate_plan_skips_empty_activities():
    empty = '{"intro":"x","activities":[]}'
    http = FakeHTTP([chat_ok(empty), chat_ok(VALID_PLAN)])
    engine = AIEngine(make_settings(groq_api_key="g", mistral_api_key="m"), http_client=http)
    _, _, provider, _ = engine.generate_plan(_req())
    assert provider == "mistral"


def test_generate_plan_all_fail_raises():
    http = FakeHTTP([FakeResponse(500)])
    engine = AIEngine(make_settings(groq_api_key="g"), http_client=http)
    with pytest.raises(AIUnavailableError):
        engine.generate_plan(_req())
