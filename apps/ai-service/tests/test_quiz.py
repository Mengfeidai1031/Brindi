"""Trivia: prompt (incl. tema libre), limpieza de preguntas y cascada de texto."""

import pytest

from app.ai import AIEngine, AIUnavailableError
from app.models import QuizGeneration, clean_quiz_questions
from app.prompts import build_quiz_prompt
from tests.conftest import FakeHTTP, FakeResponse, chat_ok, make_settings

VALID_QUIZ = '{"questions":[{"question":"¿Capital de Italia?","options":["Roma","Madrid","París","Berlín"],"correct_index":0,"explanation":"Roma."}]}'


def test_prompt_predefined_category_uses_label():
    prompt = build_quiz_prompt("FUTBOL", "FACIL", 5, "en")
    assert "football" in prompt
    assert "easy" in prompt
    assert "English" in prompt


def test_prompt_otros_uses_free_topic():
    prompt = build_quiz_prompt("OTROS", "DIFICIL", 5, "es", topic="Star Wars")
    assert "Star Wars" in prompt
    assert "difícil" in prompt


def test_clean_quiz_questions_validates_and_limits():
    gen = QuizGeneration.model_validate_json(VALID_QUIZ)
    questions = clean_quiz_questions(gen, 5)
    assert len(questions) == 1
    assert questions[0].options == ["Roma", "Madrid", "París", "Berlín"]
    assert questions[0].correct_index == 0


def test_generate_quiz_first_provider_ok():
    engine = AIEngine(make_settings(groq_api_key="g"), http_client=FakeHTTP([chat_ok(VALID_QUIZ)]))
    questions, provider, tokens = engine.generate_quiz("OTROS", "FACIL", 5, "es", topic="Cine")
    assert provider == "groq"
    assert len(questions) == 1


def test_generate_quiz_falls_through_to_next_provider():
    http = FakeHTTP([chat_ok("no-json"), chat_ok(VALID_QUIZ)])
    engine = AIEngine(make_settings(groq_api_key="g", mistral_api_key="m"), http_client=http)
    _, provider, _ = engine.generate_quiz("OTROS", "FACIL", 5, "es", topic="Cine")
    assert provider == "mistral"


def test_generate_quiz_all_fail_raises():
    http = FakeHTTP([FakeResponse(500), FakeResponse(500)])
    engine = AIEngine(make_settings(groq_api_key="g", mistral_api_key="m"), http_client=http)
    with pytest.raises(AIUnavailableError):
        engine.generate_quiz("OTROS", "FACIL", 5, "es", topic="Cine")


def test_generate_quiz_no_text_providers():
    engine = AIEngine(make_settings(), http_client=FakeHTTP([]))
    assert engine.has_text is False
    with pytest.raises(AIUnavailableError):
        engine.generate_quiz("OTROS", "FACIL", 5, "es", topic="Cine")
