# Catalog Service

## Tổng quan
Quản lý danh mục sản phẩm. Sản phẩm (bên product-service) chỉ lưu id danh mục; cửa hàng, back office và
AI service lấy tên danh mục từ service này.

## Cổng
- **8008** (cổng nội bộ)
- Truy cập qua gateway: `http://localhost:8080/api/v1/categories/`

## Cơ sở dữ liệu
- **PostgreSQL**, database `catalog_db`
- Migration `0002_seed_categories` tạo 10 danh mục demo với id cố định 1-10 (Books, Electronics, Fashion,
  Home & Living, Sports & Outdoors, Beauty & Health, Toys & Games, Automotive, Food & Grocery,
  Office Supplies), được các sản phẩm seed tham chiếu tới

## Model
- **Category**: id, name (duy nhất), created_at, updated_at

## API
- `GET /api/v1/categories/` - Danh sách có phân trang, sắp theo tên (công khai)
- `GET /api/v1/categories/{id}/` - Một danh mục (công khai)
- `POST /api/v1/categories/`, `PUT|PATCH /api/v1/categories/{id}/` - chỉ admin
- `DELETE /api/v1/categories/{id}/` - chỉ admin; bị từ chối với 409 khi product-service còn sản phẩm thuộc
  danh mục (503 nếu không hỏi được product-service), để sản phẩm không bao giờ trỏ vào danh mục đã xoá

## Lưu ý
- Back office dựa vào tên tiếng Anh của danh mục để chọn form thông số (tác giả cho Books, hãng cho
  Electronics, …): đổi tên một trong 10 danh mục seed sẽ làm sản phẩm của nó mất form thông số.
- product-service cache tên danh mục trong 5 phút.

## Chạy
```bash
pip install -r requirements.txt
cp .env.example .env
python manage.py migrate
python manage.py runserver 0.0.0.0:8008
```
