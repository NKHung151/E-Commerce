# AI Service — E-Commerce Platform

**FastAPI microservice for AI-powered recommendations and chatbot**, integrated with Neo4j graph database, FAISS vector search, and hybrid recommendation engine.

---

## Quick Start

### Prerequisites
- Docker & Docker Compose (for containerized deployment)
- Python 3.11+ (for local development)
- Neo4j running at `bolt://neo4j:7687` (credentials: `neo4j` / `12345678`)

### Build & Run with Docker

```bash
cd infrastructure
docker compose build ai-service
docker compose up -d ai-service
```

Service runs at `http://localhost:8007`, routed through gateway at `http://localhost:8080`.

### Local Development

```bash
# Create virtual environment
python3.11 -m venv venv
source venv/bin/activate  # on Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env from .env.example
cp .env.example .env

# Run development server
uvicorn main:app --reload --port 8007
```

---

## API Endpoints

### Public Endpoints (no auth required for testing)

**Health check:**
```bash
GET /health
```

### Customer/Staff Endpoints (require JWT token)

**Send chatbot message:**
```bash
POST /chatbot
Content-Type: application/json
Authorization: Bearer <jwt_token>

Body:
{
  "user_id": 1,
  "message": "I need a cheap laptop"
}

Response:
{
  "reply": "Here are some affordable laptops...",
  "products": [101, 205, 88],
  "intent": "product_search",
  "confidence": 0.95
}
```

**Get recommendations:**
```bash
GET /recommend?user_id=1&top_n=10
Authorization: Bearer <jwt_token>

Response:
{
  "user_id": 1,
  "products": [
    {"id": 101, "name": "Laptop XYZ", "price": 15000000, "image": "...", "category": "Electronics", "score": 0.85},
    ...
  ],
  "source": "hybrid"
}
```

**Track user behavior:**
```bash
POST /behavior/track
Content-Type: application/json

Body:
{
  "user_id": 1,
  "product_id": 101,
  "action": "view",
  "timestamp": "2026-04-26T14:32:00Z"
}

Response:
{
  "status": "ok",
  "message": "Event recorded"
}
```

### Admin Endpoints

**Rebuild FAISS index (re-embed all products, requires an admin JWT):**
```bash
POST /admin/rebuild-index
Authorization: Bearer <admin access token>

Response:
{
  "status": "ok",
  "products_indexed": 150
}
```

**Get AI service stats:**
```bash
GET /admin/stats

Response:
{
  "faiss_vectors": 150,
  "lstm_loaded": false
}
```

---

## Setup & Initialization

### 1. Build FAISS Index (fetch products from product-service)

```bash
python scripts/setup_ai.py
```

This:
- Fetches all products from product-service
- Embeds product names/categories using `sentence-transformers`
- Builds FAISS index (~2-3 min for 500+ products)
- Saves to `data/product_embeddings/index.faiss`

**Or call via API:**
```bash
curl -X POST http://localhost:8007/admin/rebuild-index -H "Authorization: Bearer $ADMIN_TOKEN"
```

### 2. Rebuild the Neo4j graph from the behaviour log (optional)

```bash
python scripts/sync_neo4j.py
```

Imports `data/user_behavior.csv` into Neo4j in batches (User -[VIEW|ADD_TO_CART|BUY]-> Product),
then computes `SIMILAR_TO` edges between products co-purchased by at least two users.
New events are added to the graph automatically as they arrive.

### 3. Train LSTM Model (after 100+ behavior events)

```bash
python scripts/train_lstm.py
```

Trains the sequence model on `data/user_behavior.csv` and saves the best epoch to
`data/checkpoints/lstm_checkpoint.pt` (plots in `data/plots/` if matplotlib is installed).

---

## Architecture

```
AI-Service (FastAPI):
├── /routers
│   ├── behavior.py      → POST /behavior/track — record user actions
│   ├── recommend.py     → GET /recommend, /recommend/similar, /recommend/bought-together
│   ├── chatbot.py       → POST /chatbot — shopping assistant
│   └── admin.py         → POST /admin/rebuild-index, GET /admin/stats (admin JWT)
│
├── /services
│   ├── behavior_service.py    → Persist events (CSV log + Neo4j), cached user history
│   ├── rabbitmq_consumer.py   → user-behavior-queue → behavior_service (on the FastAPI loop)
│   ├── lstm_service.py        → Next-item scores from the LSTM
│   ├── graph_service.py       → Collaborative / similar / bought-together scores (Neo4j)
│   ├── rag_service.py         → Semantic product search (FAISS)
│   ├── hybrid_service.py      → Weighted blend of the three sources + fallback
│   ├── indexing_service.py    → Build FAISS index + sync product nodes to Neo4j
│   ├── intent_service.py      → Chatbot intent: keyword rules, then LLM; price extraction
│   ├── chatbot_service.py     → Intent dispatch, grounded product answers
│   └── llm.py                 → Shared OpenAI / Ollama client
│
├── /db
│   ├── neo4j_client.py   → Async Neo4j driver, Cypher queries (single + batched writes)
│   ├── faiss_client.py   → FAISS index load/search/rebuild
│   ├── product_client.py → HTTP client for product-service (cached catalogue)
│   └── order_client.py   → HTTP client for order-service (chatbot order lookup)
│
├── /models
│   ├── lstm_model.py          → PyTorch LSTM architecture
│   ├── train_lstm.py          → Training pipeline
│   └── lstm_inference.py      → Load checkpoint + predict (skips already-seen products)
│
├── /utils
│   ├── embedder.py       → Sentence-Transformers wrapper (with fallback)
│   └── scores.py         → Score normalisation
│
└── main.py               → FastAPI app, lifespan, metrics, routers
```

