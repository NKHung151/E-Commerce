# AI Service — Novamart

Dịch vụ FastAPI (cổng **8007**) cung cấp **gợi ý sản phẩm**, **tìm kiếm ngữ nghĩa** và **chatbot tư vấn**
cho cửa hàng. Service luôn khởi động được kể cả khi chưa huấn luyện gì: thành phần nào chưa có dữ liệu
thì tạm tắt, các thành phần còn lại vẫn chạy.

---

## 1. Các "mô hình" trong service

| Thành phần | Công nghệ | Huấn luyện? | Dùng để |
|---|---|---|---|
| **Embedding** | `intfloat/multilingual-e5-small` (Transformer 12 lớp, 384 chiều, đa ngôn ngữ) | Không — model có sẵn, tự tải ~470 MB lần đầu | Biến tên/mô tả sản phẩm và câu hỏi thành vector |
| **FAISS index** | `IndexFlatIP` (tìm kiếm cosine chính xác) | *Build* từ danh mục sản phẩm | Tìm sản phẩm giống câu hỏi / giống món vừa xem |
| **LSTM** | PyTorch: Embedding 64 → LSTM 2 lớp × 128 → Linear | **Có** — học từ log hành vi | Dự đoán món tiếp theo user sẽ xem/mua |
| **Đồ thị** | Neo4j + truy vấn Cypher (đếm đồng xuất hiện) | Không — *dựng* từ log hành vi | Lọc cộng tác, "thường mua cùng", sản phẩm tương tự |
| **LLM** | `qwen2.5:3b` qua Ollama (hoặc OpenAI) | Không — model có sẵn | Phân loại ý định chatbot, viết câu trả lời |

Chỉ **LSTM** thực sự được *huấn luyện*. FAISS index và đồ thị được *xây dựng* từ dữ liệu; embedding và LLM là
model tiền huấn luyện dùng nguyên.

Embedding được chọn bằng đo đạc: với 8 câu hỏi mua sắm tiếng Việt trên 300 sản phẩm, precision@5 của
`multilingual-e5-small` là **68%**, so với 45% (`paraphrase-multilingual-MiniLM-L12-v2`) và 28%
(`all-MiniLM-L6-v2`, model tiếng Anh dùng trước đây).

---

## 2. Chạy từ con số 0

### Bước 0 — Hạ tầng (một lần, dùng chung cho các dự án)

```bash
docker network create shared-infra
docker run -d --name neo4j --network shared-infra -p 7474:7474 -p 7687:7687 \
  -e NEO4J_AUTH=neo4j/12345678 -v neo4j_data:/data neo4j:5
docker run -d --name rabbitmq --network shared-infra -p 5672:5672 -p 15672:15672 rabbitmq:3-management
docker run -d --name ollama --gpus all --network shared-infra -p 11434:11434 \
  -v ollama_data:/root/.ollama ollama/ollama            # bỏ --gpus all nếu không có GPU NVIDIA
docker exec ollama ollama pull qwen2.5:3b               # ~1,9 GB
```

### Bước 1 — Cấu hình và khởi động

```bash
cp ai-service/.env.example ai-service/.env              # JWT_SECRET phải trùng user-service
cd infrastructure && docker compose up -d --build ai-service
```

Lần đầu, model embedding (~470 MB) được tải **ở chế độ nền** vào `ai-service/data/hf-cache`; service vẫn
lên ngay. Lúc này chatbot đã trả lời được (LLM) và gợi ý trả về sản phẩm mới nhất (fallback).

### Bước 2 — Có sản phẩm

Migration của các service đã nạp sẵn dữ liệu demo khớp với log hành vi trong `data/`: 10 danh mục
(catalog), 300 sản phẩm id 1–300 (product), 445 review của người đã mua (comment-rate) và customer
`user03`…`user550` (user, mật khẩu `customer123`). Dữ liệu sinh bởi
`infrastructure/seed/generate_seed_data.py`. Sản phẩm thêm sau qua Back office (`/admin/products`) cần
chạy lại `bootstrap.py index` để vào FAISS.

### Bước 3 — Có hành vi người dùng

LSTM và đồ thị học từ `data/user_behavior.csv`. File này **tự đầy lên** khi người dùng xem / click /
thêm giỏ / mua (product, cart, order service gửi sự kiện qua RabbitMQ). Cần tối thiểu 100 sự kiện để
huấn luyện LSTM; đồ thị dùng được ngay từ những sự kiện đầu tiên.

### Bước 4 — Huấn luyện / xây dựng (một lệnh)

