"""Tests de los endpoints HTTP con dependencias sobreescritas (sin red ni BD real)."""

from app.ai import AIUnavailableError, OcrResult
from app.models import PlanActivity, QuizQuestion, ReceiptExtraction
from tests.conftest import FakeAI, FakeDB, INTERNAL_KEY

JPEG = ("ticket.jpg", b"\xff\xd8\xff\xe0fake-bytes", "image/jpeg")


def _ocr_result(provider="gemini#1", tokens=42) -> OcrResult:
    extraction = ReceiptExtraction.model_validate(
        {
            "items": [
                {"description": "Pizza", "amount": 12.5},
                {"description": "Refresco", "amount": 2.0},
            ],
            "total": 14.5,
            "currency": "EUR",
        }
    )
    return OcrResult(extraction=extraction, provider=provider, tokens=tokens)


# --- /health y /usage ---


def test_health_public(client_factory):
    client = client_factory(FakeDB(ping_ok=True), FakeAI())
    res = client.get("/health")
    assert res.status_code == 200
    body = res.json()
    assert body["status"] == "ok"
    assert body["db"] == "up"
    assert body["ai"]["vision"] == "ready"
    assert body["ai"]["text"] == "ready"
    assert "X-Request-ID" in res.headers


def test_usage_requires_key_and_returns_summary(client_factory):
    client = client_factory(FakeDB(), FakeAI())
    assert client.get("/usage").status_code == 401
    res = client.get("/usage", headers={"X-Internal-Key": INTERNAL_KEY})
    assert res.status_code == 200
    assert res.json()["by_service"][0]["service"] == "OCR_RECEIPT"


# --- /ocr-receipt ---


def test_ocr_requires_internal_key(client_factory):
    client = client_factory(FakeDB(), FakeAI(ocr=_ocr_result()))
    assert client.post("/ocr-receipt", files={"file": JPEG}).status_code == 401


def test_ocr_rejects_non_image(client_factory):
    client = client_factory(FakeDB(), FakeAI(ocr=_ocr_result()))
    res = client.post(
        "/ocr-receipt",
        files={"file": ("notas.txt", b"hola", "text/plain")},
        headers={"X-Internal-Key": INTERNAL_KEY},
    )
    assert res.status_code == 415


def test_ocr_happy_path(client_factory):
    db = FakeDB()
    client = client_factory(db, FakeAI(ocr=_ocr_result()))
    res = client.post("/ocr-receipt", files={"file": JPEG}, headers={"X-Internal-Key": INTERNAL_KEY})
    assert res.status_code == 200
    body = res.json()
    assert body["model_used"] == "gemini#1"
    assert body["currency"] == "EUR"
    assert body["total_cents"] == 1450
    assert body["items"] == [
        {"description": "Pizza", "amount_cents": 1250},
        {"description": "Refresco", "amount_cents": 200},
    ]
    assert db.logs == [("OCR_RECEIPT", "gemini#1", 42, True)]


def test_ocr_total_falls_back_to_sum(client_factory):
    extraction = ReceiptExtraction.model_validate(
        {"items": [{"description": "A", "amount": 3.0}, {"description": "B", "amount": 1.25}]}
    )
    result = OcrResult(extraction=extraction, provider="groq-vision", tokens=0)
    client = client_factory(FakeDB(), FakeAI(ocr=result))
    res = client.post("/ocr-receipt", files={"file": JPEG}, headers={"X-Internal-Key": INTERNAL_KEY})
    assert res.status_code == 200
    assert res.json()["total_cents"] == 425


def test_ocr_unavailable_logs_failure(client_factory):
    db = FakeDB()
    client = client_factory(db, FakeAI(raise_exc=AIUnavailableError("sin proveedores")))
    res = client.post("/ocr-receipt", files={"file": JPEG}, headers={"X-Internal-Key": INTERNAL_KEY})
    assert res.status_code == 502
    assert db.logs == [("OCR_RECEIPT", "none", 0, False)]


# --- /generate-quiz ---

QUIZ_PREDEF = {"category": "GEOGRAFIA", "level": "FACIL", "count": 5, "locale": "es"}
QUIZ_OTROS = {"category": "OTROS", "level": "FACIL", "count": 5, "locale": "es", "topic": "Star Wars"}


def _q(text="P1"):
    return QuizQuestion(question=text, options=["a", "b", "c", "d"], correct_index=2, explanation="e")


def test_quiz_requires_internal_key(client_factory):
    assert client_factory(FakeDB(), FakeAI()).post("/generate-quiz", json=QUIZ_PREDEF).status_code == 401


def test_quiz_validation_bad_category(client_factory):
    client = client_factory(FakeDB(), FakeAI())
    bad = {"category": "NO_EXISTE", "level": "FACIL", "count": 5, "locale": "es"}
    assert client.post("/generate-quiz", json=bad, headers={"X-Internal-Key": INTERNAL_KEY}).status_code == 422


