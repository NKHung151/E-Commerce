# Order Service

## Tổng quan
Quản lý đơn hàng và khởi động saga đặt hàng. Saga chạy theo kiểu choreography qua RabbitMQ: không có
service điều phối trung tâm, mỗi service phản ứng với sự kiện của service trước và tự bù trừ khi thất bại.

## Cổng
- **8004** (cổng nội bộ)
- Truy cập qua gateway: `http://localhost:8080/api/v1/orders/` (khách) và `/api/v1/staff/orders/` (back office)

## Cơ sở dữ liệu
- **PostgreSQL**, database `order_db`

## Model
- **Order**: user_id, total_price (Decimal 12,2), status, address, payment_method (`card`, `bank`,
  `cash`), created_at, updated_at
  - Trạng thái: `pending`, `processing`, `shipped`, `delivered`, `cancelled`
- **OrderItem**: order, product_id, quantity, unit_price (giá tại thời điểm đặt), created_at

## Saga (RabbitMQ, exchange `saga-events`)

```
POST /api/v1/orders/
 1. Kiểm tra: tối đa 50 dòng (dòng trùng sản phẩm được gộp), bắt buộc địa chỉ, payment_method hợp lệ
 2. Định giá từng dòng từ product-service (không bao giờ lấy giá từ client), kiểm tra sơ bộ tồn kho
    (lấy thông tin các sản phẩm song song)
 3. Lưu Order (pending) + các dòng, phát saga-order-created                       -> 201 {đơn hàng}

payment-service   saga-order-created  -> saga-payment-success | saga-payment-pending (chuyển khoản/COD)
product-service   saga-payment-*      -> giữ kho nguyên tử -> saga-stock-reduced | saga-stock-failed
shipping-service  saga-stock-reduced  -> tạo vận đơn -> saga-shipping-created
order-service     saga-shipping-created -> status = processing, báo một lượt "purchase" cho AI với mỗi dòng
                  saga-payment-failed / saga-stock-failed / saga-payment-refunded -> status = cancelled
nhân viên huỷ đơn -> saga-order-cancelled: product-service hoàn kho, payment-service hoàn tiền
```

Lượt mua chỉ được báo cho AI khi saga thành công, nên đơn thất bại hoặc bị huỷ ngay khi thanh toán
không làm sai dữ liệu huấn luyện gợi ý.

## API
Mọi endpoint đều cần JWT.

### Khách hàng (đơn của chính mình)
- `POST /api/v1/orders/` - Đặt hàng
  - Body: `{"items": [{"product_id": 1, "quantity": 2}], "address": "123 Main St", "payment_method": "cash"}`
  - Trả 201 kèm đơn (`status: pending`); 400 kèm thông báo tiếng Việt khi dữ liệu không hợp lệ;
    503 nếu không gọi được product-service
- `GET /api/v1/orders/` - Danh sách đơn của mình, có phân trang (`page`, `page_size`)
- `GET /api/v1/orders/{id}/` - Chi tiết một đơn

### Back office (staff / admin) — `/api/v1/staff/orders/`
- `GET /staff/orders/` - Tất cả đơn; `search` tìm theo mã đơn, mã người dùng, trạng thái hoặc địa chỉ
- `GET /staff/orders/{id}/`
- `PATCH /staff/orders/{id}/update_status/` - `{"status": "..."}`; các bước chuyển hợp lệ:
  pending -> processing | cancelled, processing -> shipped | cancelled, shipped -> delivered.
  Chuyển sang cancelled / shipped / delivered sẽ phát sự kiện saga tương ứng (vận đơn cập nhật theo).

## Chạy

### Local
```bash
pip install -r requirements.txt
cp .env.example .env
python manage.py migrate
python manage.py runserver 0.0.0.0:8004
```

### Docker
```bash
cd infrastructure
docker compose up -d --build order-service
```

## Ví dụ

```bash
# Đặt hàng
curl -X POST http://localhost:8080/api/v1/orders/ \
  -H "Content-Type: application/json" -H "Authorization: Bearer <access_token>" \
  -d '{"items": [{"product_id": 1, "quantity": 2}, {"product_id": 3, "quantity": 1}],
       "address": "123 Main Street, Hà Nội", "payment_method": "card"}'

# Danh sách và chi tiết
curl "http://localhost:8080/api/v1/orders/?page=1&page_size=10" -H "Authorization: Bearer <access_token>"
curl http://localhost:8080/api/v1/orders/5/ -H "Authorization: Bearer <access_token>"

# Đổi trạng thái (staff/admin)
curl -X PATCH http://localhost:8080/api/v1/staff/orders/5/update_status/ \
  -H "Content-Type: application/json" -H "Authorization: Bearer <staff_token>" -d '{"status": "shipped"}'
```
