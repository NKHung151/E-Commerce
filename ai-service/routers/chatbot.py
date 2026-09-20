from fastapi import APIRouter, Header
from schemas.chatbot_schema import ChatRequest, ChatResponse
from services.chatbot_service import process_chat
from typing import Optional

router = APIRouter()


@router.post("", response_model=ChatResponse)
async def chatbot(request: ChatRequest, authorization: Optional[str] = Header(None)):
    token = None
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ")[1]
    return await process_chat(request.user_id, request.message, token=token)
