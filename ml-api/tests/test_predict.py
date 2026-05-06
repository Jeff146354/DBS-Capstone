"""
Feature: spendly-backend-integration
Property 11: Spending prediction response shape and value constraints
Property 12: Status prediction response shape and value constraints
Property 13: Invalid ML API request returns HTTP 422
"""
import re
import sys
import os

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
# Property 11: Spending prediction response shape and value constraints
# ─────────────────────────────────────────────────────────────────────────────

@settings(max_examples=100)
@given(
    user_id=st.text(min_size=1, max_size=50),
    current_spending=st.integers(min_value=0, max_value=10_000_000),
)
def test_p11_spending_prediction_shape(user_id, current_spending):
    """
    Feature: spendly-backend-integration, Property 11:
    Spending prediction response shape and value constraints.
    """
    response = client.post(
        '/predict/spending',
        json={'user_id': user_id, 'current_spending': current_spending},
    )
    assert response.status_code == 200
    data = response.json()

    # predicted_amount must be a positive integer
    assert isinstance(data['predicted_amount'], int)
    assert data['predicted_amount'] > 0

    # currency must be IDR
    assert data['currency'] == 'IDR'

    # month must match YYYY-MM format
    assert MONTH_PATTERN.match(data['month']), f"month '{data['month']}' does not match YYYY-MM"


# ─────────────────────────────────────────────────────────────────────────────
# Property 12: Status prediction response shape and value constraints
# ─────────────────────────────────────────────────────────────────────────────

@settings(max_examples=100)
@given(
    user_id=st.text(min_size=1, max_size=50),
    current_spending=st.integers(min_value=0, max_value=10_000_000),
    monthly_income=st.integers(min_value=0, max_value=20_000_000),
)
def test_p12_status_prediction_shape(user_id, current_spending, monthly_income):
    """
    Feature: spendly-backend-integration, Property 12:
    Status prediction response shape and value constraints.
    """
    response = client.post(
        '/predict/status',
        json={
            'user_id': user_id,
            'current_spending': current_spending,
            'monthly_income': monthly_income,
        },
    )
    assert response.status_code == 200
    data = response.json()

    # status must be one of the three valid values
    assert data['status'] in VALID_STATUSES

    # confidence must be between 0.0 and 1.0 inclusive
    assert isinstance(data['confidence'], float)
    assert 0.0 <= data['confidence'] <= 1.0

    # reason must be a non-empty string
    assert isinstance(data['reason'], str)
    assert len(data['reason']) > 0


# ─────────────────────────────────────────────────────────────────────────────
# Property 13: Invalid ML API request returns HTTP 422
# ─────────────────────────────────────────────────────────────────────────────

def test_p13_spending_missing_user_id_returns_422():
    """
    Feature: spendly-backend-integration, Property 13:
    Invalid ML API request returns HTTP 422.
    """
    response = client.post('/predict/spending', json={'current_spending': 1000000})
    assert response.status_code == 422
    assert 'detail' in response.json()


def test_p13_spending_missing_current_spending_returns_422():
    """
    Feature: spendly-backend-integration, Property 13:
    Invalid ML API request returns HTTP 422.
    """
    response = client.post('/predict/spending', json={'user_id': 'user-demo-001'})
    assert response.status_code == 422
    assert 'detail' in response.json()


def test_p13_spending_wrong_type_returns_422():
    """
    Feature: spendly-backend-integration, Property 13:
    Invalid ML API request returns HTTP 422.
    """
    response = client.post(
        '/predict/spending',
        json={'user_id': 'user-demo-001', 'current_spending': 'not-a-number'},
    )
    assert response.status_code == 422


def test_p13_status_missing_fields_returns_422():
    """
    Feature: spendly-backend-integration, Property 13:
    Invalid ML API request returns HTTP 422.
    """
    response = client.post('/predict/status', json={'user_id': 'user-demo-001'})
    assert response.status_code == 422
    assert 'detail' in response.json()


def test_p13_status_wrong_type_returns_422():
    """
    Feature: spendly-backend-integration, Property 13:
    Invalid ML API request returns HTTP 422.
    """
    response = client.post(
        '/predict/status',
        json={
            'user_id': 'user-demo-001',
            'current_spending': 'not-a-number',
            'monthly_income': 5000000,
        },
    )
    assert response.status_code == 422
