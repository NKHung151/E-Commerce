from fastapi import APIRouter, Depends, HTTPException
from typing import Optional

from middleware.auth import get_optional_user, is_internal_service, token_user_id
from schemas.behavior_schema import ActionType, BehaviorEvent, BehaviorResponse
from services.behavior_service import process_event

router = APIRouter()

# What a browser may report. add_to_cart and purchase are recorded by cart-service and
# order-service themselves, so accepting them from clients would only allow fake signals.
CLIENT_ACTIONS = {ActionType.view, ActionType.click, ActionType.open_chatbot}


@router.post("/track", response_model=BehaviorResponse)
async def track_behavior(
    event: BehaviorEvent,
    user: Optional[dict] = Depends(get_optional_user),
    internal: bool = Depends(is_internal_service),
):
    if internal:
        # Services (HTTP fallback of the RabbitMQ publisher) report on behalf of a user.
        if event.user_id is None:
            raise HTTPException(status_code=422, detail="user_id is required")
    else:
        # Clients can only report their own behaviour: the user comes from the JWT.
        user_id = token_user_id(user)
        if user_id is None:
            raise HTTPException(status_code=401, detail="Login required")
        if event.action not in CLIENT_ACTIONS:
            raise HTTPException(status_code=403, detail=f"Action '{event.action.value}' is recorded by the server")
        event.user_id = user_id
    await process_event(event)
    return BehaviorResponse(status="ok", message="Event recorded")
