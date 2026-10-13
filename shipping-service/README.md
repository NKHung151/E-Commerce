# Shipping Service

## Tổng quan
Mỗi đơn hàng có một vận đơn. Vận đơn chỉ được tạo và chuyển trạng thái bởi saga; trạng thái đơn hàng là
nguồn dữ liệu duy nhất, back office chỉ xem vận đơn.

## Cổng
- **8006** (cổng nội bộ)
- Truy cập qua gateway: `http://localhost:8080/api/v1/staff/shipping/` (chỉ staff/admin)

## Cơ sở dữ liệu
- **PostgreSQL**, database `shipping_db`

## Model
- **Shipment**: order_id (duy nhất), address, status (`pending_payment`, `processing`, `shipping`,
  `delivered`, `cancelled`), created_at, updated_at

## Vai trò trong saga (RabbitMQ, exchange `saga-events`)
| Nhận | Xử lý | Phát |
|---|---|---|
| `saga-stock-reduced` | Thẻ / COD: vận đơn `processing`. Chuyển khoản: `pending_payment` (chờ nhân viên xác nhận tiền) | `saga-shipping-created` (thẻ / COD) |
| `saga-payment-confirmed` | `pending_payment` -> `processing` | `saga-shipping-created` |
| `saga-order-shipped` / `saga-order-delivered` | Đi theo đơn hàng: `shipping` / `delivered` | |
| `saga-order-cancelled` | `pending_payment` / `processing` -> `cancelled` | |

`saga-shipping-created` là sự kiện chuyển đơn hàng sang `processing` (và báo lượt mua cho AI).

## API
- `GET /api/v1/staff/shipping/status/?order_id={id}` - Vận đơn của một đơn (staff/admin); trả 404 khi
  saga chưa tạo vận đơn

Muốn chuyển trạng thái vận đơn, hãy đổi trạng thái đơn hàng trên back office
(`PATCH /api/v1/staff/orders/{id}/update_status/`).

## Chạy

### Local
```bash
pip install -r requirements.txt
cp .env.example .env
python manage.py migrate
python manage.py runserver 0.0.0.0:8006
```

### Docker
```bash
cd infrastructure
docker compose up -d --build shipping-service
```

## Ví dụ
```bash
curl "http://localhost:8080/api/v1/staff/shipping/status/?order_id=5" -H "Authorization: Bearer <staff_token>"
```
