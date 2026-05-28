"""
Prediction router for the Spendly ML API.
No fallback logic — errors are raised explicitly for easy debugging.
"""
import logging
import os
import time

import httpx
from datetime import date, timedelta
from fastapi import APIRouter, HTTPException

from ..schemas.prediction import (
    SpendingRequest,
    SpendingResponse,
    StatusRequest,
    StatusResponse,
    InsightsRequest,
    InsightsResponse,
)

logger = logging.getLogger(__name__)
router = APIRouter(tags=["predictions"])

# ── Per-user rate limit: max 1 insight request per 60 seconds ────────────────
_insight_last_called: dict[str, float] = {}
INSIGHT_COOLDOWN_SECONDS = 60


def _get_models():
    """Load and return models. Raises 503 if unavailable."""
    if os.environ.get("SPENDLY_USE_MODELS", "1") == "0":
        raise HTTPException(status_code=503, detail="ML models disabled (SPENDLY_USE_MODELS=0)")
    try:
        from ..models import get_lstm_model, get_classifier_model, get_scaler_lstm, get_scaler_clf
        return get_lstm_model, get_classifier_model, get_scaler_lstm, get_scaler_clf
    except Exception as exc:
        logger.error("Failed to load ML models: %s", exc)
        raise HTTPException(status_code=503, detail=f"ML models failed to load: {exc}")


# ─────────────────────────────────────────────────────────────────────────────
# POST /predict/spending
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/spending", response_model=SpendingResponse)
def predict_spending(req: SpendingRequest) -> SpendingResponse:
    """Predict next month's spending using the LSTM model."""
    _get_models()  # raises 503 if models unavailable

    try:
        from ..models import predict_spending as ml_predict
        sequence_dicts = [row.model_dump() for row in req.sequence]
        predicted = int(ml_predict(sequence_dicts))
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("LSTM prediction error: %s", exc)
        raise HTTPException(status_code=500, detail=f"LSTM prediction failed: {exc}")

    today = date.today()
    next_month = (today.replace(day=1) + timedelta(days=32)).replace(day=1)

    return SpendingResponse(
        predicted_amount=max(1, predicted),
        currency="IDR",
        month=next_month.strftime("%Y-%m"),
    )


# ─────────────────────────────────────────────────────────────────────────────
# POST /predict/status
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/status", response_model=StatusResponse)
def predict_status(req: StatusRequest) -> StatusResponse:
    """Classify financial status as AMAN, HATI-HATI, or BOROS."""
    _get_models()  # raises 503 if models unavailable

    try:
        from ..models import predict_status as ml_predict
        status, confidence = ml_predict(req.model_dump())
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Classifier prediction error: %s", exc)
        raise HTTPException(status_code=500, detail=f"Classifier prediction failed: {exc}")

    pct = int(req.spending_ratio * 100)
    reasons = {
        "AMAN":      f"Pengeluaran Anda ({pct}% dari anggaran) masih dalam batas aman.",
        "HATI-HATI": f"Pengeluaran Anda ({pct}% dari anggaran) mendekati batas bulanan.",
        "BOROS":     f"Pengeluaran Anda ({pct}% dari anggaran) melebihi batas wajar.",
    }

    return StatusResponse(
        status=status,
        confidence=confidence,
        reason=reasons.get(status, "Status tidak diketahui."),
    )


