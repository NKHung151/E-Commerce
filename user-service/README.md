# User Service

## Tổng quan
Quản lý tài khoản, đăng ký, đăng nhập và cấp JWT cho toàn hệ thống. Có 3 vai trò: `admin`, `staff`,
`customer`. Các service khác tự kiểm tra JWT bằng secret dùng chung, không cần gọi lại service này.

## Cổng
- **8001** (cổng nội bộ)
- Truy cập qua gateway: `http://localhost:8080/api/v1/`

## Cơ sở dữ liệu
- **MySQL** (container `mysql-container`), database `user_db`
- Migration `0002_seed_admin_staff`: tạo sẵn 1 tài khoản admin và 1 tài khoản staff (thông tin lấy từ
  `SEED_ADMIN_*`, `SEED_STAFF_*` trong `.env`, mặc định `admin_user` / `admin123`, `staff_user` / `staff123`)
- Migration `0003_seed_customers`: tạo 548 khách hàng demo `user03` … `user550` (mật khẩu
  `SEED_CUSTOMER_PASSWORD`, mặc định `customer123`), khớp với log hành vi của AI
- Tài khoản đã tồn tại (trùng id, username hoặc email) không bao giờ bị ghi đè

## Model
- **User** (kế thừa `AbstractUser`): id, username, email (duy nhất), password (băm PBKDF2), role,
  created_at, updated_at

## API

### Xác thực
- `POST /api/v1/auth/register/` - Đăng ký (không cần đăng nhập)
  - Body: `{"username": "...", "email": "...", "password": "..."}`
  - Tài khoản tự đăng ký luôn là `customer` (trường `role` gửi lên bị bỏ qua)
  - Quy tắc mật khẩu: tối thiểu 6 ký tự, không quá phổ biến, không toàn số, không giống tên đăng nhập
- `POST /api/v1/auth/login/` - Đăng nhập, trả về `{"access": "...", "refresh": "..."}`
- `POST /api/v1/auth/refresh/` - Lấy access token mới từ `{"refresh": "..."}`

### Người dùng hiện tại
- `GET /api/v1/users/me/` - Thông tin của người đang đăng nhập

### Quản lý người dùng (chỉ admin)
- `GET /api/v1/admin/users/` - Danh sách người dùng
- `POST /api/v1/admin/users/` - Tạo người dùng với vai trò bất kỳ (cùng quy tắc mật khẩu)
- `GET|PUT|PATCH|DELETE /api/v1/admin/users/{id}/` - Xem, sửa, xoá (admin không thể tự xoá chính mình)

### Lỗi
Lỗi kiểm tra dữ liệu trả về `400 {"error": "<trường>: <thông báo>", "code": 400, "fields": {...}}`.
Thông báo bằng tiếng Việt (`LANGUAGE_CODE = 'vi'`) vì cửa hàng hiển thị trực tiếp cho khách.

## Nội dung JWT
| Claim | Ý nghĩa |
|---|---|
| `user_id`, `username`, `email`, `role` | Thông tin người dùng, các service dùng để phân quyền |
| `exp`, `iat` | Hết hạn (access 1 giờ, refresh 7 ngày), thời điểm cấp |
| `iss` | `ecommerce-user-service` (các service khác kiểm tra) |

## Chạy

### Local
```bash
pip install -r requirements.txt
cp .env.example .env
python manage.py migrate
python manage.py runserver 0.0.0.0:8001
```

### Docker
```bash
cd infrastructure
docker compose up -d --build user-service
```

## Ví dụ

```bash
# Đăng ký
curl -X POST http://localhost:8080/api/v1/auth/register/ -H "Content-Type: application/json" \
  -d '{"username": "john_doe", "email": "john@example.com", "password": "SecurePass123!"}'

# Đăng nhập
curl -X POST http://localhost:8080/api/v1/auth/login/ -H "Content-Type: application/json" \
  -d '{"username": "john_doe", "password": "SecurePass123!"}'

# Danh sách người dùng (admin)
curl http://localhost:8080/api/v1/admin/users/ -H "Authorization: Bearer <access_token>"
```
