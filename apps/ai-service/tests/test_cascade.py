"""Cascada de modelos: se prueba el siguiente cuando uno falla."""

import pytest

from app.config import Settings
from app.gemini import GeminiClient, GeminiUnavailableError
from tests.conftest import fake_gemini_response

VALID = '{"items":[{"description":"Café","amount":1.5}],"total":1.5,"currency":"EUR"}'


def make_settings() -> Settings:
    return Settings(
        database_url="",
        gemini_api_key="fake-key",
        internal_api_key="x",
        ocr_models=["m1", "m2", "m3"],
    )


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


def test_first_model_succeeds():
    fake = FakeClient({"m1": fake_gemini_response(VALID, tokens=10)})
    gc = GeminiClient(make_settings(), client=fake)
    result = gc.extract_receipt(b"img", "image/jpeg")
    assert result.model == "m1"
    assert result.tokens == 10
    assert fake.models.calls == ["m1"]


def test_falls_through_to_second():
    fake = FakeClient({"m1": RuntimeError("503"), "m2": fake_gemini_response(VALID)})
    gc = GeminiClient(make_settings(), client=fake)
    result = gc.extract_receipt(b"img", "image/jpeg")
    assert result.model == "m2"
    assert fake.models.calls == ["m1", "m2"]


def test_parse_error_advances_cascade():
    # m1 responde pero con JSON inválido -> se intenta m2.
    fake = FakeClient({"m1": fake_gemini_response("no-json"), "m2": fake_gemini_response(VALID)})
    gc = GeminiClient(make_settings(), client=fake)
    result = gc.extract_receipt(b"img", "image/jpeg")
    assert result.model == "m2"


def test_all_models_fail():
    fake = FakeClient({"m1": RuntimeError("a"), "m2": RuntimeError("b"), "m3": RuntimeError("c")})
    gc = GeminiClient(make_settings(), client=fake)
    with pytest.raises(GeminiUnavailableError):
        gc.extract_receipt(b"img", "image/jpeg")
    assert fake.models.calls == ["m1", "m2", "m3"]


def test_not_configured_raises():
    settings = Settings(database_url="", gemini_api_key="", internal_api_key="x")
    gc = GeminiClient(settings)  # sin cliente y sin clave
    assert gc.configured is False
    with pytest.raises(GeminiUnavailableError):
        gc.extract_receipt(b"img", "image/jpeg")
