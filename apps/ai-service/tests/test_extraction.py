"""Parseo y validación de la respuesta del modelo, y lectura de tokens."""

import json

import pytest
from pydantic import ValidationError

from app.gemini import extract_token_count, parse_extraction
from tests.conftest import fake_gemini_response

VALID = '{"items":[{"description":"Pizza","amount":12.5}],"total":12.5,"currency":"EUR"}'


def test_parse_valid():
    extraction = parse_extraction(VALID)
    assert len(extraction.items) == 1
    assert extraction.items[0].description == "Pizza"
    assert extraction.items[0].amount == 12.5
    assert extraction.currency == "EUR"


def test_parse_empty_raises():
    with pytest.raises(ValueError):
        parse_extraction("")
    with pytest.raises(ValueError):
        parse_extraction("   ")
    with pytest.raises(ValueError):
        parse_extraction(None)


def test_parse_invalid_json_raises():
    with pytest.raises(json.JSONDecodeError):
        parse_extraction("{no es json")


def test_parse_schema_mismatch_raises():
    with pytest.raises(ValidationError):
        parse_extraction('{"items":"esto no es una lista"}')


def test_parse_missing_items_defaults_empty():
    extraction = parse_extraction('{"total":10.0,"currency":"EUR"}')
    assert extraction.items == []
    assert extraction.total == 10.0


def test_token_count():
    assert extract_token_count(fake_gemini_response("{}", tokens=128)) == 128
    assert extract_token_count(fake_gemini_response("{}")) == 0
    assert extract_token_count(object()) == 0
