"""Tests de los endpoints HTTP con dependencias sobreescritas (sin red ni BD real)."""

from app.gemini import GeminiResult, GeminiUnavailableError
from app.models import ReceiptExtraction
from tests.conftest import FakeDB, FakeGemini, INTERNAL_KEY

JPEG = ("ticket.jpg", b"\xff\xd8\xff\xe0fake-bytes", "image/jpeg")


def _ocr_result() -> GeminiResult:
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
    return GeminiResult(extraction=extraction, model="gemini-2.5-flash", tokens=42)


def test_health_public(client_factory):
    client = client_factory(FakeDB(ping_ok=True), FakeGemini())
    res = client.get("/health")
    assert res.status_code == 200
    body = res.json()
    assert body["status"] == "ok"
    assert body["db"] == "up"
    assert body["gemini"] == "configured"
    assert "X-Request-ID" in res.headers


def test_ocr_requires_internal_key(client_factory):
    client = client_factory(FakeDB(), FakeGemini(result=_ocr_result()))
    res = client.post("/ocr-receipt", files={"file": JPEG})
    assert res.status_code == 401


def test_ocr_rejects_non_image(client_factory):
    client = client_factory(FakeDB(), FakeGemini(result=_ocr_result()))
    res = client.post(
        "/ocr-receipt",
        files={"file": ("notas.txt", b"hola", "text/plain")},
        headers={"X-Internal-Key": INTERNAL_KEY},
    )
    assert res.status_code == 415


def test_ocr_happy_path(client_factory):
    db = FakeDB()
    client = client_factory(db, FakeGemini(result=_ocr_result()))
    res = client.post(
        "/ocr-receipt",
        files={"file": JPEG},
        headers={"X-Internal-Key": INTERNAL_KEY},
    )
    assert res.status_code == 200
    body = res.json()
    assert body["model_used"] == "gemini-2.5-flash"
    assert body["currency"] == "EUR"
    assert body["total_cents"] == 1450
    assert body["items"] == [
        {"description": "Pizza", "amount_cents": 1250},
        {"description": "Refresco", "amount_cents": 200},
    ]
    # Se registró un uso exitoso.
    assert db.logs == [("OCR_RECEIPT", "gemini-2.5-flash", 42, True)]


def test_ocr_total_falls_back_to_sum(client_factory):
    extraction = ReceiptExtraction.model_validate(
        {"items": [{"description": "A", "amount": 3.0}, {"description": "B", "amount": 1.25}]}
    )
    result = GeminiResult(extraction=extraction, model="gemini-2.0-flash", tokens=0)
    client = client_factory(FakeDB(), FakeGemini(result=result))
    res = client.post("/ocr-receipt", files={"file": JPEG}, headers={"X-Internal-Key": INTERNAL_KEY})
    assert res.status_code == 200
    assert res.json()["total_cents"] == 425  # suma de ítems


def test_ocr_unavailable_logs_failure(client_factory):
    db = FakeDB()
    client = client_factory(db, FakeGemini(raise_exc=GeminiUnavailableError("sin modelos")))
    res = client.post("/ocr-receipt", files={"file": JPEG}, headers={"X-Internal-Key": INTERNAL_KEY})
    assert res.status_code == 502
    assert db.logs == [("OCR_RECEIPT", "none", 0, False)]


def test_usage_requires_key_and_returns_summary(client_factory):
    client = client_factory(FakeDB(), FakeGemini())
    assert client.get("/usage").status_code == 401
    res = client.get("/usage", headers={"X-Internal-Key": INTERNAL_KEY})
    assert res.status_code == 200
    assert res.json()["by_service"][0]["service"] == "OCR_RECEIPT"


# --- /generate-quiz ---

from app.models import QuizQuestion  # noqa: E402

QUIZ_BODY = {"category": "GEOGRAFIA", "level": "FACIL", "count": 5, "locale": "es"}


def _ai_quiz_result():
    questions = [
        QuizQuestion(question="¿Capital de Italia?", options=["Roma", "Madrid", "París", "Berlín"], correct_index=0, explanation="Roma."),
    ]
    return (questions, "gemini-2.5-flash")


def test_quiz_requires_internal_key(client_factory):
    client = client_factory(FakeDB(), FakeGemini())
    assert client.post("/generate-quiz", json=QUIZ_BODY).status_code == 401


def test_quiz_validation_error(client_factory):
    client = client_factory(FakeDB(), FakeGemini())
    bad = {"category": "NO_EXISTE", "level": "FACIL", "count": 5, "locale": "es"}
    res = client.post("/generate-quiz", json=bad, headers={"X-Internal-Key": INTERNAL_KEY})
    assert res.status_code == 422


def test_quiz_count_out_of_range(client_factory):
    client = client_factory(FakeDB(), FakeGemini())
    bad = {**QUIZ_BODY, "count": 99}
    res = client.post("/generate-quiz", json=bad, headers={"X-Internal-Key": INTERNAL_KEY})
    assert res.status_code == 422


def test_quiz_ai_source(client_factory):
    db = FakeDB()

    class QuizGemini(FakeGemini):
        def generate_quiz(self, category, level, count, locale):
            return _ai_quiz_result()

    client = client_factory(db, QuizGemini())
    res = client.post("/generate-quiz", json=QUIZ_BODY, headers={"X-Internal-Key": INTERNAL_KEY})
    assert res.status_code == 200
    body = res.json()
    assert body["source"] == "ai"
    assert body["model_used"] == "gemini-2.5-flash"
    assert len(body["questions"]) == 1
    assert db.logs == [("GENERATE_QUIZ", "gemini-2.5-flash", 0, True)]


def test_quiz_falls_back_to_local_bank(client_factory):
    from app.gemini import GeminiUnavailableError

    fallback = [QuizQuestion(question="P1", options=["a", "b", "c", "d"], correct_index=2, explanation="e")]
    db = FakeDB(fallback=fallback)

    class FailingGemini(FakeGemini):
        def generate_quiz(self, category, level, count, locale):
            raise GeminiUnavailableError("sin clave")

    client = client_factory(db, FailingGemini())
    res = client.post("/generate-quiz", json=QUIZ_BODY, headers={"X-Internal-Key": INTERNAL_KEY})
    assert res.status_code == 200
    body = res.json()
    assert body["source"] == "fallback"
    assert body["model_used"] is None
    assert db.fallback_calls == [("GEOGRAFIA", "es", 5)]
    assert db.logs == [("GENERATE_QUIZ", "fallback", 0, True)]


def test_quiz_no_questions_returns_502(client_factory):
    from app.gemini import GeminiUnavailableError

    db = FakeDB(fallback=[])  # ni IA ni banco

    class FailingGemini(FakeGemini):
        def generate_quiz(self, category, level, count, locale):
            raise GeminiUnavailableError("sin clave")

    client = client_factory(db, FailingGemini())
    res = client.post("/generate-quiz", json=QUIZ_BODY, headers={"X-Internal-Key": INTERNAL_KEY})
    assert res.status_code == 502
    assert db.logs == [("GENERATE_QUIZ", "fallback", 0, False)]
