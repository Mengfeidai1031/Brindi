"""Validación del esquema de extracción del ticket (ReceiptExtraction)."""

import pytest
from pydantic import ValidationError

from app.models import ReceiptExtraction

VALID = '{"items":[{"description":"Pizza","amount":12.5}],"total":12.5,"currency":"EUR"}'


def test_parse_valid():
    extraction = ReceiptExtraction.model_validate_json(VALID)
    assert len(extraction.items) == 1
    assert extraction.items[0].description == "Pizza"
    assert extraction.items[0].amount == 12.5
    assert extraction.currency == "EUR"


def test_parse_invalid_json_raises():
    with pytest.raises(ValidationError):
        ReceiptExtraction.model_validate_json("{no es json")


def test_parse_schema_mismatch_raises():
    with pytest.raises(ValidationError):
        ReceiptExtraction.model_validate_json('{"items":"esto no es una lista"}')


def test_parse_missing_items_defaults_empty():
    extraction = ReceiptExtraction.model_validate_json('{"total":10.0,"currency":"EUR"}')
    assert extraction.items == []
    assert extraction.total == 10.0
