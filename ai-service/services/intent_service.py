import json
import httpx
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
from openai import AsyncOpenAI
from config import settings

class IntentResult(BaseModel):
    intent: str
    confidence: float
    entities: dict = {}

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

def get_fast_intent(message: str) -> Optional[IntentResult]:
    """
    Sử dụng heuristic (từ khóa) để phân loại nhanh ý định, bỏ qua LLM nếu khớp để tăng tốc độ.
    """
    msg_lower = message.lower()
    
    # 1. Product Details
    if any(kw in msg_lower for kw in ["ram", "cpu", "pin", "màn hình", "kích thước", "nặng", "thông số", "cấu hình", "bao nhiêu"]):
        return IntentResult(intent="product_details", confidence=0.9)
    
    # 2. User Account
    if any(kw in msg_lower for kw in ["mật khẩu", "tài khoản", "quên pass", "đổi pass", "địa chỉ"]):
        return IntentResult(intent="user_account", confidence=0.9)
        
    # 3. FAQ / Policy
    if any(kw in msg_lower for kw in ["đổi trả", "bảo hành", "ship", "giao hàng", "phí vận chuyển", "chính sách"]):
        return IntentResult(intent="policy_faq", confidence=0.9)
        
    # 4. Order Management
    if any(kw in msg_lower for kw in ["đơn hàng", "hủy đơn", "chưa nhận được hàng"]):
        return IntentResult(intent="order_management", confidence=0.9)

    return None


async def get_intent(message: str) -> IntentResult:
    """
    Classify user message using heuristic first, then LLM.
    """
    # 1. Try fast keyword matching
    fast_result = get_fast_intent(message)
    if fast_result:
        return fast_result
        
    # 2. Fallback to LLM
    prompt = f"{SYSTEM_INTENT_PROMPT}\n\nUser message: \"{message}\"\nJSON Result:"
    
    # Try OpenAI first if configured, else use Ollama
    try:
        if settings.LLM_PROVIDER == "openai" and settings.OPENAI_API_KEY:
            client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
            resp = await client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[{"role": "user", "content": prompt}],
                response_format={"type": "json_object"}
            )
            data = json.loads(resp.choices[0].message.content)
        else:
            # Fallback to Ollama
            payload = {
                "model": settings.OLLAMA_MODEL,
                "prompt": prompt,
                "stream": False,
                "format": "json"
            }
            async with httpx.AsyncClient(timeout=300.0) as client:
                response = await client.post(f"{settings.OLLAMA_BASE_URL}/api/generate", json=payload)
                if response.status_code == 200:
                    data = response.json()
                    res_text = data.get("response", "{}")
                    
                    # Remove markdown formatting if Ollama returns it
                    res_text = res_text.strip()
                    if res_text.startswith("```json"):
                        res_text = res_text[7:]
                    if res_text.startswith("```"):
                        res_text = res_text[3:]
                    if res_text.endswith("```"):
                        res_text = res_text[:-3]
                    res_text = res_text.strip()
                    
                    data = json.loads(res_text)
                else:
                    error_detail = response.text
                    print(f"Ollama Intent Error ({response.status_code}): {error_detail}")
                    data = {"intent": "fallback", "confidence": 1.0}
        
        return IntentResult(
            intent=data.get("intent", "fallback"),
            confidence=data.get("confidence", 1.0),
            entities=data.get("entities", {})
        )
    except Exception as e:
        import traceback
        print(f"Intent Classification Exception: {str(e)}")
        traceback.print_exc()
        return IntentResult(intent="fallback", confidence=1.0)
