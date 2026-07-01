"""Dependencias de FastAPI que exponen los recursos compartidos del app.state."""

from fastapi import Request

from .db import Database
from .gemini import GeminiClient


def get_db(request: Request) -> Database:
    return request.app.state.db


def get_gemini(request: Request) -> GeminiClient:
    return request.app.state.gemini
