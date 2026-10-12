import httpx
import re
from typing import Optional, List, Dict
from openai import AsyncOpenAI
from config import settings
from services.rag_service import get_rag_scores
from db.product_client import product_client, category_name

from services.intent_service import get_intent
from db.order_client import order_client

def clean_vietnamese_response(text: str) -> str:
    """
    Lọc bỏ phần tiếng Anh thừa khỏi response nếu có.
    Giữ lại các link markdown [text](/url)
    """
    if not text:
        return text
    
    # Nếu response chứa thêm câu tiếng Anh dài (hơn 20 ký tự liên tục không có dấu tiếng Việt)
    # thì cắt bỏ phần đó
    lines = text.split('. ')
    result_lines = []
    
    for line in lines:
        # Lấy phần text (không còn link markdown nữa nên cứ để nguyên)
        text_without_links = line
        
        # Kiểm tra xem phần text có tiếng Anh nhiều không (các từ tiếng Anh liên tiếp)
        # Nếu có nhiều ký tự alphabet liên tục và không có dấu tiếng Việt thì bỏ đi
        has_vietnamese = bool(re.search(r'[\u0100-\u017F\u1E00-\u1EFF]', text_without_links))
        
        if has_vietnamese or not text_without_links.strip():
            # Giữ dòng này vì có tiếng Việt
            result_lines.append(line)
    
    # Gộp lại và loại bỏ phần tiếng Anh thừa ở cuối
    result = '. '.join(result_lines).strip()
    
    # Xóa các cụm từ tiếng Anh thường gặp ở cuối
    english_patterns = [
        r'\s*Both of these .+$',
        r'\s*So you may find .+$',
        r'\s*[A-Z][a-z]+ of these .+$',
        r'\s*They (?:are|have|offer).+$',
        r'\s*These products?.+$',
        r'\s*You may find.+$',
        r'\s*I recommend.+$',
        r'\s*[a-z]+ under \d+.+$',
    ]
    
    for pattern in english_patterns:
        result = re.sub(pattern, '', result, flags=re.IGNORECASE)
    
    return result.strip()

async def process_chat(user_id: int, message: str, token: Optional[str] = None) -> Dict:
    """
    Dispatcher for 10-intent AI Chatbot architecture.
    """
    # 1. Identify Intent
    intent_res = await get_intent(message)
    intent = intent_res.intent
    
    reply = ""
    products: List[Dict] = []
    
    # 2. Dispatch to specific handlers
    entities = getattr(intent_res, "entities", {})
    max_price = entities.get("max_price")
    
    if intent == "order_management":
        reply = await handle_order_management(user_id, message, token=token)
    elif intent == "product_discovery" or intent == "personalized_recommendation":
        reply, products = await handle_product_search(message, max_price=max_price)
    elif intent == "product_details":
        reply, products = await handle_product_details(message, max_price=max_price)
    elif intent == "policy_faq" or intent == "service_info":
        reply = await handle_faq(message)
    elif intent == "user_account":
        reply = "Bạn có thể cập nhật thông tin tài khoản hoặc đổi mật khẩu tại trang Cá nhân: [Tài khoản của tôi](/profile). Để bảo mật, tôi không thể thay đổi mật khẩu trực tiếp cho bạn."
    elif intent == "payment":
        reply = "Chúng tôi hỗ trợ thanh toán qua VNPay, Momo và COD (Thanh toán khi nhận hàng). Nếu bạn gặp lỗi trừ tiền, vui lòng cung cấp mã giao dịch để tôi kiểm tra với bộ phận thanh toán."
    else:
        # Fallback / General conversation
        reply, products = await handle_fallback(user_id, message, max_price=max_price)

    return {
        "reply": reply,
        "products": products[:3],
        "intent": intent,
        "confidence": intent_res.confidence
    }

async def handle_order_management(user_id: int, message: str, token: str = None) -> str:
    orders = await order_client.get_user_orders(user_id, token=token)
    if not orders:
        return "Tôi không tìm thấy đơn hàng nào của bạn. Bạn vui lòng kiểm tra lại trong phần [Lịch sử đơn hàng](/orders) nhé."
    
    # Lấy đơn hàng gần nhất
    latest = orders[0]
    status_map = {
        "PENDING": "đang chờ xử lý",
        "PROCESSING": "đang được đóng gói",
        "SHIPPED": "đang được vận chuyển",
        "DELIVERED": "đã giao thành công",
        "CANCELLED": "đã bị hủy"
    }
    status_vn = status_map.get(latest.get("status"), latest.get("status"))
    return f"Đơn hàng gần nhất của bạn (Mã: {latest.get('id')}) hiện tại {status_vn}. Tổng tiền là {float(latest.get('total_price', 0)):,.0f} VNĐ."

