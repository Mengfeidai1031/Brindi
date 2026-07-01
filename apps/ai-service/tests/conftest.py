"""Configuración común de los tests: entorno determinista y dobles de prueba."""

import os
from types import SimpleNamespace

# Entorno de test fijado antes de que nada lea la configuración.
os.environ.setdefault("INTERNAL_API_KEY", "test-internal-key")
os.environ.setdefault("GEMINI_API_KEY", "")
os.environ.setdefault("DATABASE_URL", "")

import pytest

from app.config import get_settings
from app.models import OcrResponse  # noqa: F401 - asegura que el paquete importa

get_settings.cache_clear()

INTERNAL_KEY = "test-internal-key"


class FakeDB:
    """Doble de la base de datos que registra las llamadas a log_usage en memoria."""

    def __init__(self, ping_ok: bool = True) -> None:
        self.logs: list[tuple[str, str, int, bool]] = []
        self._ping_ok = ping_ok

    async def ping(self) -> bool:
        return self._ping_ok

    async def log_usage(self, service: str, model_used: str, tokens: int, success: bool) -> None:
        self.logs.append((service, model_used, tokens, success))

    async def usage_summary(self):
        from app.models import UsageByService, UsageResponse

        return UsageResponse(by_service=[UsageByService(service="OCR_RECEIPT", total=1, successes=1, failures=0, tokens=0)])


class FakeGemini:
    """Doble del cliente Gemini: devuelve un resultado fijo o lanza una excepción."""

    configured = True

    def __init__(self, result=None, raise_exc: Exception | None = None) -> None:
        self._result = result
        self._raise = raise_exc

    def extract_receipt(self, image_bytes: bytes, mime_type: str):
        if self._raise is not None:
            raise self._raise
        return self._result


def fake_gemini_response(text: str, tokens: int = 0):
    """Construye una respuesta tipo SDK con .text y .usage_metadata."""
    meta = SimpleNamespace(total_token_count=tokens) if tokens else None
    return SimpleNamespace(text=text, usage_metadata=meta)


@pytest.fixture
def client_factory():
    """Crea un TestClient con get_db/get_gemini sobreescritos por dobles."""
    from fastapi.testclient import TestClient

    from app.dependencies import get_db, get_gemini
    from app.main import create_app

    def _make(db: FakeDB, gemini: FakeGemini) -> TestClient:
        app = create_app()
        app.dependency_overrides[get_db] = lambda: db
        app.dependency_overrides[get_gemini] = lambda: gemini
        return TestClient(app)

    return _make
