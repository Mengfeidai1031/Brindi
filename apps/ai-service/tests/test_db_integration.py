"""Integración real con PostgreSQL: valida el INSERT en ai_usage (cast del enum) y el resumen.

Se omite automáticamente si TEST_DATABASE_URL no está definido, de modo que la
suite no falla en entornos sin base de datos.
"""

import os

import pytest

from app.db import Database

TEST_DSN = os.environ.get("TEST_DATABASE_URL")

pytestmark = pytest.mark.skipif(not TEST_DSN, reason="TEST_DATABASE_URL no definido")


@pytest.fixture
async def db():
    database = Database()
    try:
        await database.connect(TEST_DSN)
    except Exception as exc:  # noqa: BLE001
        pytest.skip(f"no se pudo conectar a la BD de test: {exc}")
    yield database
    await database.disconnect()


async def test_ping(db):
    assert await db.ping() is True


async def test_log_usage_and_summary(db):
    # Limpia para un conteo determinista.
    async with db._pool.acquire() as conn:  # noqa: SLF001 - acceso directo en test
        await conn.execute("TRUNCATE TABLE ai_usage")

    await db.log_usage("OCR_RECEIPT", "gemini-2.5-flash", 100, True)
    await db.log_usage("OCR_RECEIPT", "gemini-2.0-flash", 50, True)
    await db.log_usage("OCR_RECEIPT", "none", 0, False)

    summary = await db.usage_summary()
    rows = {r.service: r for r in summary.by_service}
    assert "OCR_RECEIPT" in rows
    ocr = rows["OCR_RECEIPT"]
    assert ocr.total == 3
    assert ocr.successes == 2
    assert ocr.failures == 1
    assert ocr.tokens == 150
