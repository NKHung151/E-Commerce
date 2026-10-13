from typing import List, Optional

from pydantic import BaseModel


class ChatRequest(BaseModel):
    message: str
    user_id: int = 0  # informational; orders are looked up from the JWT, not this id


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
