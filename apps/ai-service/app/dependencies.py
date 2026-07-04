"""Dependencias de FastAPI que exponen los recursos compartidos del app.state."""

from fastapi import Request

from .ai import AIEngine
from .db import Database


def get_db(request: Request) -> Database:
    return request.app.state.db


def get_ai(request: Request) -> AIEngine:
    return request.app.state.ai
