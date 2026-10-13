# API Gateway (Nginx)

Điểm vào duy nhất của API. Container frontend chuyển `/api`, `/recommend`, `/chatbot` và `/behavior`
về đây (cùng origin với trình duyệt); mọi đường dẫn khác là ứng dụng React.

## Cổng
- **8080**. File cấu hình (`nginx.conf`) được docker compose mount ở chế độ chỉ đọc, nên sửa xong chỉ cần
  `docker compose restart gateway`.

## Định tuyến

| Đường dẫn | Service |
|---|---|
| `/api/v1/auth/*`, `/api/v1/users/*`, `/api/v1/admin/users/*` | user-service :8001 |
| `/api/v1/products/*` | product-service :8002 |
| `/api/v1/staff/{products,books,electronics,fashion,home-living,sports-outdoors,beauty-health,toys-games,automotive,food-grocery,office-supplies}/*` | product-service :8002 (back office) |
| `/api/v1/categories/*` | catalog-service :8008 |
| `/api/v1/comments/*` | comment-rate-service :8009 |
| `/api/v1/cart/*` | cart-service :8003 |
| `/api/v1/orders/*`, `/api/v1/staff/orders/*` | order-service :8004 |
| `/api/v1/payment/*` | payment-service :8005 |
| `/api/v1/staff/shipping/*` | shipping-service :8006 |
| `/recommend*`, `/chatbot`, `/behavior/track` | ai-service :8007 |
| mọi `/api/*` khác | `404 {"error": "Not found", "code": 404}` |
| còn lại | frontend |

## Hoạt động
- **Giới hạn tốc độ:** 10 request/giây mỗi IP, burst 20, vượt quá trả `429`. Request từ trình duyệt đi qua
  container frontend, nên IP thật của người dùng lấy từ header `X-Real-IP` (chỉ tin từ mạng Docker
  `172.16.0.0/12`); nếu không, mọi người dùng sẽ dùng chung một hạn mức.
- **Header:** `Host` được chuyển tiếp kèm cổng (để DRF tạo link phân trang đúng), cùng `X-Real-IP`,
  `X-Forwarded-For`, `X-Forwarded-Proto`; `Authorization` được giữ nguyên.
- **CORS:** cho phép origin `http://localhost:3000` (chỉ cần khi gọi API khác origin; frontend đi kèm
  dùng cùng origin).
- **Timeout:** 300 giây (câu trả lời của chatbot có thể lâu khi LLM vừa khởi động).
- **Log:** access log ra stdout kèm thời gian xử lý và thời gian của service phía sau (Promtail đẩy về Loki).
