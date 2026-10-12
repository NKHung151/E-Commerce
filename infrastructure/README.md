# E-Commerce Microservices Platform

## Project Overview

A distributed microservices e-commerce platform featuring:
- **6 Django REST Framework services** (user, product, cart, order, payment, shipping)
- **Nginx API Gateway** (port 8080) as the single entry point
- **MySQL** for user data
- **PostgreSQL** for all other services
- **Saga orchestration** for distributed order processing
- **JWT authentication** with role-based access control
- **Docker Compose** for local development

## Quick Start

### Prerequisites
- Docker & Docker Compose
- Python 3.11+ (for local development)

### Run with Docker Compose
```bash
cd infrastructure
docker-compose up
```

This starts:
- MySQL (port 3306)
- PostgreSQL (port 5432)
- Nginx Gateway (port 8080)
- All 6 services (ports 8001-8006)

### Access Points
- **API Gateway**: http://localhost:8080
- **User Service**: http://localhost:8001
- **Product Service**: http://localhost:8002
- **Cart Service**: http://localhost:8003
- **Order Service**: http://localhost:8004
- **Payment Service**: http://localhost:8005
- **Shipping Service**: http://localhost:8006

## Project Structure
```
E-Commerce/
├── gateway/               # Nginx reverse proxy
│   ├── nginx.conf
│   ├── Dockerfile
│   └── README.md
├── user-service/          # Auth & user management (MySQL)
├── product-service/       # Product catalog (PostgreSQL)
├── cart-service/          # Shopping cart (PostgreSQL)
├── order-service/         # Order orchestration (PostgreSQL)
├── payment-service/       # Payment processing (PostgreSQL)
├── shipping-service/      # Shipment tracking (PostgreSQL)
└── infrastructure/
    ├── docker-compose.yml
    ├── init-db.sql
    └── README.md
```

## Key Features

### 1. API Gateway (Nginx)
- Single entry point at port 8080
- Routes `/api/v1/*` to downstream services
- Rate limiting: 10 req/s per IP (burst 20)
- Forward Authorization headers
- Health check endpoint

### 2. Authentication
- JWT tokens issued by user-service
- Tokens include: user_id, role, email
- Shared JWT_SECRET across all services
- Token expiration: 1 hour access, 7 days refresh
- Role-based access control: admin, staff, customer

### 3. Service Communication
- REST-based inter-service calls
- Automatic retries (tenacity library)
- Timeout: 5-10s per call
- Service discovery via docker-compose hostnames

### 4. Saga Pattern
Order creation orchestrates:
1. **Validate** products in product-service
2. **Create** order with status=pending_payment
3. **Call** payment-service
4. **Update** order status to paid
5. **Create** shipment in shipping-service

### 5. Data Integrity
- All money fields: DecimalField (12,2)
- user_id from JWT (never from client)
- Prices from product-service (never from client)
- Ownership enforced on all resources
- Unique: email, isbn, order_id per payment

### 6. Production Readiness
- Structured logging in all services
- Health check endpoints
- Pagination on list endpoints
- Unified JSON error format
- Database indexes on frequently queried fields
- Docker containers with minimal base image

## API Documentation

### User Service (port 8001)
```
POST   /api/v1/auth/register/      # User registration
POST   /api/v1/auth/login/         # Get JWT tokens
POST   /api/v1/auth/refresh/       # Refresh token
GET    /api/v1/users/              # List users (admin)
GET    /api/v1/users/{id}/         # Get user (admin)
```

### Product Service (port 8002)
```
GET    /api/v1/products/           # List products (paginated)
GET    /api/v1/products/{id}/      # Get product
GET    /api/v1/categories/         # List categories
GET    /api/v1/books/              # List books
GET    /api/v1/electronics/        # List electronics
GET    /api/v1/fashion/            # List fashion items
POST   /api/v1/products/           # Create product (staff+)
PUT    /api/v1/products/{id}/      # Update product (staff+)
```

### Cart Service (port 8003)
```
GET    /api/v1/cart/list_cart/     # Get user's cart
POST   /api/v1/cart/add_item/      # Add to cart
PUT    /api/v1/cart/update_item/   # Update quantity
DELETE /api/v1/cart/remove_item/   # Remove item
DELETE /api/v1/cart/clear_cart/    # Clear entire cart
```

