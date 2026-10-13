from fastapi import APIRouter, Depends

from config import settings
from db.faiss_client import faiss_client
from db.neo4j_client import neo4j_client
from middleware.auth import require_roles
from models.lstm_inference import lstm_inference
from services.indexing_service import build_product_index

# Index rebuilds are expensive and rewrite the graph: admin JWT required
# (ai-service port 8007 is published by docker-compose).
router = APIRouter(dependencies=[Depends(require_roles("admin"))])


@router.post("/rebuild-index")
async def rebuild_index():
    """Re-embed the current catalogue into FAISS and upsert product nodes in Neo4j."""
    indexed = await build_product_index()
    return {"status": "ok", "products_indexed": indexed}


@router.post("/reload")
async def reload_models():
    """Reload the FAISS index and LSTM checkpoint from disk (after scripts/bootstrap.py)."""
    faiss_client.load_index()
    lstm_inference.load()
    return await stats()


@router.get("/stats")
async def stats():
    graph = None
    try:
        rows = await neo4j_client.run(
            "MATCH (u:User) WITH count(u) AS users MATCH (p:Product) WITH users, count(p) AS products "
            "OPTIONAL MATCH ()-[r]->() RETURN users, products, count(r) AS relationships"
        )
        graph = rows[0] if rows else None
    except Exception as e:
        graph = {"error": str(e)}
    return {
        "embedding_model": settings.EMBEDDING_MODEL,
        "faiss_products": faiss_client.index.ntotal if faiss_client.index else 0,
        "lstm_loaded": lstm_inference.loaded,
        "lstm_val_hit_rate_at_10": lstm_inference.val_hit_rate,
        "graph": graph,
        "llm": f"{settings.LLM_PROVIDER}:{settings.OLLAMA_MODEL if settings.LLM_PROVIDER == 'ollama' else 'openai'}",
    }
