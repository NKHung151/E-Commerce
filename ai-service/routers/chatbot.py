from typing import Optional

from fastapi import APIRouter, Header

from schemas.chatbot_schema import ChatRequest, ChatResponse
from services.chatbot_service import process_chat

router = APIRouter()


@router.post("", response_model=ChatResponse)
async def chatbot(request: ChatRequest, authorization: Optional[str] = Header(None)):
    # The user's JWT is forwarded to order-service for "where is my order" questions.
    token = authorization.split(" ", 1)[1] if authorization and authorization.startswith("Bearer ") else None
    return await process_chat(request.message, token=token)
