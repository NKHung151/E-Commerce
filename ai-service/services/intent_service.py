"""Chatbot intent classification: keyword rules first, LLM for the rest."""
import logging
import re
from typing import Optional

from pydantic import BaseModel, Field

from services import llm

logger = logging.getLogger(__name__)

INTENTS = (
    "product_discovery", "product_details", "promotion", "order_management", "payment",
    "user_account", "service_info", "personalized_recommendation", "policy_faq", "fallback",
)


class IntentResult(BaseModel):
    intent: str
    confidence: float
    entities: dict = Field(default_factory=dict)


SYSTEM_INTENT_PROMPT = """
Bạn là Trình phân loại ý định cho Chatbot E-commerce.
Hãy phân loại tin nhắn của người dùng vào 1 trong 10 nhóm sau:
1. product_discovery (Hỏi tìm sản phẩm, gợi ý theo giá/loại)
2. product_details (Hỏi chi tiết thông số, bảo hành của 1 sản phẩm cụ thể)
3. promotion (Hỏi về giá, giảm giá, mã khuyến mãi)
4. order_management (Tra cứu đơn hàng, hủy đơn, thời gian giao)
5. payment (Hỏi về phương thức thanh toán, lỗi trừ tiền)
6. user_account (Hỏi về mật khẩu, đổi mật khẩu, quên mật khẩu, địa chỉ, thông tin cá nhân)
7. service_info (Hỏi về lắp đặt, giao nhanh, dịch vụ tận nơi)
8. personalized_recommendation (Yêu cầu tư vấn theo sở thích, cá nhân hóa)
9. policy_faq (Hỏi về chính sách đổi trả, bảo hành chung, phí vận chuyển)
10. fallback (Chào hỏi, hỏi linh tinh ngoài phạm vi)

YÊU CẦU: CHỈ trả về một đối tượng JSON với các khóa: "intent" (chuỗi), "confidence" (số từ 0.0 đến 1.0) và "entities" (đối tượng JSON chứa các thông tin trích xuất được, ví dụ "max_price" là số nguyên nếu người dùng yêu cầu giá tối đa hoặc dưới mức giá nào đó).
Ví dụ: {"intent": "product_discovery", "confidence": 0.95, "entities": {"max_price": 15000000}}
"""

# Checked in order; the first group with a whole-word match wins. Ambiguous words
# that also appear in product searches ("pin", "bao nhiêu", "giao hàng") are left
# to the LLM — e.g. "điện thoại pin trâu" is a search, not a spec question.
KEYWORD_RULES = (
    ("order_management", ("đơn hàng", "đơn của tôi", "mã đơn", "hủy đơn", "huỷ đơn", "theo dõi đơn", "chưa nhận được hàng")),
    ("user_account", ("mật khẩu", "tài khoản", "quên pass", "đổi pass", "đăng nhập", "đăng ký")),
    ("payment", ("thanh toán", "chuyển khoản", "trừ tiền", "cod", "trả góp")),
    ("policy_faq", ("đổi trả", "hoàn tiền", "chính sách", "phí vận chuyển", "phí ship", "bảo hành")),
    ("product_details", ("thông số", "cấu hình", "ram", "cpu", "chip", "màn hình", "kích thước", "dung lượng", "chất liệu")),
)
_RULE_PATTERNS = [
    (intent, re.compile(r"(?<!\w)(?:" + "|".join(map(re.escape, words)) + r")(?!\w)", re.IGNORECASE))
    for intent, words in KEYWORD_RULES
]

# "dưới 15 triệu", "tối đa 500k", "không quá 2tr", "<= 3.000.000đ", "từ 1 đến 3 triệu"
_UNITS = {"triệu": 1_000_000, "tr": 1_000_000, "củ": 1_000_000, "nghìn": 1_000, "ngàn": 1_000, "k": 1_000}
_PRICE_RE = re.compile(
    r"(?:dưới|tối đa|không quá|ít hơn|nhỏ hơn|max|<=?|đến|tới)\s*"
    r"(\d+(?:[.,]\d+)*)\s*(triệu|tr|củ|nghìn|ngàn|k|đ|vnd|vnđ)?(?!\w)",
    re.IGNORECASE,
)


def extract_max_price(message: str) -> Optional[int]:
    """Upper price bound mentioned in the message, in VND."""
    matches = list(_PRICE_RE.finditer(message))
    if not matches:
        return None
    number, unit = matches[-1].group(1), (matches[-1].group(2) or "").lower()
    if unit in _UNITS:
        value = float(number.replace(",", "."))  # "1,5 triệu" / "1.5tr"
        return int(value * _UNITS[unit])
    digits = int(re.sub(r"[.,]", "", number) or 0)  # "3.000.000đ"
    # A bare small number ("laptop dưới 15") means millions in everyday Vietnamese.
    return digits * 1_000_000 if 0 < digits < 1000 and not unit else (digits or None)


def get_fast_intent(message: str) -> Optional[IntentResult]:
    for intent, pattern in _RULE_PATTERNS:
        if pattern.search(message):
            return IntentResult(intent=intent, confidence=0.9)
    return None


async def get_intent(message: str) -> IntentResult:
    """Keyword rules, then the LLM; the price bound is always extracted locally too."""
    max_price = extract_max_price(message)
    result = get_fast_intent(message)

    if result is None:
        try:
            data = llm.parse_json(await llm.complete(
                f"{SYSTEM_INTENT_PROMPT}\n\nUser message: \"{message}\"\nJSON Result:", json_mode=True))
            intent = data.get("intent") if data.get("intent") in INTENTS else "fallback"
            result = IntentResult(
                intent=intent,
                confidence=float(data.get("confidence") or 0.5),
                entities=data.get("entities") or {},
            )
        except Exception as e:
            logger.warning(f"Intent classification via LLM failed: {e}")
            # Without an LLM a price-bounded message is still clearly a product search.
            result = IntentResult(intent="product_discovery" if max_price else "fallback", confidence=0.5)

    if max_price and not result.entities.get("max_price"):
        result.entities["max_price"] = max_price
    return result
