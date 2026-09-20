from pydantic import BaseModel
from datetime import datetime
from typing import Optional
from enum import Enum

class ActionType(str, Enum):
    view = "view"
    click = "click"
    search = "search"
    add_to_cart = "add_to_cart"
    purchase = "purchase"
    open_chatbot = "open_chatbot"

class BehaviorEvent(BaseModel):
    user_id: int
    product_id: Optional[int] = None
    action: ActionType
    timestamp: Optional[datetime] = None
    metadata: Optional[dict] = {}

class BehaviorResponse(BaseModel):
    status: str
    message: str
