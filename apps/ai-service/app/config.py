"""Configuración del servicio cargada desde variables de entorno (y .env en local)."""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        # En local sin Docker el .env vive en la raíz del monorepo.
        env_file=(".env", "../../.env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "Brindi"
    ai_port: int = 5000

    # Misma base de datos que la API; el servicio solo usa la tabla ai_usage.
    database_url: str = ""

    # Clave de Gemini (opcional: si falta, el servicio arranca pero el OCR responde 502).
    gemini_api_key: str = ""

    # Secreto compartido con la API de NestJS para autenticar las llamadas internas.
    internal_api_key: str = ""

    # Cascada de modelos para OCR: se prueban en orden hasta que uno responde.
    ocr_models: list[str] = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-2.5-pro"]

    # Límite de tamaño de imagen aceptado (10 MB).
    max_image_bytes: int = 10 * 1024 * 1024


@lru_cache
def get_settings() -> Settings:
    return Settings()
