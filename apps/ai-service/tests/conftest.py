"""Configuración común de los tests: entorno determinista y dobles de prueba."""

import os

# Entorno de test fijado antes de que nada lea la configuración.
os.environ.setdefault("INTERNAL_API_KEY", "test-internal-key")
os.environ.setdefault("DATABASE_URL", "")
# Sin claves de proveedores por defecto (cada test fija las que necesita).
for _k in ("GEMINI_API_KEY", "GEMINI_API_KEYS", "GROQ_API_KEY", "MISTRAL_API_KEY", "TOGETHER_API_KEY"):
    os.environ.setdefault(_k, "")

import pytest

from app.config import Settings, get_settings
from app.models import OcrResponse  # noqa: F401 - asegura que el paquete importa

get_settings.cache_clear()

INTERNAL_KEY = "test-internal-key"


def make_settings(**overrides) -> Settings:
    """Settings con valores explícitos para los tests (ignora el entorno)."""
    base = dict(
        app_name="Brindi",
        database_url="",
        internal_api_key="x",
        gemini_api_key="",
        gemini_api_keys="",
        groq_api_key="",
        mistral_api_key="",
        together_api_key="",
        ocr_use_groq_fallback=False,
    )
    base.update(overrides)
    return Settings(**base)


class FakeDB:
    """Doble de la base de datos que registra las llamadas a log_usage en memoria."""

    def __init__(self, ping_ok: bool = True, fallback=None) -> None:
        self.logs: list[tuple[str, str, int, bool]] = []
        self._ping_ok = ping_ok
        self._fallback = fallback or []
        self.fallback_calls: list[tuple[str, str, int]] = []

    async def ping(self) -> bool:
        return self._ping_ok

    async def log_usage(self, service: str, model_used: str, tokens: int, success: bool) -> None:
        self.logs.append((service, model_used, tokens, success))

    async def fetch_fallback_questions(self, category: str, locale: str, limit: int):
        self.fallback_calls.append((category, locale, limit))
        return list(self._fallback)[:limit]

    async def usage_summary(self):
        from app.models import UsageByService, UsageResponse

        return UsageResponse(
            by_service=[UsageByService(service="OCR_RECEIPT", total=1, successes=1, failures=0, tokens=0)]
        )


class FakeAI:
    """Doble del motor de IA: devuelve resultados fijos o lanza una excepción."""

    def __init__(
        self, *, ocr=None, quiz=None, plan=None, raise_exc=None, has_vision=True, has_text=True
    ) -> None:
        self._ocr = ocr
        self._quiz = quiz
        self._plan = plan
        self._raise = raise_exc
        self.has_vision = has_vision
        self.has_text = has_text

    def extract_receipt(self, image_bytes: bytes, mime_type: str):
        if self._raise is not None:
            raise self._raise
        return self._ocr

    def generate_quiz(self, category, level, count, locale, topic=None):
        if self._raise is not None:
            raise self._raise
        return self._quiz

    def generate_plan(self, req):
        if self._raise is not None:
            raise self._raise
        return self._plan


# --- Cliente HTTP falso para probar la cascada REAL (AIEngine + providers) ---


class FakeResponse:
    def __init__(self, status_code: int, payload: dict | None = None) -> None:
        self.status_code = status_code
        self._payload = payload or {}

    def json(self) -> dict:
        return self._payload


def chat_ok(content: str, tokens: int = 7) -> FakeResponse:
    """Respuesta OpenAI-compatible correcta con el contenido dado."""
    return FakeResponse(
        200,
        {"choices": [{"message": {"content": content}}], "usage": {"total_tokens": tokens}},
    )


class FakeHTTP:
    """Doble de httpx.Client: responde según una cola (orden = orden de la cascada)."""

    def __init__(self, queue) -> None:
        self._queue = list(queue)
        self.calls: list[dict] = []

    def post(self, url, json=None, headers=None):
        self.calls.append({"url": url, "json": json, "headers": headers})
        item = self._queue.pop(0) if self._queue else FakeResponse(500)
        if isinstance(item, Exception):
            raise item
        return item


@pytest.fixture
def client_factory():
    """Crea un TestClient con get_db/get_ai sobreescritos por dobles."""
    from fastapi.testclient import TestClient

    from app.dependencies import get_ai, get_db
    from app.main import create_app

    def _make(db: FakeDB, ai: FakeAI) -> TestClient:
        app = create_app()
        app.dependency_overrides[get_db] = lambda: db
        app.dependency_overrides[get_ai] = lambda: ai
        return TestClient(app)

    return _make
