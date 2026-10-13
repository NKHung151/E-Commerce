# Comment & Rating Service

## Overview
Product reviews (1-5 stars and a comment). Every change recomputes the product's rating and pushes it to
product-service, which stores it read-only on the product.

## Port
- **8009** (internal service port)
- Accessed via the Nginx gateway at `http://localhost:8080/api/v1/comments/`

## Database
- **PostgreSQL**, database `comment_db`
- Migration `0002_seed_reviews` loads 445 demo reviews written by customers who bought the product
  (`comment_app/seed/reviews.json`, generated with the demo catalogue)

## Model
- **Comment**: product_id, user_id, username (both from the JWT), rating (1-5), comment_text,
  created_at, updated_at. **One review per user and product** (unique constraint).

## API Endpoints
- `GET /api/v1/comments/?product_id={id}` - Reviews of a product, newest first (public)
- `POST /api/v1/comments/` - `{"product_id": 1, "rating": 5, "comment_text": "..."}` (logged-in user).
  400 if the user already reviewed the product (edit that review instead) or the product does not exist.
- `PATCH|PUT /api/v1/comments/{id}/` - Author or admin; the product of a review cannot be changed
- `DELETE /api/v1/comments/{id}/` - Author or admin

Validation messages are in Vietnamese (`LANGUAGE_CODE = 'vi'`), as the storefront shows them.

## Rating
`rating = (sum of stars + 5 x 5.0) / (number of reviews + 5)`: a Bayesian average with five virtual 5-star
reviews, so a single bad review does not sink a product. With no review left the rating is `0` ("not
rated yet"). It is sent to `POST /api/v1/products/{id}/update_rating/` with the `X-Internal-Token`.

## Setup & Running
```bash
pip install -r requirements.txt
cp .env.example .env
python manage.py migrate
python manage.py runserver 0.0.0.0:8009
```
