# Cart Service

## Overview
The Cart Service manages shopping carts for customers.
Each user has one cart that persists across sessions.
Cart items include product references with captured unit prices.

## Port
- **8003** (internal service port)
- Accessed via Nginx gateway at `http://localhost:8080/api/v1/cart/`

## Database
- **PostgreSQL** at `postgres:5432`
- Database: `cart_db`
- Credentials: admin/123456

## Models
- **Cart**
  - Fields: id, user_id (indexed), created_at, updated_at
  - Relationship: One-to-many with CartItem

- **CartItem**
  - Fields: id, cart_id, product_id, quantity, unit_price (DecimalField), created_at, updated_at
  - Relationship: Many-to-one with Cart

## API Endpoints

All endpoints require JWT authentication (IsCustomerOrAbove permission).

### Cart Operations
- `GET /api/v1/cart/list_cart/` - Get current user's cart
  - Returns: Cart with all items

- `POST /api/v1/cart/add_item/` - Add item to cart
  - Body: `{"product_id": 1, "quantity": 2}`
  - Price, availability and stock come from product-service (a client price is ignored); the total
    quantity in the cart may not exceed the stock. 503 if product-service is unreachable.
  - Returns: Created CartItem

- `PUT /api/v1/cart/update_item/` - Update cart item quantity
  - Body: `{"product_id": 1, "quantity": 5}` (0 removes the item); checked against the stock, price refreshed
  - Returns: Updated CartItem

- `DELETE /api/v1/cart/remove_item/` - Remove item from cart
  - Body: `{"product_id": 1}`
  - Returns: 204 No Content

- `DELETE /api/v1/cart/clear_cart/` - Clear entire cart
  - Returns: 204 No Content

## Security
- User can only access/modify their own cart (enforced by user_id from JWT)
- Never accept user_id from request body
- Always extract user_id from JWT auth_payload

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
python manage.py runserver 0.0.0.0:8003
```

### Docker
```bash
# Build image
docker build -t cart-service .

# Run with Docker Compose
cd infrastructure
docker-compose up cart-service
```

## Example Requests

### Get Cart
```bash
curl -X GET http://localhost:8080/api/v1/cart/list_cart/ \
  -H "Authorization: Bearer <access_token>"
```

### Add Item to Cart
```bash
curl -X POST http://localhost:8080/api/v1/cart/add_item/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <access_token>" \
  -d '{
    "product_id": 1,
    "quantity": 2
  }'
```

### Update Item Quantity
```bash
curl -X PUT http://localhost:8080/api/v1/cart/update_item/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <access_token>" \
  -d '{
    "product_id": 1,
    "quantity": 5
  }'
```

### Remove Item from Cart
```bash
curl -X DELETE http://localhost:8080/api/v1/cart/remove_item/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <access_token>" \
  -d '{"product_id": 1}'
```

### Clear Cart
```bash
curl -X DELETE http://localhost:8080/api/v1/cart/clear_cart/ \
  -H "Authorization: Bearer <access_token>"
```

## Notes
- Each user has only one cart (get_or_create pattern)
- Unit prices are snapshots from product-service at time of adding to cart
- Quantities can be updated without re-fetching product info
- Cart persists even if not accessed for long periods