# ─────────────────────────────────────────────────────────────────────────────
# POST /predict/insights  — OpenRouter Gen-AI
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/insights", response_model=InsightsResponse)
async def predict_insights(req: InsightsRequest) -> InsightsResponse:
    """
    Generate personalised financial advice using OpenRouter API.
    Requires OPENROUTER_API_KEY environment variable.
    Uses meta-llama/llama-3.3-70b-instruct:free (free tier, no billing needed).
    """
    api_key = os.environ.get("OPENROUTER_API_KEY", "")
    if not api_key:
        raise HTTPException(status_code=503, detail="OPENROUTER_API_KEY not configured.")

    # Per-user rate limit
    user_key = req.user_name
    now = time.time()
    last = _insight_last_called.get(user_key, 0)
    wait = INSIGHT_COOLDOWN_SECONDS - (now - last)
    if wait > 0:
        raise HTTPException(
            status_code=429,
            detail=f"Terlalu banyak permintaan. Coba lagi dalam {int(wait)} detik."
        )
    _insight_last_called[user_key] = now

    prompt = f"""Kamu adalah Spendly AI, asisten keuangan personal yang cerdas, empatik, dan to-the-point.
Kamu berbicara dalam Bahasa Indonesia yang ramah namun profesional.
Kamu TIDAK boleh memberikan saran investasi saham atau aset berisiko tinggi.

---
DATA KEUANGAN PENGGUNA: {req.user_name}
---
📅 Kondisi Keuangan Hari Ini:
- Budget bulanan              : Rp {req.month_budget:,.0f}
- Total pengeluaran bulan ini : Rp {req.cum_monthly:,.0f}
- Sisa budget saat ini        : Rp {req.current_budget_rem:,.0f}
- Spending ratio hari ini     : {req.spending_ratio_now * 100:.1f}% dari budget

🤖 Hasil Prediksi Model AI:
- Status keuangan saat ini: {req.label.upper()} (confidence: {req.confidence * 100:.1f}%)
  • Probabilitas Aman      : {req.prob_aman * 100:.1f}%
  • Probabilitas Hati-hati : {req.prob_hati_hati * 100:.1f}%
  • Probabilitas Boros     : {req.prob_boros * 100:.1f}%
- Prediksi pengeluaran bulan depan : Rp {req.pred_rupiah:,.0f} ({req.pred_ratio * 100:.1f}% dari budget)
- Estimasi sisa budget bulan depan : Rp {req.sisa_budget:,.0f}

---
TUGASMU — Berikan respons dalam format PERSIS berikut (gunakan markdown):

## 🔍 Analisis Kondisi Keuangan
[2-3 kalimat analisis kondisi {req.user_name} saat ini berdasarkan data di atas.
Sebutkan status, confidence model, dan apa artinya secara praktis.]

## 📊 Proyeksi Bulan Depan
[2-3 kalimat tentang prediksi pengeluaran bulan depan.
Apakah perlu waspada? Apakah tren membaik atau memburuk?]

## 💡 Tips Keuangan Personal (3 Tips Spesifik)
1. **[Judul Tip 1]**: [Penjelasan konkret, spesifik ke kondisi {req.user_name}]
2. **[Judul Tip 2]**: [Penjelasan konkret]
3. **[Judul Tip 3]**: [Penjelasan konkret]

## ✅ Tindakan Prioritas Hari Ini
[1 kalimat tindakan paling penting yang harus dilakukan {req.user_name} SEKARANG.]

Pastikan nada: hangat, tidak menghakimi, dan memotivasi."""

    url = "https://openrouter.ai/api/v1/chat/completions"
    payload = {
        "model": "google/gemma-3-12b-it:free",
        "messages": [{"role": "user", "content": prompt}],
        "max_tokens": 700,
        "temperature": 0.4,
    }
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://dbs-capstone-deploy.vercel.app",
        "X-Title": "Spendly AI",
    }

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(url, json=payload, headers=headers)
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="OpenRouter API timeout.")
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"OpenRouter API request failed: {exc}")

    if resp.status_code != 200:
        raise HTTPException(
            status_code=502,
            detail=f"OpenRouter API error {resp.status_code}: {resp.text[:300]}",
        )

    try:
        result = resp.json()
        text = result["choices"][0]["message"]["content"].strip()
    except (KeyError, IndexError) as exc:
        raise HTTPException(status_code=502, detail=f"Unexpected OpenRouter response shape: {exc}")

    return InsightsResponse(insight=text)
