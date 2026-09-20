# Product Service

## Overview
The Product Service manages the product catalog including categories and product variants (Books, Electronics, Fashion).
It provides read access for all users and write access for staff and admin roles.
All prices use DecimalField for precision.

## Port
- **8002** (internal service port)
- Accessed via Nginx gateway at `http://localhost:8080/api/v1/`

## Database
- **PostgreSQL** at `postgres:5432`
- Database: `product_db`
- Credentials: admin/123456

## Features
- **10 Product Categories**: Books, Electronics, Fashion, Home & Living, Sports & Outdoors, Beauty & Health, Toys & Games, Automotive, Food & Grocery, Office Supplies
- **Product Types**: Generic products with specialized types (Book, Electronics, Fashion)
- **Seeding**: Includes 15+ seed products across categories
- **Pagination**: All list endpoints support pagination (page, page_size)
- **DecimalField**: All prices stored with precision (max_digits=12, decimal_places=2)

## Models
- **Category**
  - Fields: id, name (unique), created_at, updated_at

- **Product**
  - Fields: id, name, description, price (DecimalField), stock, image_url, category_id, created_at, updated_at
  - Indexes: category

- **Book** (extends Product via OneToOne)
  - Fields: id, product_id, author, publisher, isbn (unique)

- **Electronics** (extends Product via OneToOne)
  - Fields: id, product_id, brand, warranty (months)

- **Fashion** (extends Product via OneToOne)
  - Fields: id, product_id, size, color

- **HomeLiving** (extends Product via OneToOne)
  - Fields: id, product_id, material, dimensions

- **SportsOutdoors** (extends Product via OneToOne)
  - Fields: id, product_id, sport_type, weight

- **BeautyHealth** (extends Product via OneToOne)
  - Fields: id, product_id, ingredient, volume

- **ToysGames** (extends Product via OneToOne)
  - Fields: id, product_id, age_range, players

- **Automotive** (extends Product via OneToOne)
  - Fields: id, product_id, vehicle_type, compatibility

- **FoodGrocery** (extends Product via OneToOne)
  - Fields: id, product_id, expiry_days, weight

- **OfficeSupplies** (extends Product via OneToOne)
  - Fields: id, product_id, pack_size, material

## API Endpoints

### Categories
- `GET /api/v1/categories/` - List all categories (AllowAny)
- `POST /api/v1/categories/` - Create category (IsAdminRole)

### Products
- `GET /api/v1/products/` - List all products with pagination (AllowAny)
  - Query params: `?page=1&page_size=10`
- `GET /api/v1/products/{id}/` - Get product by ID (AllowAny)
- `POST /api/v1/products/` - Create product (IsStaffOrAdmin)
- `PUT /api/v1/products/{id}/` - Update product (IsStaffOrAdmin)
- `DELETE /api/v1/products/{id}/` - Delete product (IsAdminRole)

### Books
- `GET /api/v1/books/` - List all books with pagination (AllowAny)
- `GET /api/v1/books/{id}/` - Get book by ID (AllowAny)
- `POST /api/v1/books/` - Create book (IsStaffOrAdmin)
- `PUT /api/v1/books/{id}/` - Update book (IsStaffOrAdmin)
- `DELETE /api/v1/books/{id}/` - Delete book (IsAdminRole)

### Electronics
- `GET /api/v1/electronics/` - List all electronics with pagination (AllowAny)
- `GET /api/v1/electronics/{id}/` - Get electronics by ID (AllowAny)
- `POST /api/v1/electronics/` - Create electronics (IsStaffOrAdmin)
- `PUT /api/v1/electronics/{id}/` - Update electronics (IsStaffOrAdmin)
- `DELETE /api/v1/electronics/{id}/` - Delete electronics (IsAdminRole)

### Fashion
- `GET /api/v1/fashion/` - List all fashion items with pagination (AllowAny)
- `GET /api/v1/fashion/{id}/` - Get fashion item by ID (AllowAny)
- `POST /api/v1/fashion/` - Create fashion item (IsStaffOrAdmin)
- `PUT /api/v1/fashion/{id}/` - Update fashion item (IsStaffOrAdmin)
- `DELETE /api/v1/fashion/{id}/` - Delete fashion item (IsAdminRole)

### Home & Living
- `GET /api/v1/home-living/` - List all home & living items with pagination (AllowAny)
- `GET /api/v1/home-living/{id}/` - Get home & living item by ID (AllowAny)
- `POST /api/v1/home-living/` - Create home & living item (IsStaffOrAdmin)
- `PUT /api/v1/home-living/{id}/` - Update home & living item (IsStaffOrAdmin)
- `DELETE /api/v1/home-living/{id}/` - Delete home & living item (IsAdminRole)

