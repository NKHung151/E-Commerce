# Shipping Service

## Overview
Keeps one shipment per order. Shipments are created and moved forward only by the order saga; the order
status is the single source of truth, and the back office only reads shipments.

## Port
- **8006** (internal service port)
- Accessed via the Nginx gateway at `http://localhost:8080/api/v1/staff/shipping/` (staff/admin only)

## Database
- **PostgreSQL**, database `shipping_db`

## Model
- **Shipment**: order_id (unique), address, status (`pending_payment`, `processing`, `shipping`,
  `delivered`, `cancelled`), created_at, updated_at

## Saga role (RabbitMQ exchange `saga-events`)
| Consumes | Does | Publishes |
|---|---|---|
| `saga-stock-reduced` | card / cash: shipment `processing`. Bank transfer: `pending_payment` (waits for staff to confirm the money) | `saga-shipping-created` (card / cash) |
| `saga-payment-confirmed` | `pending_payment` -> `processing` | `saga-shipping-created` |
| `saga-order-shipped` / `saga-order-delivered` | follows the order: `shipping` / `delivered` | |
| `saga-order-cancelled` | `pending_payment` / `processing` -> `cancelled` | |

`saga-shipping-created` is what moves the order to `processing` (and reports the purchase to the AI service).

## API Endpoints
- `GET /api/v1/staff/shipping/status/?order_id={id}` - Shipment of an order (staff/admin); 404 until the
  saga has created it

To move a shipment, change the order status in the back office (`PATCH /api/v1/staff/orders/{id}/update_status/`).

## Setup & Running

### Local Development
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

## Example Request
```bash
curl "http://localhost:8080/api/v1/staff/shipping/status/?order_id=5" -H "Authorization: Bearer <staff_token>"
```
