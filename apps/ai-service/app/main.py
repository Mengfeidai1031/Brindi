"""Punto de entrada del ai-service: configura la app, los recursos y los routers."""

import logging
import time
import uuid
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request

from .config import get_settings
from .db import Database
from .gemini import GeminiClient
from .logging_config import configure_logging
from .routers import health, ocr, quiz, usage

logger = logging.getLogger("brindi.ai")


@asynccontextmanager
async def lifespan(app: FastAPI):
    configure_logging()
    settings = get_settings()

    db = Database()
    if settings.database_url:
        try:
            await db.connect(settings.database_url)
            logger.info("conexión a base de datos establecida")
        except Exception:  # noqa: BLE001 - el servicio arranca igualmente; /health reflejará db: down
            logger.exception("no se pudo conectar a la base de datos")

    app.state.db = db
    app.state.gemini = GeminiClient(settings)
    if not app.state.gemini.configured:
        logger.warning("GEMINI_API_KEY no configurada: el OCR responderá 502 hasta que se defina")

    try:
        yield
    finally:
        await db.disconnect()


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title=f"{settings.app_name} ai-service",
        description=(
            "Servicio interno de IA de Brindi: cascada Gemini para OCR de tickets, "
            "generación de quiz y de planes. No expone datos personales ni persiste contenido."
        ),
        version="0.7.0",
        lifespan=lifespan,
    )

    @app.middleware("http")
    async def request_context(request: Request, call_next):
        request_id = request.headers.get("x-request-id") or uuid.uuid4().hex
        request.state.request_id = request_id
        start = time.perf_counter()
        response = await call_next(request)
        duration_ms = round((time.perf_counter() - start) * 1000, 1)
        response.headers["X-Request-ID"] = request_id
        logger.info(
            "request",
            extra={
                "request_id": request_id,
                "method": request.method,
                "path": request.url.path,
                "status": response.status_code,
                "duration_ms": duration_ms,
            },
        )
        return response

    app.include_router(health.router)
    app.include_router(ocr.router)
    app.include_router(quiz.router)
    app.include_router(usage.router)
    return app


app = create_app()
