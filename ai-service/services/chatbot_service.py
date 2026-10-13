"""Chatbot: classify the message, then answer from real shop data.

Product answers are grounded: the LLM only sees products found by semantic search
(FAISS) and its reply is checked against that list before product cards are shown.
"""
import logging
import re
from typing import Dict, List, Optional, Tuple

from db.order_client import order_client
from db.product_client import category_name, product_client
from services import llm
from services.intent_service import get_intent
from services.rag_service import get_rag_scores

logger = logging.getLogger(__name__)

SHOP_NAME = "Novamart"
MAX_CARDS = 3
NO_MATCH_REPLY = ("Xin lỗi, hiện chúng tôi không có sản phẩm nào hoàn toàn phù hợp với yêu cầu của bạn. "
                  "Bạn có thể tham khảo một số sản phẩm gợi ý bên dưới nhé.")
LLM_DOWN_REPLY = ("Xin lỗi, hiện tại tôi đang bận xử lý một chút. "
                  "Dưới đây là một số sản phẩm tốt nhất mà tôi tìm thấy cho bạn:")

# order-service statuses are lowercase (pending, processing, ...).
ORDER_STATUS_VN = {
    "pending": "đang chờ xử lý",
    "processing": "đang được đóng gói",
    "shipped": "đang được vận chuyển",
    "delivered": "đã giao thành công",
    "cancelled": "đã bị huỷ",
}

# Static answers that must match what the platform really supports.
STATIC_REPLIES = {
    "user_account": ("Bạn có thể xem thông tin tài khoản tại trang [Tài khoản của tôi](/profile). "
                     "Để bảo mật, tôi không thể thay đổi mật khẩu trực tiếp cho bạn."),
    "payment": ("Chúng tôi hỗ trợ thanh toán bằng thẻ tín dụng/ghi nợ, chuyển khoản ngân hàng và thanh toán khi "
                "nhận hàng (COD). Đơn chuyển khoản được xử lý ngay khi cửa hàng xác nhận đã nhận tiền."),
}

POLICY = "Đổi trả trong 7 ngày, bảo hành 12 tháng, miễn phí vận chuyển, giao nhanh 2 giờ tại Hà Nội và TP.HCM."

_VIETNAMESE_CHARS = re.compile(r"[\u0100-\u017F\u1E00-\u1EFF]")
_ENGLISH_TAILS = [re.compile(p, re.IGNORECASE) for p in (
    r"\s*Both of these .+$", r"\s*So you may find .+$", r"\s*[A-Z][a-z]+ of these .+$",
    r"\s*They (?:are|have|offer).+$", r"\s*These products?.+$", r"\s*You may find.+$", r"\s*I recommend.+$",
)]


def clean_vietnamese_response(text: str) -> str:
    """Small local models often append English sentences; drop sentences without Vietnamese diacritics."""
    if not text:
        return text
    sentences = [s for s in text.split(". ") if _VIETNAMESE_CHARS.search(s) or not s.strip()]
    result = ". ".join(sentences).strip()
    for pattern in _ENGLISH_TAILS:
        result = pattern.sub("", result)
    return result.strip()


async def ask_llm(prompt: str, fallback: str = LLM_DOWN_REPLY) -> str:
    try:
        return clean_vietnamese_response(await llm.complete(prompt))
    except Exception as e:
        logger.warning(f"LLM call failed: {e}")
        return fallback


def product_card(p: dict) -> dict:
    return {
        "id": p["id"], "name": p["name"], "price": float(p.get("price", 0)),
        "image": p.get("image_url") or p.get("image"), "category": category_name(p),
    }


async def search_products(message: str, top_k: int, max_price: Optional[float] = None) -> List[dict]:
    scores = await get_rag_scores(message, top_k=top_k)
    products = await product_client.get_products_by_ids(list(scores))
    if max_price is not None:
        products = [p for p in products if float(p.get("price", 0)) <= float(max_price)]
    return products


async def process_chat(message: str, token: Optional[str] = None) -> Dict:
    intent_res = await get_intent(message)
    intent = intent_res.intent
    max_price = intent_res.entities.get("max_price")
    products: List[Dict] = []

    if intent == "order_management":
        reply = await handle_order_management(token)
    elif intent == "product_details":
        reply, products = await handle_product_details(message)
    elif intent in ("policy_faq", "service_info"):
        reply = await handle_faq(message)
    elif intent in STATIC_REPLIES:
        reply = STATIC_REPLIES[intent]
    else:
        # product_discovery, personalized_recommendation, promotion and small talk all
        # end in a catalogue search so the bot always answers from real stock.
        reply, products = await handle_product_search(message, max_price=max_price)

    return {"reply": reply, "products": products[:MAX_CARDS], "intent": intent, "confidence": intent_res.confidence}


async def handle_order_management(token: Optional[str]) -> str:
    if not token:
        return "Bạn vui lòng [đăng nhập](/login) để tôi kiểm tra đơn hàng giúp bạn nhé."
    # order-service filters by the user in the JWT, never by a client-supplied id.
    orders = await order_client.get_user_orders(token=token)
    if not orders:
        return "Tôi không tìm thấy đơn hàng nào của bạn. Bạn vui lòng kiểm tra lại trong phần [Đơn hàng của tôi](/orders) nhé."
    latest = orders[0]
    status_vn = ORDER_STATUS_VN.get(latest.get("status"), latest.get("status"))
    return (f"Đơn hàng gần nhất của bạn ([#{latest.get('id')}](/orders/{latest.get('id')})) hiện {status_vn}. "
            f"Tổng tiền {float(latest.get('total_price', 0)):,.0f} VNĐ.")


