# Novamart — E-Commerce Microservices Platform

Novamart là một cửa hàng trực tuyến xây dựng theo kiến trúc **microservices**. Hệ thống gồm 8 service
nghiệp vụ (Django REST Framework), 1 service AI (FastAPI), API Gateway (Nginx), giao diện React
cho khách hàng và trang quản trị, giao tiếp đồng bộ qua REST và bất đồng bộ qua RabbitMQ (Saga).

---

## Mục lục
1. [Tính năng](#1-tính-năng)
2. [Kiến trúc](#2-kiến-trúc)
3. [Các thành phần](#3-các-thành-phần)
4. [Luồng nghiệp vụ chính](#4-luồng-nghiệp-vụ-chính)
5. [Cài đặt và chạy](#5-cài-đặt-và-chạy)
6. [Truy cập và tài khoản demo](#6-truy-cập-và-tài-khoản-demo)
7. [Vận hành hằng ngày](#7-vận-hành-hằng-ngày)
8. [Bảo mật](#8-bảo-mật)
9. [Giám sát](#9-giám-sát)
10. [Cấu trúc thư mục](#10-cấu-trúc-thư-mục)
11. [Xử lý sự cố](#11-xử-lý-sự-cố)

---

## 1. Tính năng

**Cửa hàng (khách hàng)**
- Duyệt 300 sản phẩm thuộc 10 danh mục: tìm kiếm, lọc theo danh mục và khoảng giá, phân trang.
- Danh sách sản phẩm và khối "Dành cho bạn" **được cá nhân hoá** theo hành vi của từng người.
- Trang sản phẩm: thông số theo loại hàng, đánh giá sao, "Sản phẩm tương tự", "Thường được mua cùng".
- Giỏ hàng (giá và tồn kho luôn lấy từ server), đặt hàng với thanh toán thẻ, chuyển khoản hoặc COD.
- Theo dõi đơn hàng, viết và sửa đánh giá (mỗi sản phẩm một đánh giá).
- **Trợ lý mua sắm AI** (chatbot tiếng Việt): tư vấn sản phẩm trong kho, trả lời thông số và chính sách,
  tra cứu đơn hàng của chính người hỏi.

**Back office (nhân viên / quản trị viên)**
- Quản lý sản phẩm theo loại (sách, điện tử, thời trang, …), danh mục, người dùng (admin).
- Xử lý đơn hàng: xác nhận thanh toán chuyển khoản/COD, chuyển trạng thái, huỷ đơn
  (tự động hoàn kho, hoàn tiền, huỷ vận đơn).
- Thêm, sửa, xoá sản phẩm tự động cập nhật chỉ mục tìm kiếm của AI.

---

## 2. Kiến trúc

```
                         Trình duyệt
                              │
                 ┌────────────▼─────────────┐
                 │  Frontend (React, :3000)  │  nginx: phục vụ SPA, chuyển /api, /recommend,
                 └────────────┬─────────────┘  /chatbot, /behavior về gateway (cùng origin)
                              │
                 ┌────────────▼─────────────┐
                 │   API Gateway (Nginx)     │  định tuyến, giới hạn 10 req/s mỗi IP (429),
                 │          :8080            │  404 JSON cho đường dẫn API không tồn tại
                 └──┬────┬────┬────┬────┬───┘
     REST + JWT     │    │    │    │    │
   ┌────────────────┘    │    │    │    └──────────────────────────┐
   ▼            ▼        ▼    ▼    ▼          ▼          ▼          ▼
 user      product     cart  order payment  shipping  catalog  comment-rate     ai-service
 :8001      :8002     :8003 :8004  :8005     :8006     :8008     :8009       :8007 (nội bộ)
 MySQL    PostgreSQL ─────────────── (mỗi service một database) ──────────   Neo4j · FAISS
                                                                              LSTM · Ollama
        └────────────── RabbitMQ: exchange "saga-events" + "user-behavior-queue" ─────────┘
```

**Nguyên tắc thiết kế**
- **Database riêng cho từng service.** Không service nào đọc DB của service khác; dữ liệu chéo đi qua
  REST hoặc sự kiện.
- **Saga dạng choreography** cho đặt hàng: mỗi service phản ứng với sự kiện của service trước và tự bù
  trừ khi thất bại (xem [mục 4](#4-luồng-nghiệp-vụ-chính)).
- **JWT không trạng thái.** user-service ký token; mọi service tự kiểm tra bằng secret dùng chung. Lệnh
  gọi giữa các service dùng header `X-Internal-Token`.
- **Hạ tầng dùng chung giữa các dự án.** MySQL, RabbitMQ, Neo4j, Ollama chạy ngoài compose, trên network
  Docker `shared-infra`; PostgreSQL là bản cài trên máy (Windows).

---

## 3. Các thành phần

| Thành phần | Cổng | Công nghệ | Lưu trữ | Vai trò |
|---|---|---|---|---|
| [frontend](frontend/README.md) | 3000 | React 18, React Router 6, Tailwind CSS 3 | — | Cửa hàng + Back office (`/admin`) |
| [gateway](gateway/README.md) | 8080 | Nginx | — | Điểm vào duy nhất cho mọi API |
| [user-service](user-service/README.md) | 8001 | Django 5.2 + DRF + SimpleJWT | MySQL `user_db` | Đăng ký, đăng nhập, JWT, quản lý người dùng |
| [product-service](product-service/README.md) | 8002 | Django + DRF | PostgreSQL `product_db` | Sản phẩm, thông số theo loại, tồn kho, đánh giá trung bình |
| [cart-service](cart-service/README.md) | 8003 | Django + DRF | PostgreSQL `cart_db` | Giỏ hàng |
| [order-service](order-service/README.md) | 8004 | Django + DRF | PostgreSQL `order_db` | Đơn hàng, khởi động saga |
| [payment-service](payment-service/README.md) | 8005 | Django + DRF | PostgreSQL `payment_db` | Thanh toán (thẻ tự động, chuyển khoản/COD chờ xác nhận) |
| [shipping-service](shipping-service/README.md) | 8006 | Django + DRF | PostgreSQL `shipping_db` | Vận đơn (đi theo trạng thái đơn hàng) |
| [ai-service](ai-service/README.md) | 8007 | FastAPI, PyTorch, FAISS, sentence-transformers | Neo4j, file trong `ai-service/data/` | Gợi ý, tìm kiếm ngữ nghĩa, chatbot |
| [catalog-service](catalog-service/README.md) | 8008 | Django + DRF | PostgreSQL `catalog_db` | Danh mục sản phẩm |
| [comment-rate-service](comment-rate-service/README.md) | 8009 | Django + DRF | PostgreSQL `comment_db` | Đánh giá và chấm sao |
| RabbitMQ | 5672 / 15672 | RabbitMQ 3 | — | Sự kiện saga, sự kiện hành vi cho AI |
| Prometheus, Loki, Promtail, Grafana | 9090, 3100, —, 3005 | — | — | Metrics, log tập trung, dashboard |

**AI service** kết hợp 5 thành phần: embedding `multilingual-e5-small` + FAISS (tìm kiếm ngữ nghĩa),
LSTM dự đoán món tiếp theo (huấn luyện từ log hành vi), đồ thị Neo4j (lọc cộng tác) và LLM `qwen2.5:3b`
qua Ollama cho chatbot. Chi tiết: [ai-service/README.md](ai-service/README.md).

---

## 4. Luồng nghiệp vụ chính

### Đặt hàng (Saga qua RabbitMQ, exchange `saga-events`)
```
order-service   POST /orders/ → kiểm tra, định giá từ product-service, lưu đơn "pending" → saga-order-created
payment-service thẻ: thành công → saga-payment-success │ chuyển khoản/COD: saga-payment-pending
product-service giữ kho nguyên tử (khoá dòng, chống trùng theo đơn) → saga-stock-reduced │ saga-stock-failed
shipping-service tạo vận đơn → saga-shipping-created  (chuyển khoản: chờ nhân viên xác nhận tiền)
order-service   đơn → "processing", ghi lượt mua cho AI

Thất bại hoặc nhân viên huỷ đơn → saga-order-cancelled: hoàn kho, hoàn tiền, huỷ vận đơn, đơn → "cancelled"
Nhân viên chuyển "shipped" / "delivered" → vận đơn tự cập nhật theo
```

### Hành vi người dùng → AI
Xem sản phẩm (product), thêm giỏ (cart), mua thành công (order) được gửi vào `user-behavior-queue`;
click và mở chatbot đi qua `/behavior/track` (bắt buộc đăng nhập). ai-service ghi log và cập nhật đồ thị
Neo4j ngay; LSTM học các hành vi mới ở lần huấn luyện kế tiếp.

---

## 5. Cài đặt và chạy

### 5.1 Yêu cầu
- Docker Desktop (Compose v2), Git
- PostgreSQL 15+ cài trên máy (Windows), tài khoản `admin` / `123456`
- Khuyến nghị: GPU NVIDIA ≥ 4 GB cho Ollama (chạy CPU vẫn được, chatbot chậm hơn)
- Khoảng 10 GB đĩa trống (image, model embedding, model LLM)

### 5.2 Hạ tầng dùng chung (làm một lần)
```bash
docker network create shared-infra

docker run -d --name mysql-container --network shared-infra -p 3306:3306 \
  -e MYSQL_ROOT_PASSWORD=123456 -v mysql_data:/var/lib/mysql mysql:8.0
docker run -d --name rabbitmq --network shared-infra -p 5672:5672 -p 15672:15672 rabbitmq:3-management
docker run -d --name neo4j --network shared-infra -p 7474:7474 -p 7687:7687 \
  -e NEO4J_AUTH=neo4j/12345678 -v neo4j_data:/data neo4j:5
docker run -d --name ollama --gpus all --network shared-infra -p 11434:11434 \
  -v ollama_data:/root/.ollama ollama/ollama            # bỏ --gpus all nếu không có GPU NVIDIA
docker exec ollama ollama pull qwen2.5:3b
```

### 5.3 Tạo database
```bash
# MySQL (container)
docker exec mysql-container mysql -uroot -p123456 -e \
  "CREATE DATABASE IF NOT EXISTS user_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# PostgreSQL (trên máy)
for db in product_db cart_db order_db payment_db shipping_db catalog_db comment_db; do
  psql -h localhost -U admin -d postgres -c "CREATE DATABASE $db;"
done
```
Container kết nối PostgreSQL qua `host.docker.internal:5432`, nên PostgreSQL phải nhận kết nối từ mạng
Docker (xem [mục 11](#11-xử-lý-sự-cố)).

### 5.4 Cấu hình
```bash
for s in user product cart order payment shipping catalog comment-rate ai; do
  cp $s-service/.env.example $s-service/.env
done
```
Giá trị mặc định chạy được ngay. Khi triển khai thật, đổi `SECRET_KEY`, `JWT_SECRET`,
`INTERNAL_SERVICE_TOKEN` (**cùng giá trị ở mọi service**), mật khẩu DB và mật khẩu tài khoản seed.

### 5.5 Khởi động
```bash
cd infrastructure
docker compose up -d --build
```
Mỗi service tự chạy `migrate` khi khởi động. Migration **nạp sẵn dữ liệu demo**: 10 danh mục, 300 sản
phẩm, 445 đánh giá, tài khoản admin/staff và 548 khách hàng. Dữ liệu này khớp với log hành vi có sẵn
của AI (`ai-service/data/user_behavior.csv`).

### 5.6 Huấn luyện / xây dựng AI
```bash
docker exec ecommerce-ai-service-1 python scripts/bootstrap.py
```
Lệnh này xây chỉ mục FAISS từ danh mục sản phẩm, dựng đồ thị Neo4j, huấn luyện LSTM rồi nạp vào service
(khoảng 40 giây). Lần đầu ai-service tự tải model embedding (khoảng 470 MB).

---

## 6. Truy cập và tài khoản demo

| Địa chỉ | Nội dung |
|---|---|
| http://localhost:3000 | Cửa hàng |
| http://localhost:3000/admin | Back office |
| http://localhost:8080/api/v1/ | API qua gateway |
| http://localhost:15672 | RabbitMQ (guest / guest) |
| http://localhost:7474 | Neo4j Browser (neo4j / 12345678) |
| http://localhost:3005 | Grafana (admin / admin) |
| http://localhost:9090 | Prometheus |

| Vai trò | Tài khoản | Mật khẩu |
|---|---|---|
| Quản trị viên | `admin_user` | `admin123` |
| Nhân viên | `staff_user` | `staff123` |
| Khách hàng (có sẵn lịch sử mua sắm, thấy gợi ý cá nhân hoá) | `user03` … `user550` | `customer123` |

Mật khẩu seed lấy từ `SEED_*` trong `user-service/.env` và chỉ áp dụng cho database mới. Khách tự đăng
ký luôn có vai trò `customer`.

---

## 7. Vận hành hằng ngày

| Việc | Lệnh (trong `infrastructure/`) |
|---|---|
| Build lại một service sau khi sửa code | `docker compose up -d --build <service>` |
| Xem log | `docker compose logs -f <service>` |
| Sau khi tạo lại container mà gateway báo 502 | `docker compose restart gateway` |
| Huấn luyện lại LSTM với hành vi mới (khuyến nghị hằng đêm) | `docker exec ecommerce-ai-service-1 python scripts/bootstrap.py lstm` |
| Trạng thái các thành phần AI | xem [ai-service/README.md](ai-service/README.md#5-cài-đặt-và-khởi-chạy) mục 5.5 |
| Dừng toàn bộ | `docker compose down` |

Chỉ mục tìm kiếm AI **tự cập nhật** khi thêm, sửa, xoá sản phẩm trên Back office. Dữ liệu demo
được sinh bởi `infrastructure/seed/generate_seed_data.py`.

---

## 8. Bảo mật

- **Phân quyền** theo vai trò trong JWT: `customer`, `staff`, `admin`. Xoá sản phẩm và quản lý người
  dùng chỉ dành cho admin.
- **Không tin dữ liệu từ client:** người dùng luôn lấy từ JWT (không từ URL hay body); giá và tồn kho
  luôn lấy từ product-service.
- **Gọi nội bộ** (cập nhật rating, trừ kho, gợi ý cho người dùng bất kỳ, ghi lượt mua, xây lại chỉ mục
  AI) cần header `X-Internal-Token`.
- **Mật khẩu** được kiểm tra độ dài, độ phổ biến, toàn số và độ giống tên đăng nhập.
- Gateway giới hạn **10 request/giây mỗi người dùng** (burst 20) theo IP thật của trình duyệt.
- `DEBUG=False` mặc định; cổng 8007 của ai-service không mở ra máy host.

---

## 9. Giám sát

- Mỗi service xuất metrics tại `/metrics` (số request, độ trễ theo route); Prometheus thu thập, Grafana
  hiển thị.
- Log của mọi container được Promtail đẩy về Loki, xem trong Grafana (Explore → Loki).
- Header `X-Simulate-Delay` / `X-Simulate-Error` giả lập sự cố để thử giám sát, chỉ hoạt động khi
  service bật `FAULT_INJECTION_ENABLED=true`.

---

## 10. Cấu trúc thư mục

```text
E-Commerce/
├── frontend/              React: cửa hàng (src/shop) + back office (src/backoffice) + dùng chung (src/shared)
├── gateway/               Cấu hình Nginx
├── user-service/          Django: người dùng, JWT            (MySQL)
├── product-service/       Django: sản phẩm, tồn kho          (PostgreSQL)
├── cart-service/          Django: giỏ hàng                   (PostgreSQL)
├── order-service/         Django: đơn hàng, saga              (PostgreSQL)
├── payment-service/       Django: thanh toán                 (PostgreSQL)
├── shipping-service/      Django: vận đơn                     (PostgreSQL)
├── catalog-service/       Django: danh mục                   (PostgreSQL)
├── comment-rate-service/  Django: đánh giá                    (PostgreSQL)
├── ai-service/            FastAPI: gợi ý, tìm kiếm ngữ nghĩa, chatbot
└── infrastructure/        docker-compose, Prometheus, Promtail, công cụ sinh dữ liệu demo (seed/)
```

Mỗi service Django có cấu trúc giống nhau: `config/` (settings, urls, middleware metrics), `<tên>_app/`
(models, views, serializers, permissions, `rabbitmq_saga.py` nếu tham gia saga), `migrations/`,
`Dockerfile`, `.env.example`, `README.md`.

---

## 11. Xử lý sự cố

| Triệu chứng | Nguyên nhân | Cách xử lý |
|---|---|---|
| Service PostgreSQL khởi động lỗi `could not connect to server` | PostgreSQL trên máy chưa chạy hoặc không nghe trên cổng 5432 | Kiểm tra service PostgreSQL và `listen_addresses` trong `postgresql.conf`. Docker Desktop chuyển kết nối tới `127.0.0.1` nên `pg_hba.conf` mặc định là đủ; với Docker trên Linux, thêm `host all all 172.16.0.0/12 scram-sha-256` vào `pg_hba.conf` |
| `network shared-infra not found` khi `docker compose up` | Chưa tạo hạ tầng dùng chung | Làm [mục 5.2](#52-hạ-tầng-dùng-chung-làm-một-lần) |
| 502 Bad Gateway sau khi build lại một service | Gateway còn giữ IP cũ của container | `docker compose restart gateway` |
| 429 Too Many Requests | Vượt 10 request/giây | Giảm tần suất gọi (script kiểm thử nên nghỉ giữa các request) |
| Token đúng nhưng bị 401 `Invalid token` | `JWT_SECRET` giữa các service khác nhau | Đặt cùng một giá trị trong mọi file `.env` |
| Gợi ý luôn là "sản phẩm mới nhất" | Chưa đăng nhập, khách mới, hoặc chưa chạy bootstrap AI | Chạy [mục 5.6](#56-huấn-luyện--xây-dựng-ai) |
| Chatbot trả lời "đang bận xử lý" | Không gọi được Ollama | Kiểm tra container `ollama` và `docker exec ollama ollama list` |
