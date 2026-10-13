# Product Service

## Tổng quan
Quản lý danh mục sản phẩm: sản phẩm, thông số riêng theo từng loại (sách, điện tử, …), tồn kho và điểm
đánh giá. Ai cũng xem được; chỉ staff và admin được thêm, sửa. Service tham gia saga đặt hàng (giữ và
hoàn kho) và gửi lượt xem sản phẩm cho AI service.

## Cổng
- **8002** (cổng nội bộ)
- Truy cập qua gateway: `http://localhost:8080/api/v1/`

## Cơ sở dữ liệu
- **PostgreSQL**, database `product_db`
- Migration `0002_seed_products` nạp 300 sản phẩm demo (`product_app/seed/products.json`, sinh bởi
  `infrastructure/seed/generate_seed_data.py` để khớp với log hành vi của AI)

## Model
- **Product**: name, sku, description, price (Decimal 12,2), discount (%), stock, image_url, rating
  (0-5, chỉ đọc: trung bình đánh giá do comment-rate-service cập nhật), is_available, views,
  category (id bên catalog-service)
- Mỗi loại hàng có một model thông số, quan hệ một-một với Product:
  Book (author, publisher, isbn), Electronics (brand, warranty tháng), Fashion (size, color),
  HomeLiving (material, dimensions), SportsOutdoors (sport_type, weight), BeautyHealth (ingredient,
  volume), ToysGames (age_range, players), Automotive (vehicle_type, compatibility),
  FoodGrocery (expiry_days, weight), OfficeSupplies (pack_size, material)
- **StockReservation**: lượng hàng đã giữ cho một đơn, để saga hoàn lại khi cần

## API

### Cửa hàng và các service khác — `/api/v1/products/`
- `GET /products/` - Danh sách có phân trang (`page`, `page_size` ≤ 100). Lọc: `search` (tên, mô tả),
  `category_id`, `min_price`, `max_price`. `personalized=1` sắp xếp theo gợi ý của AI cho người dùng
  trong JWT.
- `GET /products/{id}/` - Chi tiết kèm `category_name` và `details`. `increment_view=true` tăng lượt xem
  và, nếu đã đăng nhập, báo lượt xem cho AI service.
- `POST /products/{id}/update_rating/`, `reduce_stock/`, `rollback_stock/` - dùng nội bộ
  (`X-Internal-Token`) hoặc staff/admin

### Back office — `/api/v1/staff/`
- `GET|POST /staff/products/`, `GET|PUT|PATCH /staff/products/{id}/` - staff hoặc admin. PATCH có thể kèm
  `details: {...}` để sửa thông số theo loại (được kiểm tra, sai kiểu trả 400).
- `DELETE /staff/products/{id}/` - chỉ admin
- `POST /staff/{books|electronics|fashion|home-living|sports-outdoors|beauty-health|toys-games|automotive|food-grocery|office-supplies}/`
  - tạo sản phẩm cùng thông số trong một request (cũng hỗ trợ xem, sửa, xoá)

Mỗi lần tạo, sửa, xoá qua API, service yêu cầu AI xây lại chỉ mục tìm kiếm (sau khi commit, chạy nền).
Việc trừ, hoàn kho của saga thì không.

## Tích hợp
| Với | Cách | Mục đích |
|---|---|---|
| catalog-service | HTTP, cache 5 phút | Lấy `category_name` của sản phẩm |
| ai-service | HTTP + `X-Internal-Token` | Sắp xếp danh sách theo người dùng, xây lại chỉ mục khi danh mục đổi |
| ai-service | RabbitMQ `user-behavior-queue` (dự phòng HTTP) | Sự kiện `view`; một thread nền giữ kết nối cố định |
| RabbitMQ `saga-events` | Nhận `saga-payment-success/pending`, `saga-payment-refunded`, `saga-order-cancelled`; phát `saga-stock-reduced/failed` | Giữ kho nguyên tử (khoá dòng, chống trùng theo đơn) và hoàn kho khi bù trừ |

## Chạy

### Local
```bash
pip install -r requirements.txt
cp .env.example .env
python manage.py migrate
python manage.py runserver 0.0.0.0:8002
```

### Docker
```bash
cd infrastructure
docker compose up -d --build product-service
```

## Ví dụ

```bash
# Tìm kiếm, lọc
curl "http://localhost:8080/api/v1/products/?search=laptop&max_price=25000000&page_size=5"

# Tạo sản phẩm điện tử (staff)
curl -X POST http://localhost:8080/api/v1/staff/electronics/ \
  -H "Content-Type: application/json" -H "Authorization: Bearer <access_token>" \
  -d '{"product": {"name": "New Laptop", "price": "19990000", "stock": 20, "category": 2},
       "brand": "TechBrand", "warranty": 24}'
```
