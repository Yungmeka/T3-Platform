"""Consumer Fact-Checker API routes."""

from fastapi import APIRouter
from pydantic import BaseModel
from app.services.consumer_factcheck import factcheck_recommendation

router = APIRouter()


class FactCheckRequest(BaseModel):
    recommendation: str


@router.post("/check")
async def check_recommendation(request: FactCheckRequest):
    """Fact-check an AI shopping recommendation for a consumer."""
    return await factcheck_recommendation(request.recommendation)
