from enum import Enum
from typing import Optional

from pydantic import BaseModel


class ActionType(str, Enum):
    view = "view"
    click = "click"
    add_to_cart = "add_to_cart"
    purchase = "purchase"
    open_chatbot = "open_chatbot"


class BehaviorEvent(BaseModel):
    user_id: Optional[int] = None  # taken from the JWT for client calls; set by internal services
    product_id: Optional[int] = None
    action: ActionType


class BehaviorResponse(BaseModel):
    status: str
    message: str
