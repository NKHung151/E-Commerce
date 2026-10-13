# Order Service

## Overview
The Order Service acts as the Saga orchestrator for the e-commerce platform.
It implements an orchestration-based saga pattern that coordinates order creation across product, payment, and shipping services.
All order amounts use DecimalField for precision.

## Port
- **8004** (internal service port)
- Accessed via Nginx gateway at `http://localhost:8080/api/v1/orders/`

## Database
- **PostgreSQL** at `postgres:5432`
- Database: `order_db`
- Credentials: admin/123456

## Models
- **Order**
  - Fields: id, user_id (indexed), total_price (DecimalField), status, address, created_at, updated_at
  - Status choices: pending_payment, paid, cancelled
  - Relationship: One-to-many with OrderItem

- **OrderItem**
  - Fields: id, order_id, product_id (indexed), quantity, unit_price (DecimalField), created_at
  - Relationship: Many-to-one with Order

## Saga (choreographed over RabbitMQ, exchange `saga-events`)

```
POST /api/v1/orders/
 1. Validate: items (max 50 lines, duplicates merged), address required, payment_method in card|bank|cash
 2. Price every line from product-service (never from the client), pre-check stock (products fetched in parallel)
 3. Save Order (status=pending) + items, publish saga-order-created          -> 201 {order}

payment-service   saga-order-created  -> saga-payment-success | saga-payment-pending (COD/bank) | saga-payment-failed
product-service   saga-payment-*      -> reserve stock atomically -> saga-stock-reduced | saga-stock-failed
shipping-service  saga-stock-reduced  -> create shipment -> saga-shipping-created
order-service     saga-shipping-created -> status=processing, report a "purchase" per item to the AI service
                  saga-payment-failed / saga-stock-failed / saga-payment-refunded -> status=cancelled
staff cancels     -> saga-order-cancelled: product-service restores stock, payment-service refunds
```

Purchases are reported to the AI service only when the saga succeeds, so failed or cancelled-at-checkout
orders do not teach the recommender anything.

## API Endpoints

All endpoints require JWT authentication.

### Customers (own orders)
- `POST /api/v1/orders/` - Place an order
  - Body: `{"items": [{"product_id": 1, "quantity": 2}], "address": "123 Main St", "payment_method": "cash"}`
  - Returns 201 with the order (`status: pending`); 400 with a Vietnamese message on validation errors,
    503 if product-service is unreachable
- `GET /api/v1/orders/` - Own orders, paginated (`page`, `page_size`)
- `GET /api/v1/orders/{id}/` - One own order

### Back office (staff / admin) - `/api/v1/staff/orders/`
- `GET /staff/orders/` - All orders; `search` matches order id, user id, status or address
- `GET /staff/orders/{id}/`
- `PATCH /staff/orders/{id}/update_status/` - `{"status": "..."}`; allowed transitions:
  pending -> processing | cancelled, processing -> shipped | cancelled, shipped -> delivered.
  cancelled / shipped / delivered publish the matching saga event.

## Security
- user_id always from JWT payload (never from request body)
- Prices always from product-service (never from client)
- Product stock validated before order creation
- Ownership enforced: customers see only own orders

## Setup & Running

### Local Development
```bash
# Install dependencies
pip install -r requirements.txt

# Create .env file
cp .env.example .env

# Run migrations
python manage.py migrate

# Start server
python manage.py runserver 0.0.0.0:8004
```

### Docker
```bash
# Build image
docker build -t order-service .

# Run with Docker Compose
cd infrastructure
docker-compose up order-service
```

## Example Requests

### Create Order
```bash
curl -X POST http://localhost:8080/api/v1/orders/create/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <access_token>" \
  -d '{
    "items": [
      {"product_id": 1, "quantity": 2},
      {"product_id": 3, "quantity": 1}
    ],
    "address": "123 Main Street, City, State 12345"
  }'
```

### List Orders
```bash
curl -X GET http://localhost:8080/api/v1/orders/?page=1&page_size=10 \
  -H "Authorization: Bearer <access_token>"
```

### Get Order Details
```bash
curl -X GET http://localhost:8080/api/v1/orders/5/ \
  -H "Authorization: Bearer <access_token>"
```

### Update Order Status (Staff/Admin)
```bash
curl -X PATCH http://localhost:8080/api/v1/orders/5/update_status/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <staff_token>" \
  -d '{"status": "cancelled"}'
```

## Service Dependencies
- **product-service**: GET products with stock validation (3 retries, 1s wait)
- **payment-service**: POST payment/pay (2 retries, 2s wait)
- **shipping-service**: POST shipping/create (2 retries, 2s wait)

## Error Responses
- 400: Invalid request, product not found, insufficient stock
- 402: Payment failed
- 403: Permission denied (ownership violation)
- 404: Order not found
- 500: Internal server error
- 502: Upstream service unavailable

## Notes
- Decimal precision: max_digits=12, decimal_places=2
- Pagination: default 10 items per page
- Fetching products from product-service is retried (tenacity, 3 attempts)
- Payment, stock and shipping steps are driven by saga events over RabbitMQ (exchange `saga-events`)
