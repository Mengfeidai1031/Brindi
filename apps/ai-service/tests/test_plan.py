"""Validación y cascada de generación de planes (sin red)."""

import pytest

from app.config import Settings
from app.gemini import GeminiClient, GeminiUnavailableError, build_plan_prompt
from app.models import PlanGeneration, PlanRequest, clean_plan
from tests.conftest import fake_gemini_response

VALID_PLAN = (
    '{"intro":"Una tarde estupenda por la ciudad.","activities":[{"title":"Café con vistas",'
    '"place_name":"Café Central","description":"Tomad algo tranquilo.","duration_label":"1 h",'
    '"cost_label":"5 € pp","map_query":"Café Central Las Palmas"}]}'
)


def make_settings() -> Settings:
    return Settings(
        database_url="",
        gemini_api_key="fake-key",
        internal_api_key="x",
        plan_models=["m1", "m2", "m3"],
    )


def make_request(**overrides) -> PlanRequest:
    base = dict(location_text="Las Palmas", party_size=4, category="COPAS", budget="BAJO", duration="NOCHE")
    base.update(overrides)
    return PlanRequest(**base)


# --- clean_plan ---


def test_clean_keeps_valid_activity():
    gen = PlanGeneration.model_validate_json(VALID_PLAN)
    intro, activities = clean_plan(gen)
    assert intro.startswith("Una tarde")
    assert len(activities) == 1
    assert activities[0].place_name == "Café Central"
    assert activities[0].map_query == "Café Central Las Palmas"


def test_clean_drops_activity_without_title():
    gen = PlanGeneration.model_validate({"intro": "x", "activities": [{"title": "  "}]})
    _, activities = clean_plan(gen)
    assert activities == []


def test_clean_falls_back_place_and_map_query():
    gen = PlanGeneration.model_validate({"intro": "x", "activities": [{"title": "Paseo"}]})
    _, activities = clean_plan(gen)
    assert activities[0].place_name == "Paseo"  # cae al título
    assert activities[0].map_query == "Paseo"  # cae al sitio


def test_clean_caps_at_three():
    act = {"title": "A", "place_name": "P"}
    gen = PlanGeneration.model_validate({"intro": "x", "activities": [act, act, act, act, act]})
    _, activities = clean_plan(gen)
    assert len(activities) == 3


def test_plan_prompt_uses_city_and_language():
    prompt = build_plan_prompt(make_request(locale="en", location_text="Madrid"))
    assert "Madrid" in prompt
    assert "English" in prompt


def test_plan_prompt_uses_coordinates_when_no_city():
    prompt = build_plan_prompt(make_request(location_text=None, lat=28.1, lng=-15.4))
    assert "28.1" in prompt and "-15.4" in prompt


# --- cascada ---


class FakeModels:
    def __init__(self, behavior: dict):
        self.behavior = behavior
        self.calls: list[str] = []

    def generate_content(self, model, contents, config):
        self.calls.append(model)
        outcome = self.behavior[model]
        if isinstance(outcome, Exception):
            raise outcome
        return outcome


class FakeClient:
    def __init__(self, behavior: dict):
        self.models = FakeModels(behavior)


def test_plan_first_model_succeeds():
    fake = FakeClient({"m1": fake_gemini_response(VALID_PLAN)})
    gc = GeminiClient(make_settings(), client=fake)
    intro, activities, model = gc.generate_plan(make_request())
    assert model == "m1"
    assert len(activities) == 1
    assert fake.models.calls == ["m1"]


def test_plan_empty_activities_advance_cascade():
    empty = '{"intro":"x","activities":[]}'
    fake = FakeClient({"m1": fake_gemini_response(empty), "m2": fake_gemini_response(VALID_PLAN)})
    gc = GeminiClient(make_settings(), client=fake)
    _, activities, model = gc.generate_plan(make_request())
    assert model == "m2"
    assert len(activities) == 1


def test_plan_all_fail_raises():
    fake = FakeClient({"m1": RuntimeError("a"), "m2": RuntimeError("b"), "m3": RuntimeError("c")})
    gc = GeminiClient(make_settings(), client=fake)
    with pytest.raises(GeminiUnavailableError):
        gc.generate_plan(make_request())
    assert fake.models.calls == ["m1", "m2", "m3"]


def test_plan_not_configured_raises():
    gc = GeminiClient(Settings(database_url="", gemini_api_key="", internal_api_key="x"))
    with pytest.raises(GeminiUnavailableError):
        gc.generate_plan(make_request())