async def handle_product_search(message: str, max_price: Optional[float] = None) -> Tuple[str, List[dict]]:
    products = (await search_products(message, top_k=15, max_price=max_price))[:5]
    cards = [product_card(p) for p in products]
    # IDs are deliberately left out of the context so the model cannot print them.
    context = "".join(f"- {c['name']}: {c['price']:,.0f} VNĐ (Loại: {c['category']})\n" for c in cards) or "[KHO HÀNG TRỐNG]"

    prompt = (
        "### HỆ THỐNG DỮ LIỆU THỰC TẾ (CHỈ ĐƯỢC DÙNG DỮ LIỆU NÀY):\n"
        f"{context}\n\n"
        "### YÊU CẦU CÔNG VIỆC:\n"
        f"Khách hàng hỏi: '{message}'\n"
        "Bạn là Trợ lý bán hàng. CHỈ TRẢ LỜI BẰNG TIẾNG VIỆT. QUY TẮC TƯ VẤN:\n"
        "1. CHỈ ĐƯỢC PHÉP tư vấn và nhắc tên các sản phẩm có đúng trong phần [HỆ THỐNG DỮ LIỆU THỰC TẾ] ở trên. "
        "TUYỆT ĐỐI KHÔNG tự bịa ra hay đề xuất bất kỳ sản phẩm nào khác ngoài danh sách đã cho.\n"
        "2. NẾU KHÔNG CÓ sản phẩm nào trong danh sách khớp với nhu cầu của khách, bạn BẮT BUỘC phải trả lời chính xác "
        f"câu sau và không nói thêm gì khác: '{NO_MATCH_REPLY}'\n"
        "3. Nếu có sản phẩm khớp, hãy trả lời thân thiện và chỉ nhắc tên sản phẩm CÓ TRONG DANH SÁCH. "
        "TUYỆT ĐỐI KHÔNG chèn link, URL, hay ID.\n"
        "4. TUYỆT ĐỐI KHÔNG cộng thêm giá, so sánh giá hay bất kỳ thông tin gì ngoài phần hỗ trợ.\n"
        "5. TRẢ LỜI NGẮN GỌN (tối đa 2 câu), TRỰC TIẾP, KHÔNG VÒNG VO.\n"
    )
    reply = await ask_llm(prompt)
    reply_lower = reply.lower()

    # Hallucination guard: only show cards for products the reply actually mentions
    # (first two words of the name). An apology means "no exact match": show suggestions.
    if "xin lỗi" in reply_lower or "không có" in reply_lower:
        return reply, cards
    mentioned = [c for c in cards if " ".join(c["name"].lower().split()[:2]) in reply_lower]
    if cards and not mentioned:
        # The model talked about products that are not in stock.
        return NO_MATCH_REPLY, cards
    return reply, mentioned


async def handle_product_details(message: str) -> Tuple[str, List[dict]]:
    products = await search_products(message, top_k=3)
    context = "".join(
        f"- {p['name']}: {float(p.get('price', 0)):,.0f} VNĐ\n  Thông số: {(p.get('description') or '')[:500]}\n"
        f"  Chi tiết: {p.get('details') or {}}\n\n"
        for p in products
    ) or "[KHÔNG TÌM THẤY SẢN PHẨM]"

    prompt = (
        "### HỆ THỐNG DỮ LIỆU THỰC TẾ:\n"
        f"{context}\n\n"
        "### YÊU CẦU CÔNG VIỆC:\n"
        f"Khách hàng hỏi chi tiết: '{message}'\n"
        "Bạn là Trợ lý bán hàng. CHỈ TRẢ LỜI BẰNG TIẾNG VIỆT.\n"
        "1. Hãy tìm trong dữ liệu thông số (RAM, CPU, kích thước, v.v.) để TRẢ LỜI TRỰC TIẾP câu hỏi của khách hàng.\n"
        "2. NẾU KHÔNG THẤY THÔNG SỐ TRONG DỮ LIỆU, hãy xin lỗi và nói rằng chưa có thông tin chi tiết.\n"
        "3. TRẢ LỜI NGẮN GỌN đúng trọng tâm câu hỏi (tối đa 2 câu). Không dài dòng giải thích thêm.\n"
        "4. TUYỆT ĐỐI KHÔNG chèn link, ID hay URL nào."
    )
    reply = await ask_llm(prompt, fallback="Xin lỗi, hiện tôi chưa tra cứu được thông số. Bạn xem chi tiết ở sản phẩm bên dưới nhé.")
    return reply, [product_card(p) for p in products[:1]]


async def handle_faq(message: str) -> str:
    prompt = (
        f"Bạn là trợ lý giải đáp chính sách của {SHOP_NAME}. CHỈ TRẢ LỜI BẰNG TIẾNG VIỆT.\n"
        f"Khách hỏi: '{message}'.\n"
        f"CHÍNH SÁCH (nguồn duy nhất): {POLICY}\n"
        "Chỉ diễn đạt lại đúng các ý trong CHÍNH SÁCH liên quan tới câu hỏi. TUYỆT ĐỐI KHÔNG thêm điều kiện, "
        "con số hay ưu đãi nào không có trong CHÍNH SÁCH. Nếu chính sách không đề cập, hãy nói là chưa có thông tin.\n"
        "Trả lời ngắn gọn (tối đa 2 câu) bằng tiếng Việt. TUYỆT ĐỐI KHÔNG dùng tiếng Anh."
    )
    return await ask_llm(prompt, fallback=f"Chính sách của {SHOP_NAME}: {POLICY}")
