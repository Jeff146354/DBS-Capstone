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


app.include_router(predict.router, prefix="/predict")
