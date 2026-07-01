"""Validación de preguntas y cascada de generación de quiz (sin red)."""

import pytest

from app.config import Settings
from app.gemini import GeminiClient, GeminiUnavailableError, build_quiz_prompt
from app.models import QuizGeneration, clean_quiz_questions
from tests.conftest import fake_gemini_response

VALID_QUIZ = (
    '{"questions":[{"question":"¿Capital de Francia?","options":["Madrid","París","Roma","Berlín"],'
    '"correct_index":1,"explanation":"París es la capital."}]}'
)


def make_settings() -> Settings:
    return Settings(
        database_url="",
        gemini_api_key="fake-key",
        internal_api_key="x",
        quiz_models=["m1", "m2", "m3"],
    )


# --- clean_quiz_questions ---


def test_clean_keeps_valid_and_trims():
    gen = QuizGeneration.model_validate_json(VALID_QUIZ)
    out = clean_quiz_questions(gen, 10)
    assert len(out) == 1
    assert out[0].question == "¿Capital de Francia?"
    assert out[0].correct_index == 1


def test_clean_drops_wrong_option_count():
    gen = QuizGeneration.model_validate(
        {"questions": [{"question": "P", "options": ["a", "b", "c"], "correct_index": 0, "explanation": ""}]}
    )
    assert clean_quiz_questions(gen, 10) == []


def test_clean_drops_index_out_of_range():
    gen = QuizGeneration.model_validate(
        {"questions": [{"question": "P", "options": ["a", "b", "c", "d"], "correct_index": 7, "explanation": ""}]}
    )
    assert clean_quiz_questions(gen, 10) == []


def test_clean_respects_limit():
    q = {"question": "P", "options": ["a", "b", "c", "d"], "correct_index": 0, "explanation": ""}
    gen = QuizGeneration.model_validate({"questions": [q, q, q, q, q]})
    assert len(clean_quiz_questions(gen, 3)) == 3


def test_prompt_includes_locale_and_category():
    prompt = build_quiz_prompt("FUTBOL", "FACIL", 5, "en")
    assert "football" in prompt
    assert "English" in prompt
    assert "5" in prompt


# --- cascada de generación ---


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


def test_quiz_first_model_succeeds():
    fake = FakeClient({"m1": fake_gemini_response(VALID_QUIZ)})
    gc = GeminiClient(make_settings(), client=fake)
    questions, model = gc.generate_quiz("GEOGRAFIA", "FACIL", 5, "es")
    assert model == "m1"
    assert len(questions) == 1
    assert fake.models.calls == ["m1"]


def test_quiz_invalid_questions_advance_cascade():
    invalid = '{"questions":[{"question":"P","options":["a","b"],"correct_index":0,"explanation":""}]}'
    fake = FakeClient({"m1": fake_gemini_response(invalid), "m2": fake_gemini_response(VALID_QUIZ)})
    gc = GeminiClient(make_settings(), client=fake)
    questions, model = gc.generate_quiz("MUSICA", "MEDIO", 4, "es")
    assert model == "m2"
    assert len(questions) == 1


def test_quiz_all_fail_raises():
    fake = FakeClient({"m1": RuntimeError("a"), "m2": RuntimeError("b"), "m3": RuntimeError("c")})
    gc = GeminiClient(make_settings(), client=fake)
    with pytest.raises(GeminiUnavailableError):
        gc.generate_quiz("CIENCIA", "DIFICIL", 5, "es")
    assert fake.models.calls == ["m1", "m2", "m3"]


def test_quiz_not_configured_raises():
    gc = GeminiClient(Settings(database_url="", gemini_api_key="", internal_api_key="x"))
    with pytest.raises(GeminiUnavailableError):
        gc.generate_quiz("HISTORIA", "FACIL", 3, "es")
