# AI Service — E-Commerce Platform

**FastAPI microservice for AI-powered recommendations and chatbot**, integrated with Neo4j graph database, FAISS vector search, and hybrid recommendation engine.

---

## Quick Start

### Prerequisites
- Docker & Docker Compose (for containerized deployment)
- Python 3.11+ (for local development)
- Neo4j running at `bolt://my-neo4j:7687` (credentials: `neo4j` / `12345678`)

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

### 2. Initialize Neo4j Graph (optional, automatic on first event)

```bash
python scripts/setup_ai.py
```

Creates User and Product node constraints in Neo4j.

### 3. Train LSTM Model (after 100+ behavior events)

```bash
python scripts/train_lstm.py
```

Trains sequence model on `data/user_behavior.csv`, saves checkpoint to `data/checkpoints/lstm_checkpoint.pt`.

---

## Architecture

```
AI-Service (FastAPI):
├── /routers
│   ├── behavior.py      → POST /behavior/track — record user actions
│   ├── recommend.py     → GET /recommend — hybrid recommendations
│   ├── chatbot.py       → POST /chatbot — NLP chatbot
│   └── admin.py         → POST /admin/rebuild-index, GET /admin/stats
│
├── /services
│   ├── behavior_service.py    → Persist events to CSV + Neo4j
│   ├── lstm_service.py        → Sequence-based recommendations (LSTM)
│   ├── graph_service.py       → Graph-based recommendations (Neo4j)
│   ├── rag_service.py         → Semantic search + LLM generation (FAISS + Ollama/OpenAI)
│   ├── hybrid_service.py      → Combine all 3 sources (configurable weights)
│   └── chatbot_service.py     → Intent detection + response generation
│
├── /db
│   ├── neo4j_client.py   → Async Neo4j driver, Cypher queries
│   ├── faiss_client.py   → FAISS index load/search/rebuild
│   └── product_client.py → HTTP client for product-service
│
├── /models
│   ├── lstm_model.py          → PyTorch LSTM architecture
│   ├── train_lstm.py          → Training pipeline (LSTM only)
│   └── lstm_inference.py      → Load checkpoint + predict
│
├── /utils
│   ├── embedder.py       → Sentence-Transformers wrapper (with fallback)
│   └── normalizer.py     → Score normalization helpers
│
└── main.py               → FastAPI app, lifespan, CORS, routers
```

---

## Data Flow

### Recommendation Pipeline (GET /recommend)

1. **LSTM Service** → Load user behavior history from CSV, predict next products
2. **Graph Service** → Query Neo4j: collaborative filtering + similar products
3. **RAG Service** → Semantic search via FAISS (if query provided)
4. **Hybrid** → Weighted average: `0.4×LSTM + 0.4×Graph + 0.2×RAG`
5. **Fallback** → If all empty, return trending (recently added) products

### Chatbot Pipeline (POST /chatbot)

1. **Intent Detection** → Classify: product_search | price_inquiry | greeting | general
2. **RAG Search** → Embed user message, find similar products via FAISS
3. **LLM Generation** → Ollama/OpenAI generates conversational response
4. **Product Cards** → Fetch product details and return as suggestions

### Behavior Tracking (POST /behavior/track)

1. Append event to `data/user_behavior.csv`
2. Ensure User + Product nodes exist in Neo4j
3. Create/update relationship edge (VIEW, PURCHASE, ADD_TO_CART, etc.)
4. Event cached for next LSTM training run

---

## Configuration

### `.env` Variables

```env
# Neo4j
NEO4J_URI=bolt://my-neo4j:7687
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
neo4j.exceptions.ServiceUnavailable: Unable to connect to bolt://my-neo4j:7687
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
