# Novamart — E-Commerce Microservices Platform

**Novamart** là nền tảng thương mại điện tử sử dụng kiến trúc Microservices, bao gồm nhiều dịch vụ độc lập kết hợp với nhau thông qua API Gateway và Message Broker.

## 🏗 Kiến trúc Hệ thống (Architecture)

Hệ thống được thiết kế theo mô hình Microservices với các thành phần chính:

### 1. Frontend (Giao diện người dùng)
- **Công nghệ**: ReactJS (v18), React Router (v6), Tailwind CSS, Axios.
- **Vai trò**: Cung cấp giao diện tương tác cho người dùng, gọi API thông qua Gateway.

### 2. Backend Services (Các dịch vụ cốt lõi)
Hầu hết các dịch vụ backend được xây dựng bằng **Python (Django & Django REST Framework)** và kết nối với cơ sở dữ liệu (MySQL).
- **User Service (8001)**: Quản lý thông tin người dùng, xác thực và phân quyền (JWT).
- **Product Service (8002)**: Quản lý thông tin sản phẩm, danh mục, kho hàng.
- **Cart Service (8003)**: Quản lý giỏ hàng của người dùng.
- **Order Service (8004)**: Quản lý đơn hàng và trạng thái đơn hàng.
- **Payment Service (8005)**: Xử lý thanh toán.
- **Shipping Service (8006)**: Quản lý vận chuyển và giao hàng.
- **Catalog Service (8008)**: Quản lý và tra cứu danh mục.
- **Comment-Rate Service (8009)**: Quản lý đánh giá và bình luận của người dùng về sản phẩm.

### 3. AI Service (8007)
- **Công nghệ**: FastAPI (Python), Uvicorn.
- **Vai trò**: Cung cấp các tính năng thông minh (có thể là gợi ý sản phẩm, phân tích đánh giá, v.v.).

### 4. API Gateway (8080)
- **Công nghệ**: NGINX.
- **Vai trò**: Điểm truy cập duy nhất cho Frontend (`/api/v1/*`), điều phối request tới các microservices tương ứng bên dưới.

### 5. Infrastructure & Messaging
- **RabbitMQ**: Message Broker dùng để giao tiếp bất đồng bộ giữa các services.
- **Docker Compose**: Container hóa và điều phối toàn bộ hệ thống.

### 6. Observability (Giám sát & Log)
Hệ thống được tích hợp bộ công cụ giám sát mạnh mẽ:
- **Prometheus**: Thu thập metrics từ các services.
- **Grafana**: Dashboard trực quan hóa metrics và logs (Truy cập tại cổng `3005`).
- **Loki & Promtail**: Thu thập và quản lý logs tập trung.

## 🚀 Hướng dẫn cài đặt và chạy dự án

### Yêu cầu hệ thống (Prerequisites)
- Docker & Docker Compose
- Python 3.8+ (Nếu muốn chạy độc lập từng service)
- Node.js (Cho Frontend)
- MySQL Server (Database)

### Khởi chạy toàn bộ hệ thống bằng Docker
Dự án cung cấp sẵn script thiết lập trong thư mục `infrastructure/`.

**Bước 1**: Chạy script setup (nếu cần thiết lập ban đầu):
- Trên Windows: Chạy file `infrastructure/setup.bat`
- Trên Linux/Mac: Chạy file `infrastructure/setup.sh`

**Bước 2**: Build và chạy các services với Docker Compose
```bash
cd infrastructure
docker-compose up --build -d
```

### Các cổng dịch vụ quan trọng (Ports)
- **Frontend App**: `http://localhost:3000`
- **API Gateway**: `http://localhost:8080`
- **RabbitMQ Management**: `http://localhost:15672`
- **Grafana Dashboard**: `http://localhost:3005` (Tài khoản mặc định thường là `admin/admin`)
- **Prometheus**: `http://localhost:9090`

## 📂 Cấu trúc thư mục

```text
E-Commerce/
├── ai-service/             # FastAPI service cho các tính năng AI
├── cart-service/           # Django app - Giỏ hàng
├── catalog-service/        # Django app - Danh mục
├── comment-rate-service/   # Django app - Đánh giá bình luận
├── frontend/               # ReactJS application
├── gateway/                # Cấu hình NGINX Gateway
├── infrastructure/         # Docker-compose, configs cho Grafana, Prometheus, Loki
├── order-service/          # Django app - Đơn hàng
├── payment-service/        # Django app - Thanh toán
├── product-service/        # Django app - Sản phẩm
├── shipping-service/       # Django app - Vận chuyển
└── user-service/           # Django app - Người dùng
```

## 📝 Cơ sở dữ liệu (Database)
Hệ thống sử dụng file script SQL `user.sql` để thiết lập cấu trúc và dữ liệu mẫu cho database (có thể sử dụng cho việc import dữ liệu ban đầu). Các service kết nối tới cơ sở dữ liệu trên máy host thông qua cơ chế `host.docker.internal`.
