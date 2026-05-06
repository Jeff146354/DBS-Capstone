"""
Pydantic schemas for the Spendly ML prediction API.
"""
from typing import Literal
from pydantic import BaseModel, Field


class SpendingRequest(BaseModel):
    user_id: str = Field(..., description="User identifier")
    current_spending: int = Field(..., ge=0, description="Current month spending in IDR")


class SpendingResponse(BaseModel):
    predicted_amount: int = Field(..., gt=0, description="Predicted next-month spending in IDR")
    currency: str = Field(default="IDR")
    month: str = Field(..., description="Target month in YYYY-MM format")


class StatusRequest(BaseModel):
    user_id: str = Field(..., description="User identifier")
    current_spending: int = Field(..., ge=0, description="Current month spending in IDR")
    monthly_income: int = Field(..., ge=0, description="Monthly income in IDR")


class StatusResponse(BaseModel):
    status: Literal["AMAN", "HATI-HATI", "BOROS"]
    confidence: float = Field(..., ge=0.0, le=1.0)
    reason: str