def test_quiz_count_out_of_range(client_factory):
    client = client_factory(FakeDB(), FakeAI())
    bad = {**QUIZ_PREDEF, "count": 99}
    assert client.post("/generate-quiz", json=bad, headers={"X-Internal-Key": INTERNAL_KEY}).status_code == 422


def test_quiz_otros_requires_topic(client_factory):
    client = client_factory(FakeDB(), FakeAI())
    bad = {"category": "OTROS", "level": "FACIL", "count": 5, "locale": "es"}  # sin topic
    assert client.post("/generate-quiz", json=bad, headers={"X-Internal-Key": INTERNAL_KEY}).status_code == 422


def test_quiz_predefined_uses_local_bank(client_factory):
    # Categoría predefinida: banco local, sin tocar la IA.
    db = FakeDB(fallback=[_q()])
    client = client_factory(db, FakeAI(raise_exc=AIUnavailableError("no debería llamarse")))
    res = client.post("/generate-quiz", json=QUIZ_PREDEF, headers={"X-Internal-Key": INTERNAL_KEY})
    assert res.status_code == 200
    body = res.json()
    assert body["source"] == "local"
    assert body["model_used"] is None
    assert db.fallback_calls == [("GEOGRAFIA", "es", 5)]
    assert db.logs == [("GENERATE_QUIZ", "local", 0, True)]


def test_quiz_predefined_empty_bank_returns_502(client_factory):
    db = FakeDB(fallback=[])
    client = client_factory(db, FakeAI())
    res = client.post("/generate-quiz", json=QUIZ_PREDEF, headers={"X-Internal-Key": INTERNAL_KEY})
    assert res.status_code == 502
    assert db.logs == [("GENERATE_QUIZ", "local", 0, False)]


def test_quiz_otros_uses_ai(client_factory):
    db = FakeDB()
    client = client_factory(db, FakeAI(quiz=([_q("¿?")], "groq", 5)))
    res = client.post("/generate-quiz", json=QUIZ_OTROS, headers={"X-Internal-Key": INTERNAL_KEY})
    assert res.status_code == 200
    body = res.json()
    assert body["source"] == "ai"
    assert body["model_used"] == "groq"
    assert db.logs == [("GENERATE_QUIZ", "groq", 5, True)]


def test_quiz_otros_falls_back_to_random_bank(client_factory):
    # Si la IA falla, "Otros" cae al banco "Variado" (RANDOM).
    db = FakeDB(fallback=[_q()])
    client = client_factory(db, FakeAI(raise_exc=AIUnavailableError("sin proveedores")))
    res = client.post("/generate-quiz", json=QUIZ_OTROS, headers={"X-Internal-Key": INTERNAL_KEY})
    assert res.status_code == 200
    body = res.json()
    assert body["source"] == "fallback"
    assert db.fallback_calls == [("RANDOM", "es", 5)]
    assert db.logs == [("GENERATE_QUIZ", "fallback", 0, True)]


# --- /generate-plan ---

PLAN_BODY = {
    "location_text": "Las Palmas", "party_size": 4, "category": "COPAS",
    "budget": "BAJO", "duration": "NOCHE", "locale": "es",
}


def test_plan_requires_internal_key(client_factory):
    assert client_factory(FakeDB(), FakeAI()).post("/generate-plan", json=PLAN_BODY).status_code == 401


def test_plan_validation_requires_location(client_factory):
    client = client_factory(FakeDB(), FakeAI())
    bad = {"party_size": 2, "category": "COPAS", "budget": "BAJO", "duration": "NOCHE"}
    assert client.post("/generate-plan", json=bad, headers={"X-Internal-Key": INTERNAL_KEY}).status_code == 422


def test_plan_validation_bad_category(client_factory):
    client = client_factory(FakeDB(), FakeAI())
    bad = {**PLAN_BODY, "category": "NOPE"}
    assert client.post("/generate-plan", json=bad, headers={"X-Internal-Key": INTERNAL_KEY}).status_code == 422


def test_plan_ai_success(client_factory):
    db = FakeDB()
    activity = PlanActivity(
        title="Café con vistas", place_name="Café Central", description="Tomad algo.",
        duration_label="1 h", cost_label="5 € pp", map_query="Café Central Las Palmas",
    )
    client = client_factory(db, FakeAI(plan=("Una tarde estupenda.", [activity], "groq", 3)))
    res = client.post("/generate-plan", json=PLAN_BODY, headers={"X-Internal-Key": INTERNAL_KEY})
    assert res.status_code == 200
    body = res.json()
    assert body["source"] == "ai"
    assert body["intro"].startswith("Una tarde")
    assert body["activities"][0]["map_query"] == "Café Central Las Palmas"
    assert db.logs == [("GENERATE_PLAN", "groq", 3, True)]


def test_plan_unavailable_returns_503(client_factory):
    db = FakeDB()
    client = client_factory(db, FakeAI(raise_exc=AIUnavailableError("sin proveedores")))
    res = client.post("/generate-plan", json=PLAN_BODY, headers={"X-Internal-Key": INTERNAL_KEY})
    assert res.status_code == 503
    assert db.logs == [("GENERATE_PLAN", "unavailable", 0, False)]
