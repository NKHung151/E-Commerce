# Comment & Rating Service

## Tổng quan
Quản lý đánh giá sản phẩm (1-5 sao kèm nhận xét). Mỗi lần đánh giá thay đổi, service tính lại điểm của
sản phẩm và gửi sang product-service, nơi điểm được lưu ở dạng chỉ đọc.

## Cổng
- **8009** (cổng nội bộ)
- Truy cập qua gateway: `http://localhost:8080/api/v1/comments/`

## Cơ sở dữ liệu
- **PostgreSQL**, database `comment_db`
- Migration `0002_seed_reviews` nạp 445 đánh giá demo, do chính khách đã mua sản phẩm viết
  (`comment_app/seed/reviews.json`, sinh cùng danh mục demo)

## Model
- **Comment**: product_id, user_id, username (cả hai lấy từ JWT), rating (1-5), comment_text,
  created_at, updated_at. **Mỗi người chỉ đánh giá một sản phẩm một lần** (ràng buộc duy nhất).

## API
- `GET /api/v1/comments/?product_id={id}` - Đánh giá của một sản phẩm, mới nhất trước (công khai)
- `POST /api/v1/comments/` - `{"product_id": 1, "rating": 5, "comment_text": "..."}` (cần đăng nhập).
  Trả 400 nếu người dùng đã đánh giá sản phẩm này (hãy sửa đánh giá cũ) hoặc sản phẩm không tồn tại.
- `PATCH|PUT /api/v1/comments/{id}/` - Tác giả hoặc admin; không đổi được sản phẩm của đánh giá
- `DELETE /api/v1/comments/{id}/` - Tác giả hoặc admin

Thông báo lỗi bằng tiếng Việt (`LANGUAGE_CODE = 'vi'`) vì cửa hàng hiển thị trực tiếp.

## Cách tính điểm
`rating = (tổng số sao + 5 x 5.0) / (số đánh giá + 5)`: trung bình Bayes với 5 đánh giá 5 sao "ảo", để
một đánh giá xấu đầu tiên không kéo sập điểm sản phẩm. Khi không còn đánh giá nào, điểm là `0` ("chưa có
đánh giá"). Điểm được gửi tới `POST /api/v1/products/{id}/update_rating/` kèm `X-Internal-Token`.

## Chạy
```bash
pip install -r requirements.txt
cp .env.example .env
python manage.py migrate
python manage.py runserver 0.0.0.0:8009
```