```bash
docker exec ecommerce-ai-service-1 python scripts/bootstrap.py          # tất cả
docker exec ecommerce-ai-service-1 python scripts/bootstrap.py index    # chỉ FAISS (sau khi đổi sản phẩm)
docker exec ecommerce-ai-service-1 python scripts/bootstrap.py lstm     # chỉ huấn luyện lại LSTM
```

| Bước | Làm gì | Đầu ra |
|---|---|---|
| `index` | Embed toàn bộ danh mục | `data/product_embeddings/index.faiss`, `data/product_metadata.json` |
| `graph` | Xoá cạnh hành vi cũ, nạp lại toàn bộ log theo lô, tính cạnh `SIMILAR_TO` | Đồ thị Neo4j |
| `lstm` | Huấn luyện, giữ epoch có HitRate@10 tốt nhất | `data/checkpoints/lstm_checkpoint.pt` |

Mỗi bước chạy lại an toàn. Cuối cùng script gọi `POST /admin/reload` để service nạp kết quả mới, không cần
restart. Đo trên log mẫu 21.497 sự kiện / 550 user / 226 sản phẩm: **toàn bộ mất ~40 giây**, LSTM đạt
**HitRate@10 = 67%** trên tập kiểm tra (gợi ý ngẫu nhiên: ~4%).

### Bước 5 — Kiểm tra

```bash
curl "localhost:8007/recommend?user_id=1&top_n=5"          # source: lstm / graph / rag / fallback
curl -X POST localhost:8007/chatbot -H "Content-Type: application/json" -d '{"message":"Tai nghe dưới 2 triệu"}'
curl localhost:8007/admin/stats -H "Authorization: Bearer <admin JWT>"
```

---

## 3. Cách hoạt động

### Gợi ý — `GET /recommend?user_id=&top_n=&context=`

```
lịch sử user (log CSV, chỉ đọc lại khi file thay đổi)
 ├─► LSTM: 10 bước gần nhất → xác suất món kế tiếp (bỏ món đã xem)
 ├─► Neo4j (3 truy vấn song song):
 │     user khác mua cùng món với bạn còn mua gì   ×0,4
 │     SIMILAR_TO từ món bạn đã tương tác          ×0,3
 │     thường mua cùng món bạn xem gần nhất        ×0,8
 └─► FAISS: giống `context` hoặc giống tên món bạn xem gần nhất
        mỗi nguồn chuẩn hoá 0..1 → 0,15·LSTM + 0,15·Graph + 0,7·RAG → top N
        không nguồn nào có dữ liệu (khách mới) → sản phẩm mới nhất
```

Trọng số chỉnh trong `.env` (`LSTM_WEIGHT`, `GRAPH_WEIGHT`, `RAG_WEIGHT`). product-service gọi endpoint này
(top 50) để sắp xếp danh sách sản phẩm theo từng người. `/recommend/similar` và
`/recommend/bought-together` dùng đồ thị; chưa có dữ liệu thì lấy sản phẩm cùng danh mục.

### Chatbot — `POST /chatbot {message}`

1. **Ý định**: luật từ khoá (đơn hàng, tài khoản, thanh toán, chính sách, thông số, mua/tìm); còn lại hỏi
   LLM. Mức giá ("dưới 15 triệu", "tối đa 500k") luôn được trích bằng regex.
2. **Trả lời**: đơn hàng → order-service (bằng JWT của user); thanh toán / tài khoản → câu cố định;
   chính sách → LLM chỉ diễn đạt lại văn bản chính sách; còn lại → **tìm sản phẩm**: FAISS lấy 15 món,
   lọc giá, LLM chỉ được tư vấn trong 5 món đó; chỉ hiện thẻ sản phẩm mà câu trả lời thật sự nhắc tới.
3. LLM lỗi → câu dự phòng + kết quả tìm kiếm.

### Ghi hành vi

RabbitMQ `user-behavior-queue` (hoặc `POST /behavior/track`) → 1 dòng vào CSV + 1 truy vấn Cypher
(upsert User/Product, tăng bộ đếm quan hệ). Đồ thị cập nhật ngay; LSTM học sự kiện mới ở lần
`bootstrap.py lstm` sau.

### Huấn luyện LSTM (chi tiết)

- Sắp xếp sự kiện của từng user theo thời gian; các sự kiện liên tiếp trên **cùng một sản phẩm**
  (view → click → add_to_cart → purchase) gộp thành 1 bước — nếu không, 55% mẫu chỉ là "món kế tiếp = món
  đang xem".
