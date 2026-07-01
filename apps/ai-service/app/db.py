"""Acceso a la base de datos (asyncpg). El servicio solo toca la tabla ai_usage."""

import logging
import uuid
from urllib.parse import urlsplit, urlunsplit, parse_qs

import asyncpg

from .models import UsageByService, UsageResponse

logger = logging.getLogger("brindi.ai.db")


def _split_dsn(database_url: str) -> tuple[str, dict[str, str]]:
    """Limpia el DSN para asyncpg: quita ?schema=... y lo traslada a search_path."""
    parts = urlsplit(database_url)
    query = parse_qs(parts.query)
    schema = query.get("schema", ["public"])[0]
    clean = urlunsplit((parts.scheme, parts.netloc, parts.path, "", ""))
    return clean, {"search_path": schema}


class Database:
    def __init__(self) -> None:
        self._pool: asyncpg.Pool | None = None

    async def connect(self, database_url: str) -> None:
        dsn, server_settings = _split_dsn(database_url)
        self._pool = await asyncpg.create_pool(
            dsn=dsn, min_size=1, max_size=5, server_settings=server_settings
        )

    async def disconnect(self) -> None:
        if self._pool is not None:
            await self._pool.close()
            self._pool = None

    @property
    def connected(self) -> bool:
        return self._pool is not None

    async def ping(self) -> bool:
        if self._pool is None:
            return False
        async with self._pool.acquire() as conn:
            await conn.execute("SELECT 1")
        return True

    async def log_usage(self, service: str, model_used: str, tokens: int, success: bool) -> None:
        """Registra una llamada en ai_usage. Es telemetría: nunca rompe la petición."""
        if self._pool is None:
            return
        try:
            async with self._pool.acquire() as conn:
                await conn.execute(
                    'INSERT INTO ai_usage (id, service, model_used, tokens, success, created_at) '
                    'VALUES ($1, $2::"AiService", $3, $4, $5, now())',
                    str(uuid.uuid4()),
                    service,
                    model_used,
                    tokens,
                    success,
                )
        except Exception:  # noqa: BLE001 - el fallo de telemetría no debe afectar al usuario
            logger.warning("no se pudo registrar el uso", extra={"service": service})

    async def usage_summary(self) -> UsageResponse:
        if self._pool is None:
            return UsageResponse(by_service=[])
        rows = await self._pool.fetch(
            "SELECT service::text AS service, "
            "COUNT(*) AS total, "
            "COUNT(*) FILTER (WHERE success) AS successes, "
            "COUNT(*) FILTER (WHERE NOT success) AS failures, "
            "COALESCE(SUM(tokens), 0) AS tokens "
            "FROM ai_usage GROUP BY service ORDER BY service"
        )
        return UsageResponse(
            by_service=[
                UsageByService(
                    service=r["service"],
                    total=r["total"],
                    successes=r["successes"],
                    failures=r["failures"],
                    tokens=r["tokens"],
                )
                for r in rows
            ]
        )
