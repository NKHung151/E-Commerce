# Payment Service

## Overview
The Payment Service processes payments for orders in the e-commerce platform.
It simulates successful payment processing and tracks payment status.

## Port
- **8005** (internal service port)
- Accessed via Nginx gateway at `http://localhost:8080/api/v1/payment/`

## Database
- **PostgreSQL** at `postgres:5432`
- Database: `payment_db`
- Credentials: admin/123456

## Models
- **Payment**
  - Fields: id, order_id (unique, indexed), amount (DecimalField), status, paid_at, created_at, updated_at
  - Status choices: pending, success, failed

## API Endpoints

All endpoints require JWT authentication (IsCustomerOrAbove).

### Payment Operations
- `POST /api/v1/payment/pay/` - Process payment for an order
  - Called by: order-service (Saga orchestrator)
  - Body: `{"order_id": 1, "amount": "150.99"}`
  - Returns: Payment record with status=success
  - HTTP 200: Success
  - HTTP 500: Processing error

- `GET /api/v1/payment/status/?order_id={id}` - Get payment status
  - Called by: customers, staff, admin
  - Query param: `order_id` (required)
  - Returns: Payment record
  - HTTP 200: Payment found
  - HTTP 404: Payment not found

## Payment Processing
- Payment records are created on first payment attempt
- Subsequent calls for same order_id return existing record
- In demo: always succeeds (status=success, paid_at=now)
- In production: integrate with actual payment gateway

## Security
- Requires JWT authentication
- Validates order_id from request (not from JWT)
- Tracks timestamp of successful payments (paid_at)

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
python manage.py runserver 0.0.0.0:8005
```

### Docker
```bash
# Build image
docker build -t payment-service .

# Run with Docker Compose
cd infrastructure
docker-compose up payment-service
```

## Example Requests

### Process Payment
```bash
curl -X POST http://localhost:8080/api/v1/payment/pay/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <access_token>" \
  -d '{
    "order_id": 5,
    "amount": "150.99"
  }'
```

### Check Payment Status
```bash
curl -X GET http://localhost:8080/api/v1/payment/status/?order_id=5 \
  -H "Authorization: Bearer <access_token>"
```

## Integration with Saga
1. Order Service creates Order with status=pending_payment
2. Order Service calls payment-service: POST /pay/
3. Payment Service creates Payment record with status=success
4. Order Service updates Order.status=paid
5. Order Service calls shipping-service

## Notes
- Amount is stored with DecimalField precision (12,2)
- One payment per order (order_id is unique)
- paid_at only set when status=success
- Demo always succeeds; integrate real gateway as needed
