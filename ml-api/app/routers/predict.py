"""
Prediction router for the Spendly ML API.
No fallback logic — errors are raised explicitly for easy debugging.
"""
import hashlib
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

# ── Per-user insight cache ────────────────────────────────────────────────────
# Stores the last successful LLM response keyed by (user + financial fingerprint).
# When all models are rate-limited, serves the cached real AI output instead of
# erroring. Cache expires after 6 hours or when financial state changes.
_insight_cache: dict[str, tuple[float, str]] = {}  # key -> (timestamp, insight_text)
INSIGHT_CACHE_TTL_SECONDS = 6 * 3600  # 6 hours


def _insight_cache_key(req: InsightsRequest) -> str:
    """Fingerprint the request by user + financial state (rounded to reduce
    cache misses from tiny floating-point differences between page loads)."""
    fingerprint = (
        f"{req.user_name}"
        f"|budget={round(req.month_budget / 10000) * 10000}"    # nearest 10k IDR
        f"|cum={round(req.cum_monthly / 10000) * 10000}"
        f"|ratio={round(req.spending_ratio_now * 20) / 20}"     # nearest 5%
        f"|label={req.label}"
        f"|pred={round(req.pred_rupiah / 10000) * 10000}"
    )
    return hashlib.md5(fingerprint.encode()).hexdigest()


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
# POST /predict/insights  — Gemini first, OpenRouter fallback
# ─────────────────────────────────────────────────────────────────────────────

# OpenRouter free models tried if Gemini fails (429, 503, or any error).
_OPENROUTER_FREE_MODELS = [
    "meta-llama/llama-3.3-70b-instruct:free",
    "deepseek/deepseek-v4-flash:free",
    "google/gemma-4-26b-a4b-it:free",
    "qwen/qwen3-next-80b-a3b-instruct:free",
]

# Gemini status codes that mean "try fallback" vs "real error"
_GEMINI_RETRYABLE = {429, 500, 503}


async def _call_gemini(prompt: str, api_key: str, client: httpx.AsyncClient) -> str | None:
    """
    Call Gemini 3.1 Flash-Lite. Returns the text on success.
    Returns None on retryable errors (429/500/503) so caller can fall back.
    Raises HTTPException on non-retryable errors (400, 401, 404, etc.).
    """
    url = (
        "https://generativelanguage.googleapis.com/v1beta/models"
        f"/gemini-3.1-flash-lite:generateContent?key={api_key}"
    )
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"maxOutputTokens": 700, "temperature": 0.4},
    }
    try:
        resp = await client.post(url, json=payload)
    except httpx.TimeoutException:
        logger.warning("Gemini timeout — falling back to OpenRouter")
        return None

    if resp.status_code in _GEMINI_RETRYABLE:
        body = resp.json()
        msg = body.get("error", {}).get("message", resp.text[:120])
        logger.warning("Gemini skipped (%s): %s", resp.status_code, msg)
        return None

    if resp.status_code != 200:
        body = resp.json()
        msg = body.get("error", {}).get("message", resp.text[:200])
        raise HTTPException(
            status_code=502,
            detail=f"Gemini API error {resp.status_code}: {msg}",
        )

    try:
        text = resp.json()["candidates"][0]["content"]["parts"][0]["text"].strip()
        logger.info("Gemini succeeded")
        return text
    except (KeyError, IndexError) as exc:
        raise HTTPException(status_code=502, detail=f"Unexpected Gemini response shape: {exc}")


async def _call_openrouter(prompt: str, api_key: str, client: httpx.AsyncClient) -> str:
    """
    Try each OpenRouter free model in order. Returns text on first success.
    Raises HTTPException if all models are exhausted.
    """
    url = "https://openrouter.ai/api/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://dbs-capstone-deploy.vercel.app",
        "X-Title": "Spendly AI",
    }
    skipped: list[str] = []

    for model in _OPENROUTER_FREE_MODELS:
        payload = {
            "model": model,
            "messages": [{"role": "user", "content": prompt}],
            "max_tokens": 700,
            "temperature": 0.4,
        }
        try:
            resp = await client.post(url, json=payload, headers=headers)
        except httpx.TimeoutException:
            raise HTTPException(status_code=504, detail=f"OpenRouter timeout on model {model}.")
        except Exception as exc:
            raise HTTPException(status_code=502, detail=f"OpenRouter request failed: {exc}")

        if resp.status_code in (429, 404):
            reason = resp.json().get("error", {}).get("message", resp.text[:120])
            logger.warning("OpenRouter model %s skipped (%s): %s", model, resp.status_code, reason)
            skipped.append(f"{model} [{resp.status_code}]: {reason}")
            continue

        if resp.status_code != 200:
            raise HTTPException(
                status_code=502,
                detail=f"OpenRouter error {resp.status_code} on {model}: {resp.text[:300]}",
            )

        try:
            text = resp.json()["choices"][0]["message"]["content"].strip()
            if skipped:
                logger.info("OpenRouter used %s after skipping: %s", model, "; ".join(skipped))
            return text
        except (KeyError, IndexError) as exc:
            raise HTTPException(status_code=502, detail=f"Unexpected OpenRouter response from {model}: {exc}")

    raise HTTPException(
        status_code=502,
        detail=f"All OpenRouter models rate-limited. Tried: {'; '.join(skipped)}",
    )


@router.post("/insights", response_model=InsightsResponse)
async def predict_insights(req: InsightsRequest) -> InsightsResponse:
    """
    Generate personalised financial advice.
    Strategy: Gemini 3.1 Flash-Lite first → OpenRouter free models fallback.
    Requires GEMINI_API_KEY and/or OPENROUTER_API_KEY environment variables.
    Caches successful responses per user+financial-state for 6 hours.
    """
    gemini_key = os.environ.get("GEMINI_API_KEY", "")
    openrouter_key = os.environ.get("OPENROUTER_API_KEY", "")

    if not gemini_key and not openrouter_key:
        raise HTTPException(status_code=503, detail="No AI API keys configured (GEMINI_API_KEY or OPENROUTER_API_KEY).")

    cache_key = _insight_cache_key(req)
    now = time.time()

    # ── Serve from cache if still fresh ──────────────────────────────────────
    cached = _insight_cache.get(cache_key)
    if cached:
        cached_at, cached_text = cached
        age = now - cached_at
        if age < INSIGHT_CACHE_TTL_SECONDS:
            logger.info("Serving cached insight for %s (age %.0fs)", req.user_name, age)
            return InsightsResponse(insight=cached_text)
        del _insight_cache[cache_key]

    # ── Per-user rate limit ───────────────────────────────────────────────────
    user_key = req.user_name
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

    async with httpx.AsyncClient(timeout=30.0) as client:
        text: str | None = None

        # ── 1. Try Gemini first ───────────────────────────────────────────────
        if gemini_key:
            text = await _call_gemini(prompt, gemini_key, client)

        # ── 2. Fall back to OpenRouter if Gemini failed or not configured ─────
        if text is None:
            if not openrouter_key:
                raise HTTPException(
                    status_code=503,
                    detail="Gemini unavailable and OPENROUTER_API_KEY not configured.",
                )
            logger.info("Falling back to OpenRouter for %s", req.user_name)
            text = await _call_openrouter(prompt, openrouter_key, client)

    _insight_cache[cache_key] = (time.time(), text)
    logger.info("Cached insight for %s (key=%s)", req.user_name, cache_key[:8])
    return InsightsResponse(insight=text)
