from pydantic import BaseModel
from typing import List, Optional

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
