# Catalog Service

## Overview
Owns the product categories. Products (product-service) store only the category id; the storefront,
the back office and the AI service resolve the name here.

## Port
- **8008** (internal service port)
- Accessed via the Nginx gateway at `http://localhost:8080/api/v1/categories/`

## Database
- **PostgreSQL**, database `catalog_db`
- Migration `0002_seed_categories` creates the ten demo categories with fixed ids 1-10 (Books,
  Electronics, Fashion, Home & Living, Sports & Outdoors, Beauty & Health, Toys & Games, Automotive,
  Food & Grocery, Office Supplies), which the seeded products reference

## Model
- **Category**: id, name (unique), created_at, updated_at

## API Endpoints
- `GET /api/v1/categories/` - Paginated list ordered by name (public)
- `GET /api/v1/categories/{id}/` - One category (public)
- `POST /api/v1/categories/`, `PUT|PATCH /api/v1/categories/{id}/` - admin only
- `DELETE /api/v1/categories/{id}/` - admin only; refused with 409 while product-service still has products
  in the category (503 if product-service cannot be asked), so products never point at a deleted category

## Notes
- The back office maps the English category names to the product type form (author for Books, brand for
  Electronics, ...): renaming one of the ten seeded categories detaches its products from that form.
- product-service caches category names for 5 minutes.

## Setup & Running
```bash
pip install -r requirements.txt
cp .env.example .env
python manage.py migrate
python manage.py runserver 0.0.0.0:8008
```
