"""
Prediction router for the Spendly ML API.
All prediction logic is currently stubbed — replace TODO sections with real model inference.
"""
from datetime import date, timedelta
from typing import Annotated

from fastapi import APIRouter
from ..schemas.prediction import (
    SpendingRequest,
    SpendingResponse,
    StatusRequest,
    StatusResponse,
)

router = APIRouter(tags=["predictions"])


@router.post("/spending", response_model=SpendingResponse)
def predict_spending(req: SpendingRequest) -> SpendingResponse:
    """
    Predict total spending for the next calendar month.
    """
    # TODO: replace with model.predict(input_features)
    # Stub: project current spending forward by 5%
    predicted = max(1, int(req.current_spending * 1.05))

    # Calculate next month string (YYYY-MM)
    today = date.today()
    first_of_this_month = today.replace(day=1)
    first_of_next_month = first_of_this_month + timedelta(days=32)
    next_month_str = first_of_next_month.strftime("%Y-%m")

    return SpendingResponse(
        predicted_amount=predicted,
        currency="IDR",
        month=next_month_str,
    )


@router.post("/status", response_model=StatusResponse)
def predict_status(req: StatusRequest) -> StatusResponse:
    """
    Classify the user's current financial status as AMAN, HATI-HATI, or BOROS.
    """
    # TODO: replace with model.predict(input_features)
    # Stub: classify based on spending-to-income ratio
    if req.monthly_income <= 0:
        ratio = 1.0
    else:
        ratio = req.current_spending / req.monthly_income

    if ratio <= 0.7:
        status = "AMAN"
        confidence = 0.90
        reason = "Pengeluaran masih dalam batas aman (≤70% pendapatan)."
    elif ratio <= 0.9:
        status = "HATI-HATI"
        confidence = 0.75
        reason = "Pengeluaran mendekati batas bulanan (70–90% pendapatan)."
    else:
        status = "BOROS"
        confidence = 0.85
        reason = "Pengeluaran melebihi 90% pendapatan bulan ini."

    return StatusResponse(status=status, confidence=confidence, reason=reason)
