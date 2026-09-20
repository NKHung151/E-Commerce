from fastapi import APIRouter
from schemas.behavior_schema import BehaviorEvent, BehaviorResponse
from services.behavior_service import process_event

router = APIRouter()


@router.post("/track", response_model=BehaviorResponse)
async def track_behavior(event: BehaviorEvent):
    # No auth required for internal calls
    await process_event(event)
    return BehaviorResponse(status="ok", message="Event recorded")
