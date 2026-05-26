"""
Spendly ML API — FastAPI application entry point.
Run with: uvicorn app.main:app --reload --port 8000
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routers import predict

app = FastAPI(
    title="Spendly ML API",
    description="Spending prediction and financial status classification for Spendly.",
    version="1.0.0",
)

# Allow requests from the Next.js frontend and Vite dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", tags=["health"])
def health() -> dict:
    """Health check endpoint."""
    return {"status": "ok"}


@app.get("/metrics", tags=["health"])
def metrics() -> dict:
    """Live memory and model usage stats."""
    import os
    import psutil

    process = psutil.Process(os.getpid())
    mem = process.memory_info()
    vm  = psutil.virtual_memory()

    return {
        "process": {
            "rss_mb":  round(mem.rss  / 1024 / 1024, 1),   # actual RAM used by this process
            "vms_mb":  round(mem.vms  / 1024 / 1024, 1),   # virtual memory
        },
        "system": {
            "total_mb":     round(vm.total     / 1024 / 1024, 1),
            "available_mb": round(vm.available / 1024 / 1024, 1),
            "used_mb":      round(vm.used      / 1024 / 1024, 1),
            "percent":      vm.percent,
        },
        "models_enabled": os.environ.get("SPENDLY_USE_MODELS", "1") != "0",
    }


@app.get("/models/info", tags=["health"])
def models_info() -> dict:
    """Check which ML models are loaded and available."""
    import os
    from pathlib import Path

    models_dir = Path(__file__).resolve().parent.parent / "models"
    lstm_exists = (models_dir / "spendly_LSTM.keras").exists()
    classifier_exists = (models_dir / "spendly_classifier.keras").exists()
    use_models = os.environ.get("SPENDLY_USE_MODELS", "1") != "0"

    return {
        "models_enabled": use_models,
        "lstm_model": {"file_exists": lstm_exists, "input_shape": "(batch, 7, 12)", "output_shape": "(batch, 1)"},
        "classifier_model": {"file_exists": classifier_exists, "input_shape": "(batch, 12)", "output_shape": "(batch, 3)"},
    }


app.include_router(predict.router, prefix="/predict")
