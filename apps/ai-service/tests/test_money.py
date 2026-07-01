"""Conversión de importes a céntimos (sin ruido de coma flotante)."""

import pytest

from app.models import to_cents


@pytest.mark.parametrize(
    ("amount", "expected"),
    [
        (12.5, 1250),
        (12.49, 1249),
        (0.05, 5),
        (100, 10000),
        ("3.30", 330),
        (0, 0),
        (1.005, 101),  # redondeo HALF_UP
        (9.999, 1000),
    ],
)
def test_to_cents(amount, expected):
    assert to_cents(amount) == expected
