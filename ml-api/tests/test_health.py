"""
Feature: spendly-backend-integration
Unit tests for FastAPI health endpoint and known-good prediction examples.
These tests use the fallback (stub) logic by disabling ML models.
"""
import sys
import os

# Disable ML models for deterministic test results
os.environ["SPENDLY_USE_MODELS"] = "0"

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

# ─────────────────────────────────────────────────────────────────────────────
# Shared test fixtures
# ─────────────────────────────────────────────────────────────────────────────

def make_features(**overrides) -> dict:
    """Return a valid TransactionFeatures dict with sensible defaults."""
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
    """Return a valid SpendingRequest dict (7-item sequence)."""
    return {"sequence": [make_features(**overrides) for _ in range(7)]}


# ─────────────────────────────────────────────────────────────────────────────
# Health
# ─────────────────────────────────────────────────────────────────────────────

def test_health_returns_ok():
    """GET /health returns { status: ok }"""
    response = client.get('/health')
    assert response.status_code == 200
    assert response.json() == {'status': 'ok'}


# ─────────────────────────────────────────────────────────────────────────────
# Status prediction (fallback)
# ─────────────────────────────────────────────────────────────────────────────

def test_predict_status_aman():
    """spending_ratio <= 0.7 -> AMAN (fallback)."""
    response = client.post('/predict/status', json=make_features(
        cum_expense_monthly=2_000_000.0,
        current_budget=1_000_000.0,
        spending_ratio=0.50,
    ))
    assert response.status_code == 200
    data = response.json()
    assert data['status'] == 'AMAN'
    assert data['confidence'] == 0.90


def test_predict_status_hati_hati():
    """spending_ratio between 0.7 and 0.9 -> HATI-HATI (fallback)."""
    response = client.post('/predict/status', json=make_features(
        cum_expense_monthly=2_400_000.0,
        current_budget=600_000.0,
        spending_ratio=0.80,
    ))
    assert response.status_code == 200
    data = response.json()
    assert data['status'] == 'HATI-HATI'
    assert data['confidence'] == 0.75


def test_predict_status_boros():
    """spending_ratio > 0.9 -> BOROS (fallback)."""
    response = client.post('/predict/status', json=make_features(
        cum_expense_monthly=2_850_000.0,
        current_budget=150_000.0,
        spending_ratio=0.95,
    ))
    assert response.status_code == 200
    data = response.json()
    assert data['status'] == 'BOROS'
    assert data['confidence'] == 0.85


# ─────────────────────────────────────────────────────────────────────────────
# Spending forecast (fallback)
# ─────────────────────────────────────────────────────────────────────────────

def test_predict_spending_shape():
    """POST /predict/spending returns correct shape."""
    response = client.post('/predict/spending', json=make_sequence())
    assert response.status_code == 200
    data = response.json()
    assert data['predicted_amount'] > 0
    assert data['currency'] == 'IDR'
    assert len(data['month']) == 7  # YYYY-MM


def test_predict_spending_fallback_value():
    """Fallback: predicted = last cum_expense_monthly * 1.05."""
    response = client.post('/predict/spending', json=make_sequence(
        cum_expense_monthly=1_000_000.0,
    ))
    assert response.status_code == 200
    assert response.json()['predicted_amount'] == 1_050_000
