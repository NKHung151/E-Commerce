# Infrastructure

Mọi thứ cần để chạy hệ thống trên máy. Hướng dẫn cài đặt từng bước (container dùng chung, tạo database,
file `.env`, bootstrap AI) nằm ở [README tổng](../README.md#5-cài-đặt-và-chạy).

## Các file

| File | Mục đích |
|---|---|
| `docker-compose.yml` | Project compose `ecommerce`: gateway, 9 service, frontend, Prometheus, Loki, Promtail, Grafana |
| `prometheus.yml` | Thu thập `/metrics` của 8 service Django và ai-service |
| `promtail-config.yml` | Đẩy log của mọi container về Loki |
| `seed/generate_seed_data.py` | Sinh lại danh mục và đánh giá demo (xem bên dưới) |

## Thành phần chạy ở đâu

| Trong project compose này | Bên ngoài (dùng chung với các dự án khác) |
|---|---|
| gateway, frontend, 9 service ứng dụng, Prometheus, Loki, Promtail, Grafana | `mysql-container`, `rabbitmq`, `neo4j`, `ollama` trên mạng Docker ngoài `shared-infra`; PostgreSQL cài trên máy, truy cập qua `host.docker.internal:5432` |

Các service tham gia cả mạng của compose lẫn `shared-infra`. Mỗi service đọc file `../<service>/.env`;
compose chỉ ghi đè `RABBITMQ_HOST`, host MySQL của user-service và URI Neo4j của ai-service.

```bash
docker compose up -d --build            # toàn bộ
docker compose up -d --build <service>  # một service sau khi sửa code
docker compose restart gateway          # sau khi tạo lại container của một service (IP mới)
docker compose logs -f <service>
docker compose down
```

## Dữ liệu demo (`seed/`)

`generate_seed_data.py` dùng bảng danh mục khai báo trong script và log hành vi của AI
(`ai-service/data/user_behavior.csv`) để sinh ra:

- `product-service/product_app/seed/products.json` - 300 sản phẩm id 1-300 (đúng các id trong log)
- `comment-rate-service/comment_app/seed/reviews.json` - 445 đánh giá do chính khách đã mua viết

Lượt xem (`views`) của sản phẩm được đếm từ log, còn `rating` dùng cùng công thức trung bình Bayes với
comment-rate-service. Các file này được nạp bởi data migration (`catalog 0002`, `product 0002`,
`comment-rate 0002`, `user 0002`/`0003` cho tài khoản admin, staff và 548 khách hàng) khi database còn
mới; dữ liệu đã có không bao giờ bị ghi đè.

```bash
python infrastructure/seed/generate_seed_data.py   # sau khi sửa bảng danh mục
```
