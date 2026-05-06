"""
Feature: spendly-backend-integration
Unit tests for FastAPI health endpoint and known-good prediction examples.
"""
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health_returns_ok():
    """GET /health returns { status: ok }"""
    response = client.get('/health')
    assert response.status_code == 200
    assert response.json() == {'status': 'ok'}


def test_predict_spending_known_good():
    """POST /predict/spending with known payload returns expected shape."""
    response = client.post(
        '/predict/spending',
        json={'user_id': 'user-demo-001', 'current_spending': 1_000_000},
    )
    assert response.status_code == 200
    data = response.json()
    assert data['predicted_amount'] == 1_050_000  # 1_000_000 * 1.05
    assert data['currency'] == 'IDR'
    assert len(data['month']) == 7  # YYYY-MM


def test_predict_status_aman():
    """Spending <= 70% of income -> AMAN."""
    response = client.post(
        '/predict/status',
        json={
            'user_id': 'user-demo-001',
            'current_spending': 3_000_000,
            'monthly_income': 5_000_000,
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data['status'] == 'AMAN'
    assert data['confidence'] == 0.90


def test_predict_status_hati_hati():
    """Spending between 70% and 90% of income -> HATI-HATI."""
    response = client.post(
        '/predict/status',
        json={
            'user_id': 'user-demo-001',
            'current_spending': 4_000_000,
            'monthly_income': 5_000_000,
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data['status'] == 'HATI-HATI'
    assert data['confidence'] == 0.75


def test_predict_status_boros():
    """Spending > 90% of income -> BOROS."""
    response = client.post(
        '/predict/status',
        json={
            'user_id': 'user-demo-001',
            'current_spending': 4_800_000,
            'monthly_income': 5_000_000,
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data['status'] == 'BOROS'
    assert data['confidence'] == 0.85


def test_predict_status_zero_income():
    """Zero income -> BOROS (ratio = 1.0)."""
    response = client.post(
        '/predict/status',
        json={
            'user_id': 'user-demo-001',
            'current_spending': 100_000,
            'monthly_income': 0,
        },
    )
    assert response.status_code == 200
    assert response.json()['status'] == 'BOROS'