async def handle_product_search(message: str, max_price: Optional[float] = None):
    # Fetch top 15 results to ensure we have enough after filtering
    rag_results = await get_rag_scores(message, top_k=15)
    products = await product_client.get_products_by_ids(list(rag_results.keys()))
    
    if max_price is not None:
        products = [p for p in products if float(p.get('price', 0)) <= max_price]
    
    # Take top 5 after filtering
    products = products[:5]
    
    product_context = ""
    formatted_products = []
    for p in products:
        price = float(p.get('price', 0))
        cat_name = category_name(p)
        # KHÔNG đưa ID vào context để tránh AI in ra
        product_context += f"- {p['name']}: {price:,.0f} VNĐ (Loại: {cat_name})\n"
        formatted_products.append({
            "id": p['id'], "name": p['name'], "price": price,
            "image": p.get('image_url') or p.get('image'), "category": cat_name
        })

    # Đảm bảo có dữ liệu sản phẩm trong context
    context_text = product_context if product_context else "[KHO HÀNG TRỐNG]"
    
    prompt = (
        "### HỆ THỐNG DỮ LIỆU THỰC TẾ (CHỈ ĐƯỢC DÙNG DỮ LIỆU NÀY):\n"
        f"{context_text}\n\n"
        "### YÊU CẦU CÔNG VIỆC:\n"
        f"Khách hàng hỏi: '{message}'\n"
        "Bạn là Trợ lý bán hàng. CHỈ TRẢ LỜI BẰNG TIẾNG VIỆT. QUY TẮC TƯ VẤN KHIẾT:\n"
        "1. CHỈ ĐƯỢC PHÉP tư vấn và nhắc tên các sản phẩm có đúng trong phần [HỆ THỐNG DỮ LIỆU THỰC TẾ] ở trên. TUYỆT ĐỐI KHÔNG tự bịa ra hay đề xuất bất kỳ sản phẩm nào khác ngoài danh sách đã cho.\n"
        "2. NẾU KHÔNG CÓ sản phẩm nào trong danh sách trên khớp với nhu cầu của khách (ví dụ khách hỏi 'Laptop' nhưng danh sách chỉ có 'Tai nghe' hoặc 'Thảm'), bạn BẮT BUỘC phải trả lời chính xác câu sau và không nói thêm gì khác: 'Xin lỗi, hiện chúng tôi không có sản phẩm nào hoàn toàn phù hợp với yêu cầu của bạn. Bạn có thể tham khảo một số sản phẩm gợi ý bên dưới nhé.'\n"
        "3. Nếu có sản phẩm khớp trong danh sách, hãy trả lời thân thiện và chỉ nhắc tên sản phẩm CÓ TRONG DANH SÁCH. TUYỆT ĐỐI KHÔNG chèn link, URL, hay ID.\n"
        "4. TUYỆT ĐỐI KHÔNG cộng thêm giá, so sánh giá hay bất kỳ thông tin gì ngoài phần hỗ trợ.\n"
        "5. TRẢ LỜI NGẮN GỌN (tối đa 2 câu), TRỰC TIẾP, KHÔNG VÒNG VO.\n"
    )
    reply = await call_llm_logic(prompt)
    reply = clean_vietnamese_response(reply)
    
    reply_lower = reply.lower()
    final_products = []
    
    # Hallucination Guard: Chỉ trả về thẻ sản phẩm nếu AI thực sự có nhắc đến sản phẩm đó trong câu trả lời.
    if "xin lỗi" in reply_lower or "không có" in reply_lower:
        # Nếu AI đã chủ động xin lỗi và nói chuyển sang gợi ý -> Trả về toàn bộ danh sách gợi ý.
        final_products = formatted_products
    else:
        for p in formatted_products:
            # Lấy 2 từ đầu tiên của tên sản phẩm làm từ khóa nhận diện (VD: "Tai nghe", "Laptop Dell", "Thảm trải")
            name_parts = p['name'].lower().split()
            prefix = " ".join(name_parts[:2]) if len(name_parts) >= 2 else p['name'].lower()
            
            if prefix in reply_lower:
                final_products.append(p)
                
        # Nếu AI tự bịa ra câu trả lời mà không nhắc đến bất kỳ sản phẩm nào có trong danh sách
        # (Tức là AI bịa ra sản phẩm khác không có trong kho) -> Ép AI trả lời xin lỗi và hiển thị danh sách gợi ý.
        if formatted_products and not final_products:
            reply = "Xin lỗi, hiện chúng tôi không có sản phẩm nào hoàn toàn phù hợp với yêu cầu của bạn. Bạn có thể tham khảo một số sản phẩm gợi ý bên dưới nhé."
            final_products = formatted_products

    return reply, final_products

