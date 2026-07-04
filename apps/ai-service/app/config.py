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

    # Secreto compartido con la API de NestJS para autenticar las llamadas internas.
    internal_api_key: str = ""

    # === Proveedores de IA (todos vía API OpenAI-compatible) ===
    # La estrategia es una cascada de PROVEEDORES por tarea, no de modelos.
    #
    # OCR (visión): pool de Gemini (rotación de claves ante 429) + Groq Vision de respaldo.
    # Plan y trivia "Otros": Groq -> Mistral -> Together.
    # Trivia de categorías predefinidas: banco local (no usa IA).

    # Gemini: pool de claves separadas por comas (p. ej. "k1,k2,k3"). Vacío = OCR no disponible.
    # `gemini_api_key` (una sola) se mantiene por compatibilidad y se añade al pool.
    gemini_api_key: str = ""
    gemini_api_keys: str = ""
    gemini_base_url: str = "https://generativelanguage.googleapis.com/v1beta/openai/"
    gemini_vision_model: str = "gemini-2.0-flash"
    # Mismo modelo flash sirve texto puro: respaldo de trivia/plan si Groq no está
    # disponible (p. ej. bloqueado desde la IP del servidor) y aún no hay Mistral/Together.
    gemini_text_model: str = "gemini-2.0-flash"

    # Groq (texto y visión de respaldo).
    groq_api_key: str = ""
    groq_base_url: str = "https://api.groq.com/openai/v1/"
    groq_text_model: str = "llama-3.3-70b-versatile"
    groq_vision_model: str = "meta-llama/llama-4-scout-17b-16e-instruct"

    # Mistral (texto, respaldo).
    mistral_api_key: str = ""
    mistral_base_url: str = "https://api.mistral.ai/v1/"
    mistral_text_model: str = "mistral-small-latest"

    # Together (texto, respaldo).
    together_api_key: str = ""
    together_base_url: str = "https://api.together.xyz/v1/"
    together_text_model: str = "meta-llama/Llama-3.3-70B-Instruct-Turbo-Free"

    # Usar Groq Vision como último recurso del OCR si se agota el pool de Gemini.
    ocr_use_groq_fallback: bool = True

    # Tiempo máximo por llamada a un proveedor (segundos).
    provider_timeout_seconds: float = 30.0

    # Límite de tamaño de imagen aceptado (10 MB).
    max_image_bytes: int = 10 * 1024 * 1024


@lru_cache
def get_settings() -> Settings:
    return Settings()
