"""
Feature: spendly-backend-integration
Property 11: Spending prediction response shape and value constraints
Property 12: Status prediction response shape and value constraints
Property 13: Invalid ML API request returns HTTP 422
"""
import re
import sys
import os

# Disable ML models for deterministic test results
os.environ["SPENDLY_USE_MODELS"] = "0"

# Add the ml-api directory to the path so we can import app
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

import pytest
from fastapi.testclient import TestClient
from hypothesis import given, settings
from hypothesis import strategies as st

from app.main import app

client = TestClient(app)

MONTH_PATTERN = re.compile(r'^\d{4}-\d{2}$')
VALID_STATUSES = {'AMAN', 'HATI-HATI', 'BOROS'}


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def make_features(**overrides) -> dict:
    base = {
        "amount": 50000.0,
        "week_of_month": 1.0,
        "day_of_month": 5.0,
        "month_budget": 3000000.0,
        "daily_budget": 100000.0,
        "cum_expense_daily": 50000.0,
        "cum_expense_monthly": 240000.0,
        "current_budget": 2760000.0,
        "spending_ratio": 0.08,
        "trx_frequency": 2.0,
        "rolling_avg_7d": 48000.0,
        "expense_acceleration": 2000.0,
    }
    base.update(overrides)
    return base


def make_sequence(**overrides) -> dict:
    return {"sequence": [make_features(**overrides) for _ in range(7)]}


# ─────────────────────────────────────────────────────────────────────────────
# Property 11: Spending prediction response shape and value constraints
# ─────────────────────────────────────────────────────────────────────────────

@settings(max_examples=50)
@given(
    amount=st.floats(min_value=0, max_value=10_000_000, allow_nan=False, allow_infinity=False),
    spending_ratio=st.floats(min_value=0.0, max_value=2.0, allow_nan=False, allow_infinity=False),
)
def test_p11_spending_prediction_shape(amount, spending_ratio):
    """
    Feature: spendly-backend-integration, Property 11:
    Spending prediction response shape and value constraints.
    """
    response = client.post(
        '/predict/spending',
        json=make_sequence(amount=amount, spending_ratio=spending_ratio),
    )
    assert response.status_code == 200
    data = response.json()

    assert isinstance(data['predicted_amount'], int)
    assert data['predicted_amount'] > 0
    assert data['currency'] == 'IDR'
    assert MONTH_PATTERN.match(data['month']), f"month '{data['month']}' does not match YYYY-MM"


# ─────────────────────────────────────────────────────────────────────────────
# Property 12: Status prediction response shape and value constraints
# ─────────────────────────────────────────────────────────────────────────────

@settings(max_examples=50)
@given(
    amount=st.floats(min_value=0, max_value=10_000_000, allow_nan=False, allow_infinity=False),
    spending_ratio=st.floats(min_value=0.0, max_value=2.0, allow_nan=False, allow_infinity=False),
)
def test_p12_status_prediction_shape(amount, spending_ratio):
    """
    Feature: spendly-backend-integration, Property 12:
    Status prediction response shape and value constraints.
    """
    response = client.post(
        '/predict/status',
        json=make_features(amount=amount, spending_ratio=spending_ratio),
    )
    assert response.status_code == 200
    data = response.json()

    assert data['status'] in VALID_STATUSES
    assert isinstance(data['confidence'], float)
    assert 0.0 <= data['confidence'] <= 1.0
    assert isinstance(data['reason'], str)
    assert len(data['reason']) > 0


# ─────────────────────────────────────────────────────────────────────────────
# Property 13: Invalid ML API request returns HTTP 422
# ─────────────────────────────────────────────────────────────────────────────

def test_p13_status_missing_field_returns_422():
    """Missing a required feature field returns 422."""
    payload = make_features()
    del payload['amount']
    response = client.post('/predict/status', json=payload)
    assert response.status_code == 422
    assert 'detail' in response.json()


def test_p13_status_wrong_type_returns_422():
    """Non-numeric feature value returns 422."""
    response = client.post('/predict/status', json=make_features(amount='not-a-number'))
    assert response.status_code == 422


def test_p13_spending_wrong_sequence_length_returns_422():
    """Sequence with != 7 items returns 422."""
    response = client.post('/predict/spending', json={"sequence": [make_features()] * 5})
    assert response.status_code == 422


def test_p13_spending_missing_sequence_returns_422():
    """Missing sequence field returns 422."""
    response = client.post('/predict/spending', json={})
    assert response.status_code == 422


def test_p13_spending_wrong_type_in_sequence_returns_422():
    """Non-numeric value inside sequence returns 422."""
    seq = [make_features() for _ in range(7)]
    seq[3]['amount'] = 'bad'
    response = client.post('/predict/spending', json={"sequence": seq})
    assert response.status_code == 422
