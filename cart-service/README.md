# Cart Service

## Tổng quan
Quản lý giỏ hàng. Mỗi khách hàng có đúng một giỏ, được giữ lại giữa các lần đăng nhập. Giá, tình trạng
còn hàng và tồn kho luôn lấy từ product-service, không bao giờ tin giá trị trình duyệt gửi lên.

## Cổng
- **8003** (cổng nội bộ)
- Truy cập qua gateway: `http://localhost:8080/api/v1/cart/`

## Cơ sở dữ liệu
- **PostgreSQL**, database `cart_db`

## Model
- **Cart**: user_id (duy nhất), created_at, updated_at
- **CartItem**: cart, product_id, quantity, unit_price (giá tại lần thêm/sửa gần nhất), created_at,
  updated_at; mỗi sản phẩm chỉ xuất hiện một lần trong một giỏ

## API
Mọi endpoint đều cần JWT và chỉ thao tác trên giỏ của chính người gọi (`user_id` lấy từ token).

- `GET /api/v1/cart/list_cart/` - Giỏ hàng hiện tại
- `POST /api/v1/cart/add_item/` - Thêm sản phẩm `{"product_id": 1, "quantity": 2}`
  - Tổng số lượng trong giỏ không được vượt tồn kho; sản phẩm hết hàng bị từ chối
  - 404 nếu sản phẩm không tồn tại, 503 nếu không gọi được product-service
  - Sự kiện `add_to_cart` được gửi cho AI service
- `PUT /api/v1/cart/update_item/` - Đổi số lượng `{"product_id": 1, "quantity": 5}` (0 là xoá); kiểm tra
  tồn kho và cập nhật lại giá
- `DELETE /api/v1/cart/remove_item/` - Xoá một sản phẩm `{"product_id": 1}`
- `DELETE /api/v1/cart/clear_cart/` - Xoá toàn bộ giỏ

Thông báo lỗi cho khách bằng tiếng Việt (ví dụ "Chỉ còn 5 sản phẩm trong kho").

## Chạy

### Local
```bash
pip install -r requirements.txt
cp .env.example .env
python manage.py migrate
python manage.py runserver 0.0.0.0:8003
```

### Docker
```bash
cd infrastructure
docker compose up -d --build cart-service
```

## Ví dụ

```bash
# Xem giỏ
curl http://localhost:8080/api/v1/cart/list_cart/ -H "Authorization: Bearer <access_token>"

# Thêm sản phẩm
curl -X POST http://localhost:8080/api/v1/cart/add_item/ \
  -H "Content-Type: application/json" -H "Authorization: Bearer <access_token>" \
  -d '{"product_id": 1, "quantity": 2}'

# Đổi số lượng
curl -X PUT http://localhost:8080/api/v1/cart/update_item/ \
  -H "Content-Type: application/json" -H "Authorization: Bearer <access_token>" \
  -d '{"product_id": 1, "quantity": 5}'

# Xoá một sản phẩm / xoá cả giỏ
curl -X DELETE http://localhost:8080/api/v1/cart/remove_item/ \
  -H "Content-Type: application/json" -H "Authorization: Bearer <access_token>" -d '{"product_id": 1}'
curl -X DELETE http://localhost:8080/api/v1/cart/clear_cart/ -H "Authorization: Bearer <access_token>"
```
