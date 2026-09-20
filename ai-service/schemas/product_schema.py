from pydantic import BaseModel
from typing import Optional

class Category(BaseModel):
    id: int
    name: str
    slug: Optional[str]

class Product(BaseModel):
    id: int
    name: str
    price: float
    stock: int
    image: Optional[str]
    is_active: bool
    category: Optional[Category]
    created_at: Optional[str]
