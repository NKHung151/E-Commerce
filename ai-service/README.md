# AI Service

Dịch vụ trí tuệ nhân tạo của nền tảng thương mại điện tử **Novamart**: gợi ý sản phẩm cá nhân hoá,
tìm kiếm ngữ nghĩa và trợ lý mua sắm (chatbot) tiếng Việt.

| | |
|---|---|
| **Loại** | Microservice, REST API (FastAPI / Python 3.11) |
| **Cổng** | `8007`, chỉ trong mạng Docker (không publish ra host); public qua API Gateway `:8080` cho `/recommend`, `/chatbot`, `/behavior/track` |
| **Phụ thuộc bắt buộc** | product-service |
| **Phụ thuộc tuỳ chọn** | Neo4j, Ollama/OpenAI, RabbitMQ, order-service. Thiếu thành phần nào thì chức năng tương ứng tạm tắt |
| **Lưu trữ** | Volume `ai-service/data/` (log hành vi, index, checkpoint, cache model) |

---

## Mục lục

1. [Chức năng](#1-chức-năng)
2. [Kiến trúc](#2-kiến-trúc)
3. [Mô hình và công nghệ](#3-mô-hình-và-công-nghệ)
4. [Yêu cầu hệ thống](#4-yêu-cầu-hệ-thống)
5. [Cài đặt và khởi chạy](#5-cài-đặt-và-khởi-chạy)
6. [Cấu hình](#6-cấu-hình)
7. [Tham chiếu API](#7-tham-chiếu-api)
8. [Vận hành](#8-vận-hành)
9. [Bảo mật](#9-bảo-mật)
10. [Hiệu năng và chất lượng](#10-hiệu-năng-và-chất-lượng)
11. [Phát triển](#11-phát-triển)
12. [Xử lý sự cố](#12-xử-lý-sự-cố)
13. [Giới hạn đã biết](#13-giới-hạn-đã-biết)

---

## 1. Chức năng

| Chức năng | Endpoint | Bên sử dụng |
|---|---|---|
| Gợi ý cá nhân hoá ("Dành cho bạn") | `GET /recommend` | Trang chủ (frontend); product-service dùng để sắp xếp danh sách theo người dùng |
| Sản phẩm tương tự | `GET /recommend/similar` | Trang chi tiết sản phẩm |
| Thường được mua cùng | `GET /recommend/bought-together` | Trang chi tiết sản phẩm |
| Trợ lý mua sắm | `POST /chatbot` | Widget chat trên storefront |
| Thu thập hành vi | RabbitMQ `user-behavior-queue`, `POST /behavior/track` | product / cart / order service, frontend |
| Quản trị mô hình | `/admin/*` | Quản trị viên, script `bootstrap.py` |

**Nguyên tắc thiết kế: suy giảm có kiểm soát (graceful degradation).** Service luôn khởi động được, kể
cả khi chưa huấn luyện gì. Mỗi nguồn dữ liệu (LSTM, đồ thị, tìm kiếm ngữ nghĩa, LLM) độc lập; nguồn
nào chưa sẵn sàng thì bị bỏ qua và kết quả được tính từ các nguồn còn lại. Khi không còn nguồn nào,
service trả về danh sách sản phẩm mới nhất.

---

## 2. Kiến trúc

```
                     ┌──────────────── API Gateway :8080 ─────────────────┐
  Frontend ─────────►│ /recommend   /chatbot   /behavior/track            │
                     └───────────────────────┬────────────────────────────┘
                                             ▼
 product-service ──GET /recommend──► ┌───────────────────────────┐
                                     │        AI Service         │──HTTP──► product-service (danh mục, cache 60 s)
 product / cart / order ──AMQP──►    │  FastAPI · uvicorn :8007  │──HTTP──► order-service   (đơn hàng, theo JWT)
   (user-behavior-queue)             │                           │──Bolt──► Neo4j           (đồ thị hành vi)
                                     │  RAM: FAISS · LSTM · e5   │──HTTP──► Ollama / OpenAI (LLM)
                                     └─────────────┬─────────────┘
                                                   ▼
                                     volume data/: user_behavior.csv · index.faiss
                                     product_metadata.json · lstm_checkpoint.pt · hf-cache/
```

### 2.1 Luồng gợi ý (`GET /recommend`)

```
user_id ─► lịch sử (CSV, cache theo mtime)
            ├─► LSTM         10 bước gần nhất → xác suất món tiếp theo          ─┐
            ├─► Neo4j        lọc cộng tác ×0,4 · SIMILAR_TO ×0,3 ·               │ mỗi nguồn chuẩn hoá về 0..1
            │                thường mua cùng món vừa xem ×0,8 (song song)        │
            └─► FAISS        giống `context` hoặc tên món xem gần nhất          ─┘
                                        │
                     score = 0,15·LSTM + 0,15·Graph + 0,70·RAG  →  top N
                     không có nguồn nào  →  sản phẩm mới nhất (source = fallback)
```

Trường `source` trong response cho biết những nguồn đã đóng góp, ví dụ `lstm+graph+rag`.

### 2.2 Luồng chatbot (`POST /chatbot`)

```
message ─► Phân loại ý định: luật từ khoá (≈0 ms) → nếu không khớp thì hỏi LLM (JSON)
           + trích mức giá bằng regex ("dưới 25 triệu", "tối đa 500k")
   ├─ small_talk / thanks / payment / user_account → câu trả lời cố định
   ├─ order_management    → order-service bằng JWT của người dùng
   ├─ policy_faq          → LLM diễn đạt lại văn bản chính sách (nguồn duy nhất)
   ├─ product_details     → FAISS top 3 → LLM trả lời từ thông số → kiểm tra số liệu
   └─ còn lại             → FAISS top 15 → lọc giá → top 5 → LLM tư vấn trong danh sách
                            → chỉ hiện thẻ sản phẩm mà câu trả lời thật sự nhắc tới
```

**Các lớp chống bịa thông tin:**
- LLM chỉ được nhìn thấy sản phẩm thật lấy từ FAISS; id và URL bị loại khỏi ngữ cảnh.
- Thẻ sản phẩm chỉ hiện khi tên sản phẩm có mặt trong câu trả lời.
- Thông số đo lường trong câu trả lời (GB, Hz, inch, …) mà không có trong dữ liệu sẽ khiến cả câu trả
  lời bị thay bằng "chưa có thông tin".
- Temperature 0,2.
- Câu tiếng Anh do model nhỏ chèn thêm bị lọc bỏ.

### 2.3 Luồng dữ liệu hành vi

```
view (product-service) · add_to_cart (cart) · purchase (order) · click / open_chatbot (frontend)
        │ RabbitMQ user-behavior-queue (durable)   hoặc   POST /behavior/track (dự phòng)
        ▼
  process_event ─► 1 dòng vào data/user_behavior.csv      → dữ liệu huấn luyện LSTM, lịch sử người dùng
                └► 1 truy vấn Cypher MERGE (User)-[VIEW|ADD_TO_CART|BUY {count}]->(Product)
                                                           → đồ thị cập nhật ngay lập tức
```

---

## 3. Mô hình và công nghệ

| Thành phần | Mô hình / thuật toán | Cách có được | Kích thước |
|---|---|---|---|
| Embedding | `intfloat/multilingual-e5-small`: Transformer 12 lớp, 118M tham số, vector 384 chiều | Model tiền huấn luyện, tự tải lần đầu | ~470 MB (cache trong `data/hf-cache`) |
| Chỉ mục ngữ nghĩa | FAISS `IndexFlatIP` trên vector đã chuẩn hoá L2 (tìm kiếm cosine chính xác) | **Xây dựng** từ danh mục sản phẩm | ~450 KB / 300 sản phẩm |
| Dự đoán món tiếp theo | LSTM: Embedding 64 → LSTM 2 lớp × 128 (dropout 0,3) → Linear | **Huấn luyện** từ log hành vi | 275K tham số, ~1 MB |
| Đồ thị gợi ý | Neo4j 5, truy vấn Cypher đếm đồng xuất hiện | **Xây dựng** từ log hành vi | 550 user, 300 sản phẩm, ~11,8K quan hệ |
| LLM | `qwen2.5:3b` (Q4) qua Ollama, hoặc `gpt-3.5-turbo` qua OpenAI | Model tiền huấn luyện | 1,9 GB |

**Ngăn xếp công nghệ:** FastAPI 0.111, Pydantic 2, PyTorch 2.3 (bản CPU), sentence-transformers 3.0,
faiss-cpu 1.8, neo4j driver 5.20 (async), httpx, pika, prometheus-client.

**Lý do chọn model embedding:** đo trên 8 câu hỏi mua sắm tiếng Việt với danh mục 300 sản phẩm:

| Model | Precision@5 |
|---|---|
| `all-MiniLM-L6-v2` (chỉ tiếng Anh) | 28% |
| `paraphrase-multilingual-MiniLM-L12-v2` | 45% |
| **`multilingual-e5-small`** | **68%** |

---

## 4. Yêu cầu hệ thống

| Hạng mục | Tối thiểu | Khuyến nghị |
|---|---|---|
| Docker / Docker Compose | 24+ / v2 | |
| RAM cho ai-service | 1,5 GB | 2 GB |
| RAM / VRAM cho Ollama | 3 GB RAM (chạy CPU, ~5–10 s/câu) | GPU NVIDIA ≥ 4 GB VRAM (~1 s/câu) |
| Dung lượng đĩa | Image 2,3 GB + model embedding 0,5 GB + LLM 1,9 GB | |
| Mạng | Truy cập Hugging Face và Ollama registry ở lần chạy đầu | |

---

## 5. Cài đặt và khởi chạy

### 5.1 Hạ tầng dùng chung (thực hiện một lần)

Neo4j, RabbitMQ và Ollama chạy trên network `shared-infra` để dùng chung giữa các dự án:

```bash
docker network create shared-infra
docker run -d --name neo4j --network shared-infra -p 7474:7474 -p 7687:7687 \
  -e NEO4J_AUTH=neo4j/12345678 -v neo4j_data:/data neo4j:5
docker run -d --name rabbitmq --network shared-infra -p 5672:5672 -p 15672:15672 rabbitmq:3-management
docker run -d --name ollama --gpus all --network shared-infra -p 11434:11434 \
  -v ollama_data:/root/.ollama ollama/ollama          # bỏ --gpus all nếu không có GPU NVIDIA
docker exec ollama ollama pull qwen2.5:3b
```

### 5.2 Cấu hình

```bash
cp ai-service/.env.example ai-service/.env
```

`JWT_SECRET` **phải trùng** với user-service. Các biến khác xem [mục 6](#6-cấu-hình).

### 5.3 Khởi động

```bash
cd infrastructure
docker compose up -d --build            # toàn bộ hệ thống; migration nạp sẵn danh mục demo
```

Ở lần chạy đầu, model embedding được tải ở chế độ nền (khoảng 1–2 phút), còn API sẵn sàng ngay. Lúc
này chatbot đã hoạt động, còn `/recommend` trả về `source: fallback`.

### 5.4 Xây dựng mô hình

```bash
docker exec ecommerce-ai-service-1 python scripts/bootstrap.py
```

| Bước | Nội dung | Đầu ra | Điều kiện |
|---|---|---|---|
| `index` | Embed toàn bộ danh mục từ product-service | `data/product_embeddings/index.faiss`, `data/product_metadata.json` | Có sản phẩm |
| `graph` | Xoá cạnh hành vi cũ, nạp lại log theo lô (UNWIND), tạo cạnh `SIMILAR_TO` | Đồ thị Neo4j | Neo4j sẵn sàng |
| `lstm` | Huấn luyện, giữ epoch có HitRate@10 tốt nhất | `data/checkpoints/lstm_checkpoint.pt` | ≥ 100 sự kiện |

Có thể chạy riêng từng bước: `bootstrap.py index`, `bootstrap.py graph lstm`, … Mỗi bước đều an toàn
khi chạy lại. Khi kết thúc, script gọi `POST /admin/reload` để service nạp kết quả mới mà không cần
restart. Thời gian chạy trên dữ liệu demo khoảng 40 giây.

### 5.5 Kiểm tra

```bash
curl "http://localhost:8080/recommend?top_n=5"                                   # ẩn danh: source = fallback
curl "http://localhost:8080/recommend?top_n=5" -H "Authorization: Bearer <JWT>"  # cá nhân hoá: lstm+graph+rag
curl -X POST http://localhost:8080/chatbot -H "Content-Type: application/json" \
     -d '{"message":"laptop chơi game dưới 25 triệu"}'
```

Trạng thái chi tiết của từng thành phần (`GET /admin/stats`, xem [mục 8.3](#83-giám-sát)): cổng 8007
không mở ra host, nên dùng lệnh sau, cũng là lệnh `bootstrap.py` chạy khi kết thúc:

```bash
docker exec ecommerce-ai-service-1 python -c "import sys; sys.path.insert(0, 'scripts'); from bootstrap import reload_service; reload_service()"
```

---

## 6. Cấu hình

Đọc từ biến môi trường hoặc `ai-service/.env` (pydantic-settings; khoá không còn dùng sẽ được bỏ qua).

| Biến | Mặc định | Mô tả |
|---|---|---|
| `PRODUCT_SERVICE_URL` | `http://product-service:8002` | Nguồn danh mục sản phẩm |
| `ORDER_SERVICE_URL` | `http://order-service:8004` | Tra cứu đơn hàng cho chatbot |
| `RABBITMQ_HOST` | `rabbitmq` | Broker nhận sự kiện hành vi |
| `NEO4J_URI` / `NEO4J_USER` / `NEO4J_PASSWORD` | `bolt://neo4j:7687` / `neo4j` / `12345678` | Đồ thị gợi ý |
| `JWT_SECRET` / `JWT_ALGORITHM` | `shared-jwt-secret` / `HS256` | Xác thực người dùng và admin, **phải trùng user-service** (sai → mọi token bị 401 `Invalid token`) |
| `INTERNAL_SERVICE_TOKEN` | `internal-service-secret` | Secret cho các lệnh gọi giữa service, phải trùng các service Django |
| `LLM_PROVIDER` | `ollama` | `ollama` hoặc `openai` |
| `OLLAMA_BASE_URL` / `OLLAMA_MODEL` | `http://ollama:11434` / `qwen2.5:3b` | |
| `OPENAI_API_KEY` | (trống) | Bắt buộc khi `LLM_PROVIDER=openai` |
| `EMBEDDING_MODEL` | `intfloat/multilingual-e5-small` | Đổi model ⇒ phải chạy lại `bootstrap.py index`; service tự từ chối index cũ |
| `LSTM_WEIGHT` / `GRAPH_WEIGHT` / `RAG_WEIGHT` | `0.15` / `0.15` / `0.7` | Trọng số trộn gợi ý |
| `LSTM_SEQUENCE_LENGTH` | `10` | Độ dài chuỗi đầu vào LSTM (thay đổi ⇒ huấn luyện lại) |
| `BEHAVIOR_CSV_PATH` | `data/user_behavior.csv` | Log hành vi |
| `FAISS_INDEX_PATH` / `PRODUCT_METADATA_PATH` | `data/product_embeddings/index.faiss` / `data/product_metadata.json` | |
| `LSTM_CHECKPOINT_PATH` | `data/checkpoints/lstm_checkpoint.pt` | |
| `FAULT_INJECTION_ENABLED` | `false` | Bật giả lập lỗi/độ trễ để kiểm thử khả năng quan sát |

---

## 7. Tham chiếu API

Tài liệu OpenAPI tương tác: `/docs` của service (trong mạng Docker, hoặc `http://localhost:8007/docs` khi chạy local).

| Method | Path | Xác thực | Mô tả |
|---|---|---|---|
| GET | `/recommend` | JWT (tuỳ chọn) hoặc `X-Internal-Token` | Gợi ý cá nhân hoá |
| GET | `/recommend/similar` | — | Sản phẩm tương tự |
| GET | `/recommend/bought-together` | — | Thường được mua cùng |
| POST | `/chatbot` | Bearer JWT (tuỳ chọn) | Trợ lý mua sắm |
| POST | `/behavior/track` | JWT hoặc `X-Internal-Token` | Ghi một sự kiện hành vi |
| POST | `/admin/rebuild-index` | JWT `role=admin` | Xây lại FAISS và node sản phẩm |
| POST | `/admin/reload` | JWT `role=admin` | Nạp lại FAISS và LSTM từ đĩa |
| GET | `/admin/stats` | JWT `role=admin` | Trạng thái các thành phần |
| GET | `/health` | — | Liveness probe |
| GET | `/metrics` | — | Prometheus metrics |

### `GET /recommend`

Người được gợi ý **lấy từ JWT**: có token thì nhận gợi ý của chính mình, không có token thì nhận
danh sách chung (`fallback`). Tham số `user_id` chỉ có tác dụng khi request mang `X-Internal-Token`
(product-service dùng để sắp xếp danh sách cho người dùng mà nó đã xác thực); với client thường, tham
số này bị bỏ qua, vì gợi ý tiết lộ lịch sử duyệt web của người đó.

| Tham số | Kiểu | Mặc định | Mô tả |
|---|---|---|---|
| `user_id` | int | — | Chỉ dùng cho gọi nội bộ (xem trên) |
| `top_n` | int 1–50 | 10 | Số sản phẩm |
| `context` | string | `""` | Câu truy vấn ngữ nghĩa; mặc định dùng tên món người dùng xem gần nhất |

```json
{
  "user_id": 48,
  "source": "lstm+graph+rag",
  "products": [
    {"id": 63, "name": "Áo sơ mi nam Calvin Klein Slim Fit Oxford Stretch", "price": 990000.0,
     "image": "https://placehold.co/600x400?text=...", "category": "Fashion", "score": 0.81}
  ]
}
```

`source` nhận một trong các giá trị: tổ hợp `lstm` / `graph` / `rag`, `fallback`, `graph-similar`,
`graph-bought-together`, `category-fallback`, `not_found`, `no_category`, `error`.

### `GET /recommend/similar` · `GET /recommend/bought-together`

Tham số `product_id` (bắt buộc) và `top_n` (mặc định lần lượt 10 và 5). Kết quả lấy từ đồ thị; khi đồ
thị chưa có dữ liệu, service trả về sản phẩm cùng danh mục (`category-fallback`).

### `POST /chatbot`

```json
// Request (Authorization: Bearer <JWT> chỉ cần khi hỏi về đơn hàng)
{"message": "laptop chơi game dưới 25 triệu"}

// Response
{
  "reply": "Laptop Acer Nitro 5 AN515 RTX 3060 144Hz",
  "products": [{"id": 36, "name": "Laptop Acer Nitro 5 AN515 RTX 3060 144Hz", "price": 18990000.0,
                "image": null, "category": "Electronics"}],
  "intent": "product_discovery",
  "confidence": 0.9
}
```

Các giá trị `intent`: `product_discovery`, `product_details`, `promotion`, `order_management`,
`payment`, `user_account`, `service_info`, `personalized_recommendation`, `policy_faq`, `small_talk`,
`thanks`, `fallback`. Tối đa 3 thẻ sản phẩm.

### `POST /behavior/track`

```json
{"product_id": 36, "action": "click"}
```

| Bên gọi | Xác thực | `user_id` | `action` cho phép |
|---|---|---|---|
| Trình duyệt | JWT (bắt buộc, không có → 401) | Lấy từ token, giá trị trong body bị bỏ qua | `view`, `click`, `open_chatbot` (khác → 403) |
| Service nội bộ (dự phòng khi RabbitMQ lỗi) | `X-Internal-Token` | Bắt buộc trong body | Tất cả, gồm `add_to_cart`, `purchase` |

`add_to_cart` và `purchase` chỉ do cart-service và order-service ghi, nên client không thể tạo lượt mua
giả để đẩy sản phẩm lên mục gợi ý.

---

## 8. Vận hành

### 8.1 Khi nào cần chạy lại gì

| Sự kiện | Lệnh |
|---|---|
| Thêm / sửa / xoá sản phẩm | `bootstrap.py index` (hoặc `POST /admin/rebuild-index`) |
| Đổi `EMBEDDING_MODEL` | `bootstrap.py index` |
| Hành vi mới tích luỹ (khuyến nghị: hằng ngày) | `bootstrap.py lstm` |
| Neo4j bị xoá / khôi phục | `bootstrap.py graph` |
| Triển khai mới hoàn toàn | `bootstrap.py` |

Đồ thị được cập nhật theo thời gian thực theo từng sự kiện, nên chỉ cần chạy lại `graph` khi muốn dựng
lại từ đầu hoặc khi cần tính lại `SIMILAR_TO`. Có thể lên lịch huấn luyện LSTM hằng đêm bằng cron:

```cron
0 2 * * * docker exec ecommerce-ai-service-1 python scripts/bootstrap.py lstm >> /var/log/ai-train.log 2>&1
```

### 8.2 Dữ liệu và sao lưu

| Đường dẫn trong `data/` | Nội dung | Có tạo lại được? |
|---|---|---|
| `user_behavior.csv` | Log hành vi, **dữ liệu gốc duy nhất** | **Không, cần sao lưu** |
| `product_embeddings/`, `product_metadata.json` | Index FAISS | Có (`index`) |
| `checkpoints/lstm_checkpoint.pt` | Trọng số LSTM | Có (`lstm`) |
| `hf-cache/` | Cache model embedding | Có (tự tải lại) |
| `plots/` | Biểu đồ huấn luyện (chỉ khi có matplotlib) | Có |

Thư mục `data/` không được commit và không được đưa vào image (`.dockerignore`).

### 8.3 Giám sát

- **`GET /admin/stats`**: model embedding, số sản phẩm trong FAISS, trạng thái LSTM và HitRate@10,
  số node/quan hệ của đồ thị, LLM đang dùng.

  ```json
  {"embedding_model": "intfloat/multilingual-e5-small", "faiss_products": 300, "lstm_loaded": true,
   "lstm_val_hit_rate_at_10": 0.668, "graph": {"users": 550, "products": 300, "relationships": 11767},
   "llm": "ollama:qwen2.5:3b"}
  ```

- **Prometheus** (`/metrics`, đã cấu hình trong `infrastructure/prometheus.yml`):
  `fastapi_http_requests_total{method,endpoint,status}` và
  `fastapi_http_request_latency_seconds{method,endpoint}`. Nhãn `endpoint` là route template.
- **Log** (stdout → Promtail/Loki): mỗi thành phần không khả dụng ghi một dòng `WARNING` khi khởi động;
  lỗi gọi LLM, Neo4j và product-service đều được ghi lại.
- **Healthcheck**: `GET /health` (Docker healthcheck mỗi 30 giây).

---

## 9. Bảo mật

| Hạng mục | Hiện trạng |
|---|---|
| Endpoint quản trị | JWT HS256 (chung secret với user-service) và `role=admin` |
| Tra cứu đơn hàng qua chatbot | Chuyển tiếp JWT của người dùng; order-service lọc theo người trong token, không theo id từ client |
| Ngữ cảnh gửi cho LLM | Chỉ chứa tên, giá, danh mục, mô tả; không có id, URL hay dữ liệu cá nhân |
| `GET /recommend` | Người dùng lấy từ JWT; `user_id` tuỳ ý chỉ được chấp nhận kèm `X-Internal-Token` |
| `POST /behavior/track` | Bắt buộc JWT, `user_id` lấy từ token; `add_to_cart` / `purchase` chỉ nhận từ service nội bộ |
| Gọi giữa các service | Header `X-Internal-Token` (`INTERNAL_SERVICE_TOKEN`, so sánh bằng `hmac.compare_digest`) |
| Danh sách sản phẩm cá nhân hoá | product-service dùng `?personalized=1` và lấy người dùng từ JWT, không nhận `user_id` trên URL |
| CORS | `allow_origins=["*"]` không kèm credentials; gateway giới hạn origin cho preflight |
| Cổng 8007 | Không publish ra host; `/docs`, `/metrics`, `/admin/*` chỉ truy cập được trong mạng Docker |
| Secret | `.env` không commit; đổi `JWT_SECRET` và `NEO4J_PASSWORD` mặc định khi triển khai |

---

## 10. Hiệu năng và chất lượng

Đo trên dữ liệu demo: 300 sản phẩm, 21.545 sự kiện, 550 người dùng, GPU RTX 3050 4 GB cho Ollama.

| Chỉ số | Giá trị |
|---|---|
| `GET /recommend` (3 nguồn) | ~300 ms (~700 ms ở request đầu khi cache trống) |
| `GET /recommend/similar` | ~200 ms |
| Chatbot: ý định nhận bằng từ khoá + 1 lần gọi LLM | 0,4–1,5 s |
| Chatbot: câu trả lời cố định (chào hỏi, thanh toán, …) | < 10 ms |
| Chatbot: câu đầu tiên sau 5 phút không dùng | ~15 s (Ollama nạp model vào GPU) |
| `bootstrap.py` toàn bộ | ~40 s |
| LSTM HitRate@10 (validation theo thời gian) | **66,8%** (ngẫu nhiên: ~4%) |
| Tìm kiếm ngữ nghĩa precision@5 | 68% |
| Image Docker | 2,3 GB |

---

## 11. Phát triển

### Chạy local không cần Docker

```bash
cd ai-service
python -m venv .venv && .venv\Scripts\activate          # Linux/macOS: source .venv/bin/activate
pip install torch==2.3.0 --index-url https://download.pytorch.org/whl/cpu
pip install -r requirements.txt
# trỏ .env tới localhost: PRODUCT_SERVICE_URL=http://localhost:8002, NEO4J_URI=bolt://localhost:7687,
# OLLAMA_BASE_URL=http://localhost:11434, RABBITMQ_HOST=localhost
uvicorn main:app --reload --port 8007
```

### Cấu trúc mã nguồn

```
main.py                     Khởi tạo app, lifespan (nạp từng thành phần), middleware metrics / fault injection
config.py                   Cấu hình (pydantic-settings)
routers/                    Tầng HTTP: recommend · chatbot · behavior · admin
services/
  hybrid_service.py         Trộn điểm LSTM + đồ thị + ngữ nghĩa, fallback
  lstm_service.py           Điểm LSTM theo lịch sử người dùng
  graph_service.py          3 truy vấn đồ thị song song, có trọng số
  rag_service.py            Tìm kiếm ngữ nghĩa (embed câu hỏi → FAISS)
  indexing_service.py       Xây FAISS + đồng bộ node sản phẩm
  behavior_service.py       Ghi hành vi (CSV + Neo4j), đọc lịch sử (cache theo mtime)
  rabbitmq_consumer.py      Consumer nền, tự kết nối lại
  intent_service.py         Phân loại ý định (từ khoá → LLM), trích mức giá
  chatbot_service.py        Điều phối hội thoại, prompt, các lớp chống bịa thông tin
  llm.py                    Client Ollama / OpenAI dùng chung (timeout 60 s, temperature 0,2)
db/                         neo4j_client · faiss_client · product_client (cache 60 s) · order_client
models/                     lstm_model (kiến trúc) · lstm_inference · train_lstm
utils/                      embedder (e5, tiền tố query/passage) · scores (chuẩn hoá)
middleware/auth.py          Xác thực JWT, kiểm tra vai trò
schemas/                    Pydantic request/response
scripts/bootstrap.py        Pipeline index → graph → lstm → reload
```

### Quy ước

- Thao tác nặng CPU (embedding, FAISS, PyTorch) chạy qua `asyncio.to_thread` để không chặn event loop.
- Mọi lời gọi tới Neo4j, LLM và các service khác phải bắt lỗi và trả về kết quả rỗng thay vì lỗi 500.
- Thay đổi kiến trúc LSTM hoặc `LSTM_SEQUENCE_LENGTH` thì phải huấn luyện lại; thay đổi cách tạo văn
  bản sản phẩm (`indexing_service.product_document`) thì phải xây lại index.

---

## 12. Xử lý sự cố

| Triệu chứng | Nguyên nhân | Xử lý |
|---|---|---|
| Log `FAISS index not built yet` | Chưa xây index | `bootstrap.py index` |
| Log `FAISS index was built with …` | Đã đổi model embedding | `bootstrap.py index` |
| Log `LSTM checkpoint not found` | Chưa huấn luyện | `bootstrap.py lstm` (cần ≥ 100 sự kiện) |
| `bootstrap.py index` báo không có sản phẩm | product-service trống hoặc chưa migrate | Chạy migration / thêm sản phẩm |
| `/recommend` luôn trả `fallback` | Không gửi JWT, người dùng mới, hoặc chưa có index / đồ thị | Gửi `Authorization: Bearer`; với người dùng mới thì bình thường; chạy `bootstrap.py` |
| Token thật bị 401 `Invalid token` | `JWT_SECRET` của ai-service khác user-service | Đặt cùng giá trị trong `ai-service/.env` |
| Chatbot trả lời "tôi đang bận xử lý" | Không gọi được LLM | Kiểm tra container `ollama`, `OLLAMA_BASE_URL`, `ollama list` |
| Câu chatbot đầu tiên chậm ~15 s | Ollama giải phóng model sau 5 phút không dùng | Bình thường; có thể đặt `OLLAMA_KEEP_ALIVE` cho container ollama |
| Gợi ý có điểm nhưng danh sách rỗng | Id sản phẩm trong log không còn tồn tại | Đồng bộ danh mục với log; chạy lại `bootstrap.py` |
| `bootstrap.py` báo không gọi được service | Service chưa chạy | Restart ai-service để nạp artifact mới |
| Lỗi 502 qua gateway sau khi recreate container | Nginx giữ IP cũ | `docker compose restart gateway` |

---

## 13. Giới hạn đã biết

| Giới hạn | Ảnh hưởng | Hướng xử lý đề xuất |
|---|---|---|
| Log hành vi là file CSV | Không phù hợp nhiều replica; dung lượng tăng liên tục | Chuyển sang PostgreSQL / ClickHouse hoặc lưu theo partition |
| LSTM chỉ biết sản phẩm có trong lúc huấn luyện | Sản phẩm mới chưa được LSTM gợi ý (FAISS và đồ thị vẫn gợi ý được) | Huấn luyện lại định kỳ |
| FAISS xây lại toàn bộ | Chi phí tăng tuyến tính với danh mục | Cập nhật tăng dần (`add_with_ids`) hoặc chuyển sang `IndexHNSW` khi trên 100K sản phẩm |
| LLM 3B đôi khi quá thận trọng | Có thể trả "không có sản phẩm phù hợp" dù thẻ gợi ý vẫn đúng | Dùng model lớn hơn hoặc OpenAI |
| Chưa có bộ test tự động | Thay đổi phải kiểm tra thủ công | Bổ sung pytest cho intent, guard và pipeline huấn luyện |