### Order Service (port 8004) — Saga Orchestrator
```
POST   /api/v1/orders/create/      # Create order (with payment & shipping)
GET    /api/v1/orders/             # List orders
GET    /api/v1/orders/{id}/        # Get order
PATCH  /api/v1/orders/{id}/update_status/  # Update status (staff+)
```

### Payment Service (port 8005)
```
POST   /api/v1/payment/pay/        # Process payment
GET    /api/v1/payment/status/     # Check payment status
```

### Shipping Service (port 8006)
```
POST   /api/v1/shipping/create/    # Create shipment
GET    /api/v1/shipping/status/    # Check shipment status
PATCH  /api/v1/shipping/{id}/update_status/  # Update status (staff+)
```

## Example Workflow

### 1. Register User
```bash
curl -X POST http://localhost:8080/api/v1/auth/register/ \
  -H "Content-Type: application/json" \
  -d '{
    "username": "john_doe",
    "email": "john@example.com",
    "password": "SecurePass123!",
    "role": "customer"
  }'
```

### 2. Login
```bash
curl -X POST http://localhost:8080/api/v1/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{
    "username": "john_doe",
    "password": "SecurePass123!"
  }'
# Returns: {"access": "<token>", "refresh": "<token>"}
```

### 3. Browse Products
```bash
curl -X GET http://localhost:8080/api/v1/products/?page=1&page_size=10
```

### 4. Add to Cart
```bash
curl -X POST http://localhost:8080/api/v1/cart/add_item/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <access_token>" \
  -d '{
    "product_id": 1,
    "quantity": 2,
    "unit_price": "29.99"
  }'
```

### 5. Create Order (Triggers Saga)
```bash
curl -X POST http://localhost:8080/api/v1/orders/create/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <access_token>" \
  -d '{
    "items": [{"product_id": 1, "quantity": 2}],
    "address": "123 Main St, City, State"
  }'
```

## Database Schema

### user_db (MySQL)
- User (extends Django AbstractUser)

### product_db (PostgreSQL)
- Category
- Product
- Book
- Electronics
- Fashion

### cart_db (PostgreSQL)
- Cart
- CartItem

### order_db (PostgreSQL)
- Order
- OrderItem

### payment_db (PostgreSQL)
- Payment

### shipping_db (PostgreSQL)
- Shipment

## Environment Variables

All services use `.env` files. See `.env.example` in each service directory.

Common variables:
- `SECRET_KEY`: Django secret
- `DEBUG`: True/False
- `DB_ENGINE`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT`
- `JWT_SECRET`: Shared across all services
- `ALLOWED_HOSTS`: CORS allowlist

## Deployment

### Local Development
```bash
cd infrastructure
docker-compose up
```

### Production (Future)
- Use separate production docker-compose file
- Configure environment-specific .env files
- Set DEBUG=False
- Use proper JWT_SECRET (NOT shared-jwt-secret)
- Configure ALLOWED_HOSTS properly
- Enable HTTPS on Nginx
- Set up log aggregation
- Configure monitoring (Prometheus/Grafana)

## Troubleshooting

### Port Conflicts
If ports are in use, update docker-compose.yml port mappings.

### Database Migrations
If services fail to migrate, check database connection:
```bash
docker-compose logs postgres
docker-compose logs mysql
```

### Service Discovery
Services use docker-compose hostnames (user-service, postgres, etc.).
This only works inside Docker network.

### View Logs
```bash
docker-compose logs -f <service-name>
```

## Development Notes

### Adding New Service
1. Create new directory: `<service-name>/`
2. Create Django app structure
3. Add Dockerfile with port 800X
4. Update docker-compose.yml
5. Update Nginx nginx.conf routes

### Modifying Database Schema
1. Update model
2. Run: `python manage.py makemigrations`
3. Run: `python manage.py migrate`
4. In Docker: migrations run automatically on startup

### Testing APIs
Use Postman, curl, or VS Code REST Client.
See individual service READMEs for detailed examples.

## Security Considerations
- JWT tokens expire and require refresh
- All requests validated against user_id in JWT
- Prices always resolved from backend (not client)
- Rate limiting prevents abuse
- CORS configured for gateway
- Database passwords configured via environment

## Next Steps
- Add RabbitMQ for async event-driven architecture
- Implement circuit breaker pattern
- Add structured JSON logging
- Create Kubernetes deployment manifests
- Set up Prometheus + Grafana monitoring
- Add comprehensive integration tests
