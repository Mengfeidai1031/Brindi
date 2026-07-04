#!/usr/bin/env python3
"""Generador del banco local de preguntas de trivia de Brindi.

Crea preguntas por categoría y nivel usando un proveedor de IA con plan gratuito
(por defecto Groq) y las FUSIONA en el banco que sirve la app para las categorías
predefinidas. No necesita dependencias externas (usa la librería estándar).

Uso rápido:
    export GROQ_API_KEY=tu_clave            # https://console.groq.com/keys
    python3 scripts/generate-quiz-bank.py   # objetivo: 1200 preguntas (es)

    # recarga la base de datos con el banco ampliado:
    cd apps/api && npm run prisma:seed

Opciones:
    --total N         Tamaño FINAL del banco (incluye las ya existentes). Def. 1200
    --per-request N   Preguntas por llamada al modelo. Def. 10
    --provider P      groq | gemini | mistral | together. Def. groq
    --locale L        es | en. Def. es
    --output PATH     Banco a actualizar. Def. apps/api/prisma/seed-data/quiz-fallback.<locale>.json
    --sleep S         Pausa entre llamadas en segundos (respeta límites). Def. 2.0
    --dry-run         No escribe; solo informa de cuántas generaría

Las preguntas de tema libre ("Otros") NO se precargan: se generan en vivo con IA.
Este banco cubre solo las categorías predefinidas.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

# --- Proveedores (todos hablan la API de chat OpenAI-compatible) ---
PROVIDERS = {
    "groq": {
        "base_url": "https://api.groq.com/openai/v1",
        "model": "llama-3.3-70b-versatile",
        "env": ["GROQ_API_KEY"],
    },
    "gemini": {
        "base_url": "https://generativelanguage.googleapis.com/v1beta/openai",
        "model": "gemini-2.0-flash",
        "env": ["GEMINI_API_KEYS", "GEMINI_API_KEY"],
    },
    "mistral": {
        "base_url": "https://api.mistral.ai/v1",
        "model": "mistral-small-latest",
        "env": ["MISTRAL_API_KEY"],
    },
    "together": {
        "base_url": "https://api.together.xyz/v1",
        "model": "meta-llama/Llama-3.3-70B-Instruct-Turbo-Free",
        "env": ["TOGETHER_API_KEY"],
    },
}

CATEGORIES = ["FUTBOL", "PELICULAS_SERIES", "MUSICA", "GEOGRAFIA", "HISTORIA", "CIENCIA", "RANDOM"]
LEVELS = ["FACIL", "MEDIO", "DIFICIL", "IMPOSIBLE"]

CATEGORY_LABELS = {
    "FUTBOL": {"es": "fútbol", "en": "football (soccer)"},
    "PELICULAS_SERIES": {"es": "películas y series", "en": "movies and TV series"},
    "MUSICA": {"es": "música", "en": "music"},
    "GEOGRAFIA": {"es": "geografía", "en": "geography"},
    "HISTORIA": {"es": "historia", "en": "history"},
    "CIENCIA": {"es": "ciencia", "en": "science"},
    "RANDOM": {"es": "cultura general variada", "en": "mixed general knowledge"},
}
LEVEL_LABELS = {
    "FACIL": {"es": "fácil", "en": "easy"},
    "MEDIO": {"es": "media", "en": "medium"},
    "DIFICIL": {"es": "difícil", "en": "hard"},
    "IMPOSIBLE": {"es": "casi imposible", "en": "nearly impossible"},
}
LANGUAGE = {"es": "español", "en": "English"}

SYSTEM = (
    "Eres un generador de trivia preciso y factual. Responde SOLO con un objeto JSON "
    'con la forma {"questions":[{"question":string,"options":[string,string,string,string],'
    '"correctIndex":0,"explanation":string}]}. Cada pregunta debe tener exactamente cuatro '
    "opciones y una única respuesta correcta verdadera. No añadas texto fuera del JSON."
)


def build_prompt(category: str, level: str, count: int, locale: str) -> str:
    cat = CATEGORY_LABELS[category][locale]
    lvl = LEVEL_LABELS[level][locale]
    lang = LANGUAGE[locale]
    return (
        f"Genera {count} preguntas de trivia tipo test sobre {cat}, dificultad {lvl}. "
        f"Escribe preguntas, opciones y explicaciones en {lang}. Cada pregunta con exactamente "
        "4 opciones, una sola correcta (su índice 0-3 en correctIndex) y una explicación breve. "
        "Varía los temas y no repitas preguntas. Devuelve solo el objeto JSON."
    )


def normalize(text: str) -> str:
    return re.sub(r"\s+", " ", text.strip().lower())


def call_model(base_url: str, key: str, model: str, prompt: str, timeout: float) -> str:
    payload = {
        "model": model,
        "messages": [{"role": "system", "content": SYSTEM}, {"role": "user", "content": prompt}],
        "temperature": 0.85,
        "max_tokens": 2048,
        "response_format": {"type": "json_object"},
    }
    req = urllib.request.Request(
        base_url.rstrip("/") + "/chat/completions",
        data=json.dumps(payload).encode("utf-8"),
        headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        data = json.loads(resp.read().decode("utf-8"))
    return data["choices"][0]["message"]["content"]


def parse_questions(raw: str, category: str, level: str) -> list[dict]:
    """Extrae y valida preguntas del JSON del modelo. Descarta las mal formadas."""
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        # Algunos modelos envuelven el JSON; intenta recortar al primer/último corchete.
        start, end = raw.find("{"), raw.rfind("}")
        if start == -1 or end == -1:
            return []
        try:
            data = json.loads(raw[start : end + 1])
        except json.JSONDecodeError:
            return []

    out: list[dict] = []
    for q in data.get("questions", []):
        question = str(q.get("question", "")).strip()
        options = q.get("options")
        idx = q.get("correctIndex", q.get("correct_index"))
        explanation = str(q.get("explanation", "")).strip()
        if not question or not isinstance(options, list) or len(options) != 4:
            continue
        options = [str(o).strip() for o in options]
        if any(not o for o in options) or len(set(options)) != 4:
            continue
        if not isinstance(idx, int) or not (0 <= idx <= 3):
            continue
        out.append(
            {
                "category": category,
                "level": level,
                "question": question,
                "options": options,
                "correctIndex": idx,
                "explanation": explanation,
            }
        )
    return out


def main() -> int:
    parser = argparse.ArgumentParser(description="Genera el banco de trivia de Brindi.")
    parser.add_argument("--total", type=int, default=1200)
    parser.add_argument("--per-request", type=int, default=10)
    parser.add_argument("--provider", choices=list(PROVIDERS), default="groq")
    parser.add_argument("--locale", choices=["es", "en"], default="es")
    parser.add_argument("--output", default=None)
    parser.add_argument("--sleep", type=float, default=2.0)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    prov = PROVIDERS[args.provider]
    key = ""
    for env_name in prov["env"]:
        raw = os.environ.get(env_name, "")
        if raw:
            key = raw.split(",")[0].strip()  # admite pool "k1,k2"; usa la primera
            break
    if not key:
        print(f"ERROR: define {' o '.join(prov['env'])} en el entorno.", file=sys.stderr)
        return 1

    repo = Path(__file__).resolve().parent.parent
    out_path = (
        Path(args.output)
        if args.output
        else repo / "apps/api/prisma/seed-data" / f"quiz-fallback.{args.locale}.json"
    )

    existing: list[dict] = []
    if out_path.exists():
        existing = json.loads(out_path.read_text(encoding="utf-8"))
    seen = {normalize(q["question"]) for q in existing}

    buckets = [(c, l) for c in CATEGORIES for l in LEVELS]
    per_bucket = max(1, args.total // len(buckets))
    existing_by_bucket: dict[tuple[str, str], int] = {}
    for q in existing:
        existing_by_bucket[(q["category"], q["level"])] = existing_by_bucket.get(
            (q["category"], q["level"]), 0
        ) + 1

    print(
        f"Proveedor: {args.provider} ({prov['model']}) · idioma: {args.locale} · "
        f"objetivo: {args.total} ({per_bucket}/categoría-nivel) · banco actual: {len(existing)}"
    )
    if args.dry_run:
        deficit = sum(max(0, per_bucket - existing_by_bucket.get(b, 0)) for b in buckets)
        print(f"[dry-run] Generaría ~{deficit} preguntas nuevas. No se escribe nada.")
        return 0

    added = 0
    for category, level in buckets:
        have = existing_by_bucket.get((category, level), 0)
        while have < per_bucket:
            want = min(args.per_request, per_bucket - have)
            prompt = build_prompt(category, level, want, args.locale)
            try:
                raw = call_model(prov["base_url"], key, prov["model"], prompt, timeout=60.0)
            except urllib.error.HTTPError as exc:
                if exc.code == 429:
                    print("  · límite alcanzado (429), esperando 20 s…")
                    time.sleep(20)
                    continue
                print(f"  · error HTTP {exc.code} en {category}/{level}; se salta el lote.")
                break
            except (urllib.error.URLError, TimeoutError) as exc:
                print(f"  · error de red en {category}/{level} ({exc}); se salta el lote.")
                break

            batch = parse_questions(raw, category, level)
            new = [q for q in batch if normalize(q["question"]) not in seen]
            for q in new:
                seen.add(normalize(q["question"]))
                existing.append(q)
                have += 1
                added += 1
            print(f"  {category}/{level}: +{len(new)} (bucket {have}/{per_bucket}, total +{added})")
            if not new:
                break  # el modelo repite; no insistir en este bucket
            time.sleep(args.sleep)

    out_path.write_text(
        json.dumps(existing, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(f"\nListo: +{added} preguntas. Banco total: {len(existing)} → {out_path}")
    print("Recarga la BD con:  cd apps/api && npm run prisma:seed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