async def handle_product_details(message: str, max_price: Optional[float] = None):
    # Fetch top 3 results to focus on the specific product
    rag_results = await get_rag_scores(message, top_k=3)
    products = await product_client.get_products_by_ids(list(rag_results.keys()))
    
    product_context = ""
    formatted_products = []
    for p in products:
        price = float(p.get('price', 0))
        desc = p.get('description', '')[:500] # Get first 500 chars of description
        product_context += f"- {p['name']}: {price:,.0f} VNĐ\n  Thông số: {desc}\n\n"
        formatted_products.append({
            "id": p['id'], "name": p['name'], "price": price,
            "image": p.get('image_url') or p.get('image')
        })

    context_text = product_context if product_context else "[KHÔNG TÌM THẤY SẢN PHẨM]"
    
    prompt = (
        "### HỆ THỐNG DỮ LIỆU THỰC TẾ:\n"
        f"{context_text}\n\n"
        "### YÊU CẦU CÔNG VIỆC:\n"
        f"Khách hàng hỏi chi tiết: '{message}'\n"
        "Bạn là Trợ lý bán hàng. CHỈ TRẢ LỜI BẰNG TIẾNG VIỆT.\n"
        "1. Hãy tìm trong dữ liệu thông số (RAM, CPU, kích thước, v.v.) để TRẢ LỜI TRỰC TIẾP câu hỏi của khách hàng.\n"
        "2. NẾU KHÔNG THẤY THÔNG SỐ TRONG DỮ LIỆU, hãy xin lỗi và nói rằng chưa có thông tin chi tiết.\n"
        "3. TRẢ LỜI NGẮN GỌN đúng trọng tâm câu hỏi (tối đa 2 câu). Không dài dòng giải thích thêm.\n"
        "4. TUYỆT ĐỐI KHÔNG chèn link, ID hay URL nào."
    )
    reply = await call_llm_logic(prompt)
    reply = clean_vietnamese_response(reply)
    
    return reply, formatted_products[:1] # Only return the most relevant product card

async def handle_faq(message: str):
    prompt = (
        "Bạn là trợ lý giải đáp chính sách của E-Shop. CHỈ TRẢ LỜI BẰNG TIẾNG VIỆT.\n"
        f"Khách hỏi: '{message}'.\n"
        "Dựa trên chính sách: Đổi trả 7 ngày, bảo hành 12 tháng, giao hàng 2h tại HN/HCM.\n"
        "Hãy trả lời ngắn gọn, súc tích bằng tiếng Việt. TUYỆT ĐỐI KHÔNG dùng tiếng Anh."
    )
    reply = await call_llm_logic(prompt)
    # Lọc bỏ phần tiếng Anh nếu có
    reply = clean_vietnamese_response(reply)
    return reply

async def handle_fallback(user_id: int, message: str, max_price: Optional[float] = None):
    # Thay vì trả lời xã giao, ta lồng luôn logic tìm kiếm vào đây để đảm bảo AI luôn check kho
    return await handle_product_search(message, max_price=max_price)

async def call_llm_logic(prompt: str) -> str:
    try:
        if settings.LLM_PROVIDER == "openai" and settings.OPENAI_API_KEY:
            client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
            resp = await client.chat.completions.create(
                model="gpt-3.5-turbo", messages=[{"role": "user", "content": prompt}]
            )
            return resp.choices[0].message.content
        else:
            payload = {"model": settings.OLLAMA_MODEL, "prompt": prompt, "stream": False}
            async with httpx.AsyncClient(timeout=300.0) as client:
                response = await client.post(f"{settings.OLLAMA_BASE_URL}/api/generate", json=payload)
                if response.status_code == 200:
                    return response.json().get("response", "Tôi không nhận được phản hồi từ AI.")
                else:
                    error_msg = response.text
                    print(f"Ollama Error ({response.status_code}): {error_msg}")
                    return f"Lỗi kết nối AI ({response.status_code}): {error_msg[:100]}..."
    except Exception as e:
        print(f"LLM Logic Exception: {str(e)}")
        # Friendly Vietnamese fallback instead of raw error
        return "Xin lỗi, hiện tại tôi đang bận xử lý một chút. Dưới đây là một số sản phẩm tốt nhất mà tôi tìm thấy cho bạn:"