### Sports & Outdoors
- `GET /api/v1/sports-outdoors/` - List all sports & outdoors items with pagination (AllowAny)
- `GET /api/v1/sports-outdoors/{id}/` - Get sports & outdoors item by ID (AllowAny)
- `POST /api/v1/sports-outdoors/` - Create sports & outdoors item (IsStaffOrAdmin)
- `PUT /api/v1/sports-outdoors/{id}/` - Update sports & outdoors item (IsStaffOrAdmin)
- `DELETE /api/v1/sports-outdoors/{id}/` - Delete sports & outdoors item (IsAdminRole)

### Beauty & Health
- `GET /api/v1/beauty-health/` - List all beauty & health items with pagination (AllowAny)
- `GET /api/v1/beauty-health/{id}/` - Get beauty & health item by ID (AllowAny)
- `POST /api/v1/beauty-health/` - Create beauty & health item (IsStaffOrAdmin)
- `PUT /api/v1/beauty-health/{id}/` - Update beauty & health item (IsStaffOrAdmin)
- `DELETE /api/v1/beauty-health/{id}/` - Delete beauty & health item (IsAdminRole)

### Toys & Games
- `GET /api/v1/toys-games/` - List all toys & games items with pagination (AllowAny)
- `GET /api/v1/toys-games/{id}/` - Get toys & games item by ID (AllowAny)
- `POST /api/v1/toys-games/` - Create toys & games item (IsStaffOrAdmin)
- `PUT /api/v1/toys-games/{id}/` - Update toys & games item (IsStaffOrAdmin)
- `DELETE /api/v1/toys-games/{id}/` - Delete toys & games item (IsAdminRole)

### Automotive
- `GET /api/v1/automotive/` - List all automotive items with pagination (AllowAny)
- `GET /api/v1/automotive/{id}/` - Get automotive item by ID (AllowAny)
- `POST /api/v1/automotive/` - Create automotive item (IsStaffOrAdmin)
- `PUT /api/v1/automotive/{id}/` - Update automotive item (IsStaffOrAdmin)
- `DELETE /api/v1/automotive/{id}/` - Delete automotive item (IsAdminRole)

### Food & Grocery
- `GET /api/v1/food-grocery/` - List all food & grocery items with pagination (AllowAny)
- `GET /api/v1/food-grocery/{id}/` - Get food & grocery item by ID (AllowAny)
- `POST /api/v1/food-grocery/` - Create food & grocery item (IsStaffOrAdmin)
- `PUT /api/v1/food-grocery/{id}/` - Update food & grocery item (IsStaffOrAdmin)
- `DELETE /api/v1/food-grocery/{id}/` - Delete food & grocery item (IsAdminRole)

### Office Supplies
- `GET /api/v1/office-supplies/` - List all office supplies items with pagination (AllowAny)
- `GET /api/v1/office-supplies/{id}/` - Get office supplies item by ID (AllowAny)
- `POST /api/v1/office-supplies/` - Create office supplies item (IsStaffOrAdmin)
- `PUT /api/v1/office-supplies/{id}/` - Update office supplies item (IsStaffOrAdmin)
- `DELETE /api/v1/office-supplies/{id}/` - Delete office supplies item (IsAdminRole)

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
python manage.py runserver 0.0.0.0:8002
```

### Docker
```bash
# Build image
docker build -t product-service .

# Run with Docker Compose
cd infrastructure
docker-compose up product-service
```

## Example Requests

### List Products
```bash
curl -X GET http://localhost:8080/api/v1/products/?page=1&page_size=10
```

### Get Product by ID
```bash
curl -X GET http://localhost:8080/api/v1/products/1/
```

### List Books
```bash
curl -X GET http://localhost:8080/api/v1/books/?page=1
```

### Create Electronics (Staff only)
```bash
curl -X POST http://localhost:8080/api/v1/electronics/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <access_token>" \
  -d '{
    "product": {
      "name": "New Laptop",
      "description": "High-performance laptop",
      "price": "999.99",
      "stock": 20,
      "category": 2
    },
    "brand": "TechBrand",
    "warranty": 24
  }'
```

## Seed Data
Seed data is managed via SQL files in `infrastructure/`:
- `seed-postgres.sql` — 10 categories + 35 sample products across all types
- See `infrastructure/` directory for details

## Notes
- All prices use DecimalField for precision
- Product.category is required
- ISBN and email fields are unique
- Pagination defaults to 10 items per page
- JWT authentication required for POST/PUT/DELETE operations
- All 10 product types have identical CRUD endpoints (GET, POST, PUT, DELETE)

