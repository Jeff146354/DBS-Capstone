"""
Prediction router for the Spendly ML API.

Uses Keras models for real inference with a graceful fallback to rule-based
stub logic when models are unavailable or SPENDLY_USE_MODELS=0 is set.
"""
import logging
import os
from datetime import date, timedelta

from fastapi import APIRouter

from ..schemas.prediction import (
    SpendingRequest,
    SpendingResponse,
    StatusRequest,
    StatusResponse,
)

logger = logging.getLogger(__name__)
router = APIRouter(tags=["predictions"])

# Cached availability flag — None means "not yet checked"
_models_available: bool | None = None


def _check_models() -> bool:
    """
    Returns True if ML models + scalers are loadable.
    Set SPENDLY_USE_MODELS=0 to force fallback (useful for tests).
    """
    global _models_available

    if os.environ.get("SPENDLY_USE_MODELS", "1") == "0":
        return False

    if _models_available is not None:
        return _models_available

    try:
        from ..models import get_lstm_model, get_classifier_model, get_scaler_lstm, get_scaler_clf
        _models_available = True
    except Exception as exc:
        logger.warning("ML models not available, using fallback logic: %s", exc)
        _models_available = False

    return _models_available


# ─────────────────────────────────────────────────────────────────────────────
# Endpoints
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/spending", response_model=SpendingResponse)
def predict_spending(req: SpendingRequest) -> SpendingResponse:
    """
    Predict total spending for the next calendar month.

    Accepts a sequence of 7 transaction snapshots (oldest → newest).
    Uses the LSTM model when available; falls back to a simple projection.
    """
    # Calculate next month string (YYYY-MM)
    today = date.today()
    first_of_next_month = (today.replace(day=1) + timedelta(days=32)).replace(day=1)
    next_month_str = first_of_next_month.strftime("%Y-%m")

    if _check_models():
        try:
            from ..models import predict_spending as ml_predict
            sequence_dicts = [row.model_dump() for row in req.sequence]
            predicted = int(ml_predict(sequence_dicts))
        except Exception as exc:
            logger.error("LSTM prediction failed, using fallback: %s", exc)
            predicted = _fallback_spending(req)
    else:
        predicted = _fallback_spending(req)

    return SpendingResponse(
        predicted_amount=max(1, predicted),
        currency="IDR",
        month=next_month_str,
    )


@router.post("/status", response_model=StatusResponse)
def predict_status(req: StatusRequest) -> StatusResponse:
    """
    Classify the user's current financial status as AMAN, HATI-HATI, or BOROS.

    Accepts a single transaction snapshot with all 12 engineered features.
    Uses the classifier model when available; falls back to ratio-based rules.
    """
    if _check_models():
        try:
            from ..models import predict_status as ml_predict
            status, confidence = ml_predict(req.model_dump())
            reason = _generate_reason(status, req.spending_ratio)
        except Exception as exc:
            logger.error("Classifier prediction failed, using fallback: %s", exc)
            status, confidence, reason = _fallback_status(req)
    else:
        status, confidence, reason = _fallback_status(req)

    return StatusResponse(status=status, confidence=confidence, reason=reason)


# ─────────────────────────────────────────────────────────────────────────────
# Fallback (rule-based) logic
# ─────────────────────────────────────────────────────────────────────────────

def _fallback_spending(req: SpendingRequest) -> int:
    """Project last window's monthly expense forward by 5%."""
    last = req.sequence[-1]
    return max(1, int(last.cum_expense_monthly * 1.05))


def _fallback_status(req: StatusRequest) -> tuple[str, float, str]:
    """Classify based on spending_ratio."""
    ratio = req.spending_ratio
    if ratio <= 0.7:
        return "AMAN", 0.90, "Pengeluaran masih dalam batas aman (≤70% anggaran)."
    elif ratio <= 0.9:
        return "HATI-HATI", 0.75, "Pengeluaran mendekati batas bulanan (70–90% anggaran)."
    else:
        return "BOROS", 0.85, "Pengeluaran melebihi 90% anggaran bulan ini."


def _generate_reason(status: str, spending_ratio: float) -> str:
    """Human-readable reason based on model classification and spending ratio."""
    pct = int(spending_ratio * 100)
    reasons = {
        "AMAN": f"Pengeluaran Anda ({pct}% dari anggaran) masih dalam batas aman.",
        "HATI-HATI": f"Pengeluaran Anda ({pct}% dari anggaran) mendekati batas bulanan. Perhatikan pengeluaran.",
        "BOROS": f"Pengeluaran Anda ({pct}% dari anggaran) sudah melebihi batas wajar. Kurangi pengeluaran.",
    }
    return reasons.get(status, "Status keuangan tidak dapat ditentukan.")
