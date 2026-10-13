from typing import List, Optional

from pydantic import BaseModel


class ChatRequest(BaseModel):
    message: str  # the user (for order questions) comes from the JWT, never from the body


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
