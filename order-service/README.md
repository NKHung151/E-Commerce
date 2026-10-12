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

## Saga Orchestration Flow

**POST /api/v1/orders/create/**

```
1. Validate Products
   - Fetch product from product-service
   - Verify stock >= quantity
   - Collect unit_price from product (NEVER from client)
   - If validation fails: return 400, abort

2. Create Order
   - Status = 'pending_payment'
   - Create OrderItems with validated prices

3. Call Payment Service
   - POST payment-service: order_id, amount, auth token
   - Success (HTTP 200): Order.status = 'paid'
   - Failure (non-200 or exception after 2 retries):
     - Order.status = 'cancelled'
     - Return 402 {"error": "Payment failed", "code": 402}

4. Create Shipment (if Order.status = 'paid')
   - POST shipping-service: order_id, address, auth token
   - If fails: log error, keep order as 'paid' (no rollback)

5. Return Order (status='paid')
```

## API Endpoints

All endpoints require JWT authentication (IsCustomerOrAbove).

### Order Management
- `POST /api/v1/orders/create/` - Create order with Saga (IsCustomerOrAbove)
  - Body: `{"items": [{"product_id": 1, "quantity": 2}], "address": "123 Main St"}`
  - Returns: Created Order (status: pending_payment or paid)
  - Errors: 400 (validation), 402 (payment failed), 500 (internal error)

- `GET /api/v1/orders/` - List orders (IsCustomerOrAbove)
  - Customers: own orders only
  - Staff/Admin: all orders
  - Query params: `?page=1&page_size=10`

- `GET /api/v1/orders/{id}/` - Get order details (IsCustomerOrAbove)
  - Customers: own orders only
  - Staff/Admin: any order

- `PATCH /api/v1/orders/{id}/update_status/` - Update status (IsStaffOrAdmin)
  - Body: `{"status": "cancelled"}`
  - Status choices: pending_payment, paid, cancelled

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
