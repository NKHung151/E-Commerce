# Payment Service

## Overview
Handles the payment step of the order saga. Card payments are approved automatically (simulated
gateway); bank transfer and cash on delivery stay `pending` until staff confirm them. Refunds happen
through order cancellation.

## Port
- **8005** (internal service port)
- Accessed via the Nginx gateway at `http://localhost:8080/api/v1/payment/`

## Database
- **PostgreSQL**, database `payment_db`

## Model
- **Payment**: order_id (unique), user_id (order owner), amount, status (`pending`, `success`, `failed`),
  paid_at, payment_method (`card`, `bank`, `cash`), items_json and address (copied from the order so the
  saga can resume after a manual confirmation)

## Saga role (RabbitMQ exchange `saga-events`)
| Consumes | Does | Publishes |
|---|---|---|
| `saga-order-created` | creates the payment (idempotent per order). Card: `success`. Bank / cash: `pending` | `saga-payment-success` or `saga-payment-pending` (both let product-service reserve stock) |
| `saga-stock-failed`, `saga-order-cancelled` | marks the payment `failed` (refund) | `saga-payment-refunded` |

## API Endpoints
All endpoints require a JWT.

- `GET /api/v1/payment/status/?order_id={id}` - Payment of an order. Customers only see their own.
- `POST /api/v1/payment/{order_id}/confirm/` - Staff / admin confirm a `pending` bank or cash payment
  (409 for a cancelled one). Publishes `saga-payment-confirmed`, on which shipping-service moves the
  shipment forward.

There is no manual "pay" or "refund" endpoint: payments are created by the saga, and refunding is done by
cancelling the order in the back office, which also restores the stock.

## Setup & Running

### Local Development
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

## Example Requests

```bash
# Payment status of an order
curl "http://localhost:8080/api/v1/payment/status/?order_id=5" -H "Authorization: Bearer <access_token>"

# Confirm a bank transfer / cash payment (staff)
curl -X POST http://localhost:8080/api/v1/payment/5/confirm/ -H "Authorization: Bearer <staff_token>"
```
