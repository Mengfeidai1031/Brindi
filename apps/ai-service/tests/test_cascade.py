"""Cliente OpenAI-compatible y cascada del motor de IA (rotación de claves/proveedores)."""

import httpx
import pytest

from app.ai import AIEngine, AIUnavailableError
from app.providers import openai_compat as oc
from app.providers.base import ProviderConfig, ProviderError, RateLimitError
from tests.conftest import FakeHTTP, FakeResponse, chat_ok, make_settings

OCR_JSON = '{"items":[{"description":"Pizza","amount":12.5}],"total":12.5,"currency":"EUR"}'
CFG = ProviderConfig("test", "https://x/v1/", "key", "model", supports_vision=True)


# --- complete_json (cliente de bajo nivel) ---


def test_complete_json_ok():
    http = FakeHTTP([chat_ok(OCR_JSON, tokens=11)])
    content, tokens = oc.complete_json(http, CFG, system="s", user_content="u", temperature=0.0)
    assert content == OCR_JSON
    assert tokens == 11
    # Envía Authorization Bearer y pide JSON.
    call = http.calls[0]
    assert call["headers"]["Authorization"] == "Bearer key"
    assert call["json"]["response_format"] == {"type": "json_object"}


def test_complete_json_429_raises_ratelimit():
    http = FakeHTTP([FakeResponse(429)])
    with pytest.raises(RateLimitError):
        oc.complete_json(http, CFG, system="s", user_content="u", temperature=0.0)


def test_complete_json_http_error_raises_provider():
    http = FakeHTTP([FakeResponse(500)])
    with pytest.raises(ProviderError):
        oc.complete_json(http, CFG, system="s", user_content="u", temperature=0.0)


def test_complete_json_network_error_raises_provider():
    http = FakeHTTP([httpx.ConnectError("boom")])
    with pytest.raises(ProviderError):
        oc.complete_json(http, CFG, system="s", user_content="u", temperature=0.0)


def test_build_image_content():
    parts = oc.build_image_content("lee", b"\xff\xd8bytes", "image/jpeg")
    assert parts[0]["type"] == "text"
    assert parts[1]["image_url"]["url"].startswith("data:image/jpeg;base64,")


# --- Cascada de visión (OCR) con pool de Gemini ---


def test_ocr_first_provider_succeeds():
    engine = AIEngine(make_settings(gemini_api_keys="k1,k2"), http_client=FakeHTTP([chat_ok(OCR_JSON)]))
    result = engine.extract_receipt(b"img", "image/jpeg")
    assert result.extraction.currency == "EUR"
    assert result.provider == "gemini#1"


def test_ocr_rotates_key_on_429():
    # La 1ª clave da 429 -> rota a la 2ª, que responde bien.
    http = FakeHTTP([FakeResponse(429), chat_ok(OCR_JSON)])
    engine = AIEngine(make_settings(gemini_api_keys="k1,k2"), http_client=http)
    result = engine.extract_receipt(b"img", "image/jpeg")
    assert result.provider == "gemini#2"
    assert len(http.calls) == 2


def test_ocr_skips_invalid_json():
    http = FakeHTTP([chat_ok("no-json"), chat_ok(OCR_JSON)])
    engine = AIEngine(make_settings(gemini_api_keys="k1,k2"), http_client=http)
    assert engine.extract_receipt(b"img", "image/jpeg").provider == "gemini#2"


def test_ocr_all_fail_raises():
    http = FakeHTTP([FakeResponse(500), FakeResponse(500)])
    engine = AIEngine(make_settings(gemini_api_keys="k1,k2"), http_client=http)
    with pytest.raises(AIUnavailableError):
        engine.extract_receipt(b"img", "image/jpeg")


def test_ocr_no_providers_unavailable():
    engine = AIEngine(make_settings(), http_client=FakeHTTP([]))
    assert engine.has_vision is False
    with pytest.raises(AIUnavailableError):
        engine.extract_receipt(b"img", "image/jpeg")


def test_groq_vision_fallback_added():
    # Con pool de Gemini agotado, Groq Vision es el último recurso.
    s = make_settings(gemini_api_keys="k1", groq_api_key="g", ocr_use_groq_fallback=True)
    http = FakeHTTP([FakeResponse(429), chat_ok(OCR_JSON)])
    engine = AIEngine(s, http_client=http)
    assert engine.extract_receipt(b"img", "image/jpeg").provider == "groq-vision"
