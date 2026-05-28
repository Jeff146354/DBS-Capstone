"""
Pydantic schemas for the Spendly ML prediction API.

Both models share the same 12 feature columns derived from transaction data:
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

    amount: float = Field(..., ge=0, description="Transaction amount in IDR")
    week_of_month: float = Field(..., ge=1, le=5, description="Week number within the month (1–5)")
    day_of_month: float = Field(..., ge=1, le=31, description="Day of the month (1–31)")
    month_budget: float = Field(..., ge=0, description="Total monthly budget in IDR")
    daily_budget: float = Field(..., ge=0, description="Daily budget allocation in IDR")
    cum_expense_daily: float = Field(..., ge=0, description="Cumulative expense for the current day in IDR")
    cum_expense_monthly: float = Field(..., ge=0, description="Cumulative expense for the current month in IDR")
    current_budget: float = Field(..., description="Remaining budget this month (can be negative)")
    spending_ratio: float = Field(..., description="cum_expense_monthly / month_budget")
    trx_frequency: float = Field(..., ge=0, description="Number of transactions today")
    rolling_avg_7d: float = Field(..., ge=0, description="7-day rolling average of daily expense in IDR")
    expense_acceleration: float = Field(..., description="Change in daily expense vs previous day in IDR")


# ─────────────────────────────────────────────────────────────────────────────
# Status classification (Classifier model)
# ─────────────────────────────────────────────────────────────────────────────

class StatusRequest(TransactionFeatures):
    """Request body for POST /predict/status — single transaction snapshot."""
    pass


class StatusResponse(BaseModel):
    status: Literal["AMAN", "HATI-HATI", "BOROS"]
    confidence: float = Field(..., ge=0.0, le=1.0)
    reason: str


# ─────────────────────────────────────────────────────────────────────────────
# Spending forecast (LSTM model)
# ─────────────────────────────────────────────────────────────────────────────

class SpendingRequest(BaseModel):
    """
    Request body for POST /predict/spending.
    Requires a sequence of exactly 7 transaction snapshots (oldest → newest).
    """
    sequence: list[TransactionFeatures] = Field(
        ...,
        min_length=7,
        max_length=7,
        description="Exactly 7 consecutive transaction snapshots for LSTM input",
    )


class SpendingResponse(BaseModel):
    predicted_amount: int = Field(..., gt=0, description="Predicted next-month spending in IDR")
    currency: str = Field(default="IDR")
    month: str = Field(..., description="Target month in YYYY-MM format")


# ─────────────────────────────────────────────────────────────────────────────
# Gemini AI Insights
# ─────────────────────────────────────────────────────────────────────────────

class InsightsRequest(BaseModel):
    user_name: str
    month_budget: float = Field(..., ge=0)
    cum_monthly: float = Field(..., ge=0)
    current_budget_rem: float
    spending_ratio_now: float
    label: str                    # AMAN / HATI-HATI / BOROS
    confidence: float = Field(..., ge=0.0, le=1.0)
    prob_aman: float = Field(..., ge=0.0, le=1.0)
    prob_hati_hati: float = Field(..., ge=0.0, le=1.0)
    prob_boros: float = Field(..., ge=0.0, le=1.0)
    pred_rupiah: float = Field(..., ge=0)
    pred_ratio: float
    sisa_budget: float


class InsightsResponse(BaseModel):
    insight: str   # markdown text from Gemini
