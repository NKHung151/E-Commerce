# Payment Service

## Tổng quan
Đảm nhận bước thanh toán trong saga đặt hàng. Thanh toán thẻ được duyệt tự động (cổng thanh toán giả
lập); chuyển khoản và COD giữ trạng thái `pending` cho tới khi nhân viên xác nhận. Hoàn tiền thực hiện
qua việc huỷ đơn hàng.

## Cổng
- **8005** (cổng nội bộ)
- Truy cập qua gateway: `http://localhost:8080/api/v1/payment/`

## Cơ sở dữ liệu
- **PostgreSQL**, database `payment_db`

## Model
- **Payment**: order_id (duy nhất), user_id (chủ đơn), amount, status (`pending`, `success`, `failed`),
  paid_at, payment_method (`card`, `bank`, `cash`), items_json và address (sao từ đơn hàng để saga chạy
  tiếp sau khi nhân viên xác nhận)

## Vai trò trong saga (RabbitMQ, exchange `saga-events`)
| Nhận | Xử lý | Phát |
|---|---|---|
| `saga-order-created` | Tạo bản ghi thanh toán (chống trùng theo đơn). Thẻ: `success`. Chuyển khoản / COD: `pending` | `saga-payment-success` hoặc `saga-payment-pending` (cả hai đều cho phép product-service giữ kho) |
| `saga-stock-failed`, `saga-order-cancelled` | Chuyển thanh toán sang `failed` (hoàn tiền) | `saga-payment-refunded` |

## API
Mọi endpoint đều cần JWT.

- `GET /api/v1/payment/status/?order_id={id}` - Thanh toán của một đơn. Khách chỉ xem được đơn của mình.
- `POST /api/v1/payment/{order_id}/confirm/` - Staff / admin xác nhận đã nhận tiền cho đơn chuyển khoản
  hoặc COD đang `pending` (409 nếu đơn đã huỷ). Phát `saga-payment-confirmed`, nhờ đó shipping-service
  chuyển vận đơn sang bước tiếp theo.

Không có endpoint "thanh toán" hay "hoàn tiền" thủ công: bản ghi thanh toán do saga tạo, còn hoàn tiền
thực hiện bằng cách huỷ đơn trên back office (đồng thời hoàn kho).

## Chạy

### Local
```bash
pip install -r requirements.txt
cp .env.example .env
python manage.py migrate
python manage.py runserver 0.0.0.0:8005
```

### Docker
```bash
cd infrastructure
docker compose up -d --build payment-service
```

## Ví dụ

```bash
# Trạng thái thanh toán của đơn
curl "http://localhost:8080/api/v1/payment/status/?order_id=5" -H "Authorization: Bearer <access_token>"

# Xác nhận đã nhận tiền chuyển khoản / COD (staff)
curl -X POST http://localhost:8080/api/v1/payment/5/confirm/ -H "Authorization: Bearer <staff_token>"
```
