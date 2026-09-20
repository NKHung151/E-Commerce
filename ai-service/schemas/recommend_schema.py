from pydantic import BaseModel
from typing import List, Optional

class RecommendRequest(BaseModel):
    user_id: int
    top_n: int = 10
    context: Optional[str] = None

class ProductSummary(BaseModel):
    id: int
    name: str
    price: float
    image: Optional[str]
    category: str
    score: float

class RecommendResponse(BaseModel):
    user_id: Optional[int]
    products: List[ProductSummary]
    source: str