- Mỗi cửa sổ ≤ 10 bước → bước tiếp theo là một mẫu; bước cuối của mỗi user dùng làm tập kiểm tra
  (dự đoán tương lai từ quá khứ).
- Cross-entropy trên toàn bộ sản phẩm, Adam, dừng sớm theo HitRate@10; lưu epoch tốt nhất.

---

## 4. API

| Method | Path | Auth | Mô tả |
|---|---|---|---|
| GET | `/recommend` | — | Gợi ý cá nhân hoá (`user_id`, `top_n` ≤ 50, `context`) |
| GET | `/recommend/similar` | — | Sản phẩm tương tự (`product_id`) |
| GET | `/recommend/bought-together` | — | Thường mua cùng (`product_id`) |
| POST | `/chatbot` | JWT tuỳ chọn | Chatbot; JWT cần cho câu hỏi về đơn hàng |
| POST | `/behavior/track` | — | Ghi hành vi `{user_id, product_id, action}` |
| POST | `/admin/rebuild-index` | admin | Build lại FAISS từ danh mục hiện tại |
| POST | `/admin/reload` | admin | Nạp lại FAISS + LSTM từ đĩa |
| GET | `/admin/stats` | admin | Trạng thái từng thành phần |
| GET | `/health`, `/metrics` | — | Healthcheck, Prometheus |

## 5. Cấu trúc

```
main.py                    FastAPI app: khởi động từng thành phần (lỗi thì bỏ qua), metrics
config.py                  cấu hình từ .env
routers/                   recommend, chatbot, behavior, admin
services/
  hybrid_service.py        trộn LSTM + graph + RAG
  lstm_service.py          điểm LSTM
  graph_service.py         điểm đồ thị
  rag_service.py           tìm kiếm ngữ nghĩa (FAISS)
  indexing_service.py      build FAISS + node sản phẩm
  behavior_service.py      ghi hành vi, đọc lịch sử (cache)
  rabbitmq_consumer.py     nhận sự kiện hành vi
  intent_service.py        phân loại ý định, trích giá
  chatbot_service.py       xử lý hội thoại
  llm.py                   client OpenAI / Ollama dùng chung
db/                        neo4j_client, faiss_client, product_client (cache), order_client
models/                    lstm_model, lstm_inference, train_lstm
utils/                     embedder (e5), scores
scripts/bootstrap.py       huấn luyện / xây dựng từ đầu
data/                      (volume, không commit) log, index, checkpoint, cache model
```

## 6. Biến môi trường chính

| Biến | Mặc định | Ghi chú |
|---|---|---|
| `NEO4J_URI` / `NEO4J_PASSWORD` | `bolt://neo4j:7687` / `12345678` | |
| `PRODUCT_SERVICE_URL`, `ORDER_SERVICE_URL` | `http://product-service:8002`, `http://order-service:8004` | |
| `JWT_SECRET` | `shared-jwt-secret` | Phải trùng user-service |
| `LLM_PROVIDER` | `ollama` | `openai` cần `OPENAI_API_KEY` |
| `OLLAMA_BASE_URL` / `OLLAMA_MODEL` | `http://ollama:11434` / `qwen2.5:3b` | |
| `EMBEDDING_MODEL` | `intfloat/multilingual-e5-small` | Đổi model ⇒ phải `bootstrap.py index` lại (service tự phát hiện) |
| `LSTM_WEIGHT` / `GRAPH_WEIGHT` / `RAG_WEIGHT` | `0.15` / `0.15` / `0.7` | |
| `BEHAVIOR_CSV_PATH` | `data/user_behavior.csv` | |

## 7. Xử lý sự cố

| Triệu chứng | Nguyên nhân | Cách xử lý |
|---|---|---|
| Log: *FAISS index not built yet* / *built with another model* | Chưa build hoặc đã đổi model embedding | `bootstrap.py index` |
| Log: *LSTM checkpoint not found* | Chưa huấn luyện | `bootstrap.py lstm` (cần ≥ 100 sự kiện) |
| `/recommend` luôn trả `source: fallback` | User chưa có lịch sử, hoặc chưa có index/đồ thị | Bình thường với user mới; chạy `bootstrap.py` |
| Chatbot: *"tôi đang bận xử lý"* | Không gọi được LLM | Kiểm tra container `ollama` và `OLLAMA_BASE_URL` |
| Câu trả lời đầu tiên chậm (~15 s) | Ollama nạp model vào GPU sau 5 phút không dùng | Bình thường; các câu sau ~1 s |
| Gợi ý có điểm nhưng danh sách rỗng | Id trong log không còn trong product-service | Thêm sản phẩm / dùng log khớp danh mục |
