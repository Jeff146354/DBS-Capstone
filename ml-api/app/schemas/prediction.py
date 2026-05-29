"""
Pydantic schemas for the Spendly ML prediction API.

Both models share the same 12 feature columns:
    amount, week_of_month, day_of_month, month_budget, daily_budget,
    cum_expense_daily, cum_expense_monthly, current_budget, spending_ratio,
    trx_frequency, rolling_avg_7d, expense_acceleration
"""
from typing import Literal
from pydantic import BaseModel, Field


# ─────────────────────────────────────────────────────────────────────────────
# Shared feature schema (one transaction row)
# ─────────────────────────────────────────────────────────────────────────────

class TransactionFeatures(BaseModel):
    """12 engineered features for a single transaction/day."""

    amount: float = Field(..., ge=0)
    week_of_month: float = Field(..., ge=1, le=5)
    day_of_month: float = Field(..., ge=1, le=31)
    month_budget: float = Field(..., ge=0)
    daily_budget: float = Field(..., ge=0)
    cum_expense_daily: float = Field(..., ge=0)
    cum_expense_monthly: float = Field(..., ge=0)
    current_budget: float = Field(...)
    spending_ratio: float = Field(...)
    trx_frequency: float = Field(..., ge=0)
    rolling_avg_7d: float = Field(..., ge=0)
    expense_acceleration: float = Field(...)


# ─────────────────────────────────────────────────────────────────────────────
# Status classification (Classifier model)
# ─────────────────────────────────────────────────────────────────────────────

class StatusRequest(TransactionFeatures):
    pass


class StatusResponse(BaseModel):
    status: Literal["AMAN", "HATI-HATI", "BOROS"]
    confidence: float = Field(..., ge=0.0, le=1.0)
    reason: str


# ─────────────────────────────────────────────────────────────────────────────
# Spending forecast (LSTM model)
# ─────────────────────────────────────────────────────────────────────────────

class SpendingRequest(BaseModel):
    """Requires exactly 7 transaction snapshots (oldest → newest)."""
    sequence: list[TransactionFeatures] = Field(..., min_length=7, max_length=7)


class SpendingResponse(BaseModel):
    predicted_amount: int = Field(..., gt=0)
    currency: str = Field(default="IDR")
    month: str


# ─────────────────────────────────────────────────────────────────────────────
# AI Insights
# ─────────────────────────────────────────────────────────────────────────────

class InsightsRequest(BaseModel):
    user_name: str
    month_budget: float = Field(..., ge=0)
    cum_monthly: float = Field(..., ge=0)
    current_budget_rem: float
    spending_ratio_now: float
    label: str
    confidence: float = Field(..., ge=0.0, le=1.0)
    prob_aman: float = Field(..., ge=0.0, le=1.0)
    prob_hati_hati: float = Field(..., ge=0.0, le=1.0)
    prob_boros: float = Field(..., ge=0.0, le=1.0)
    pred_rupiah: float = Field(..., ge=0)
    pred_ratio: float
    sisa_budget: float


class InsightsResponse(BaseModel):
    insight: str
