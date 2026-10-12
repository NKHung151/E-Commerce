# Shipping Service

## Overview
The Shipping Service manages order shipments and tracks delivery status.
Shipments are created after successful payment in the order saga.

## Port
- **8006** (internal service port)
- Accessed via Nginx gateway at `http://localhost:8080/api/v1/staff/shipping/` (staff/admin only)

## Database
- **PostgreSQL** at `postgres:5432`
- Database: `shipping_db`
- Credentials: admin/123456

## Models
- **Shipment**
  - Fields: id, order_id (unique, indexed), address, status, created_at, updated_at
  - Status choices: pending_payment, processing, shipping, delivered, cancelled
  - Shipments are created by the saga (`saga-stock-reduced`, `saga-payment-confirmed`) and cancelled on `saga-order-cancelled`

## API Endpoints

### Shipment Operations
- `POST /api/v1/staff/shipping/create/` - Create shipment manually (IsStaffOrAdmin)
  - Body: `{"order_id": 1, "address": "123 Main St"}`
  - Returns: Created Shipment record
  - HTTP 201: Created
  - HTTP 500: Processing error

- `GET /api/v1/staff/shipping/status/?order_id={id}` - Get shipment status (IsStaffOrAdmin)
  - Query param: `order_id` (required)
  - Returns: Shipment record
  - HTTP 200: Found
  - HTTP 404: Not found

- `PATCH /api/v1/staff/shipping/{id}/update_status/` - Update shipment status (IsStaffOrAdmin)
  - Body: `{"status": "shipping"}`
  - Forward-only transitions: pending_payment → processing → shipping → delivered (cancelled from pending_payment/processing)
  - Returns: Updated Shipment record
  - HTTP 200: Updated
  - HTTP 400: Invalid status

## Shipment Lifecycle
1. Order Service calls POST /create after payment success
2. Shipment created with status=processing
3. Staff can update status to shipping and then delivered
4. Customers can check status at any time

## Security
- JWT authentication required for all endpoints
- Staff/Admin can create and update shipments
- Customers can only view status

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
python manage.py runserver 0.0.0.0:8006
```

### Docker
```bash
# Build image
docker build -t shipping-service .

# Run with Docker Compose
cd infrastructure
docker-compose up shipping-service
```

## Example Requests

### Create Shipment (Order Service)
```bash
curl -X POST http://localhost:8080/api/v1/staff/shipping/create/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <access_token>" \
  -d '{
    "order_id": 5,
    "address": "123 Main Street, City, State 12345"
  }'
```

### Check Shipment Status
```bash
curl -X GET http://localhost:8080/api/v1/staff/shipping/status/?order_id=5 \
  -H "Authorization: Bearer <access_token>"
```

### Update Shipment Status (Staff)
```bash
curl -X PATCH http://localhost:8080/api/v1/staff/shipping/1/update_status/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <staff_token>" \
  -d '{"status": "shipping"}'
```

## Integration with Saga
1. Order Service completes payment
2. Order Service calls shipping-service: POST /create/
3. Shipping Service creates Shipment with status=processing
4. Order Service continues (logs error if shipment fails, but order stays paid)

## Notes
- One shipment per order (order_id is unique)
- Address stored as provided by order
- Status transitions: processing → shipping → delivered
- Errors in shipment creation don't cause order rollback