---

## Data Flow

### Recommendation Pipeline (GET /recommend)

1. **History** → the user's interactions from the behaviour log (parsed once per file change)
2. **LSTM** → probability of each product being the *next* one, given the last 10 interactions
3. **Graph** → Neo4j: users who bought the same things, `SIMILAR_TO` products, items bought
   together with the last viewed product
4. **RAG** → FAISS similarity to the `context` query or to the last viewed product's name
5. **Hybrid** → each source normalised to 0..1, then `0.15×LSTM + 0.15×Graph + 0.7×RAG`
6. **Fallback** → no source at all (anonymous / new user): newest products

### Chatbot Pipeline (POST /chatbot)

1. **Intent** → keyword rules (orders, account, payment, policy, specs), otherwise the LLM;
   a price bound ("dưới 15 triệu") is always extracted locally
2. **Static answers** → account / payment questions answered from fixed, accurate text
3. **Orders** → latest order of the logged-in user (JWT forwarded to order-service)
4. **Products** → FAISS search, price filter, LLM answers only from those products;
   cards are shown only for products the answer actually mentions
5. **LLM unavailable** → a friendly fallback text plus the search results

### Behavior Tracking (RabbitMQ `user-behavior-queue` or POST /behavior/track)

1. Append event to `data/user_behavior.csv` (history + LSTM training data)
2. One Cypher query upserts User + Product and increments the relationship counter

---

## Configuration

### `.env` Variables

```env
# Neo4j
NEO4J_URI=bolt://neo4j:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=12345678

# Services
PRODUCT_SERVICE_URL=http://product-service:8002
JWT_SECRET=your-shared-secret-key-here

# LLM (choose one: openai, ollama)
LLM_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3
OPENAI_API_KEY=sk-...

# Embedding
EMBEDDING_MODEL=sentence-transformers/all-MiniLM-L6-v2

# Paths
FAISS_INDEX_PATH=data/product_embeddings/index.faiss
LSTM_CHECKPOINT_PATH=data/checkpoints/lstm_checkpoint.pt
BEHAVIOR_CSV_PATH=data/user_behavior.csv

# Hybrid weights (must sum to ~1.0)
LSTM_WEIGHT=0.15
GRAPH_WEIGHT=0.15
RAG_WEIGHT=0.7
```

### Hybrid Recommendation Weights

Adjust in `.env` or `config.py`:
- **LSTM_WEIGHT** (0.15): Sequence-based predictions
- **GRAPH_WEIGHT** (0.15): Collaborative + similarity
- **RAG_WEIGHT** (0.7): Semantic relevance (content-based, dominant by default)

Example: For a more collaborative system, raise GRAPH_WEIGHT and lower RAG_WEIGHT.

---

## Integration with Other Services

### Frontend Chatbot Widget

```javascript
// POST /chatbot (routed through gateway)
const response = await fetch('http://localhost:8080/chatbot', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` },
  body: JSON.stringify({ user_id: 1, message: 'I need a laptop' })
})
```

### Backend Services (track behavior)

Add to **product-service** (on product view):
```python
httpx.post("http://ai-service:8007/behavior/track", json={
    "user_id": user.id, "product_id": product.id,
    "action": "view", "timestamp": str(datetime.utcnow())
}, timeout=1.0)
```

Add to **cart-service** (on add to cart):
```python
httpx.post("http://ai-service:8007/behavior/track", json={
    "user_id": user.id, "product_id": product_id,
    "action": "add_to_cart"
})
```

Add to **order-service** (on purchase):
```python
httpx.post("http://ai-service:8007/behavior/track", json={
    "user_id": user.id, "product_id": item.product_id,
    "action": "purchase"
})
```

---

## Troubleshooting

### FAISS Index Not Found
```
⚠️ FAISS index not found — run scripts/build_faiss_index.py first
```
**Fix:** Run `python scripts/setup_ai.py` to build index from product catalog.

### Neo4j Connection Failed
```
neo4j.exceptions.ServiceUnavailable: Unable to connect to bolt://neo4j:7687
```
**Fix:** Ensure Neo4j container is running: `docker ps | grep neo4j`

### LSTM Model Not Loaded
```
⚠️ LSTM checkpoint not found — using fallback
```
**Normal:** LSTM is optional. Add 100+ behavior events then run `python scripts/train_lstm.py`.

### Ollama/LLM Generation Fails
```
ERROR: Failed to connect to Ollama at http://localhost:11434
```
**Fix:** Install Ollama locally or use `LLM_PROVIDER=openai` with `OPENAI_API_KEY`.

---

## Performance Tips

1. **FAISS Index Build** (~2-3 min for 500 products)
   - Run once on setup, rebuild only when product catalog changes significantly
   
2. **Neo4j Queries**
   - Enable indexes on `User.id`, `Product.id` (auto-created)
   - Limit graph query results (default: 15 products per source)

3. **LLM Latency**
   - Ollama local (fast, no external calls)
   - OpenAI (reliable, costs money, requires API key)

4. **Recommendation Weights**
   - Graph queries fastest (pre-computed relationships)
   - RAG moderate (FAISS search, one LLM call)
   - LSTM slowest if checkpoint large (but highly accurate)

---

## Tests

```bash
# Basic smoke test
curl http://localhost:8007/health

# With authentication (get JWT from frontend login)
curl -H "Authorization: Bearer <token>" \
     http://localhost:8007/recommend?user_id=1&top_n=5
```

---

## License & Attribution

*E-Commerce Platform — Software Architecture & Design (SoAD)*  
*GVHD: Trần Đình Quế — April 2026*  
*AI-Service Component*
