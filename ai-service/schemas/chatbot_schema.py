from pydantic import BaseModel
from typing import List, Optional

class ChatRequest(BaseModel):
    user_id: int
    message: str
    conversation_history: Optional[List[dict]] = []

class ProductCard(BaseModel):
    id: int
    name: str
    price: float
    image: Optional[str]
    category: str

class ChatResponse(BaseModel):
    reply: str
    products: List[ProductCard] = []
    intent: str
    confidence: float = 1.0
