from typing import Optional

from fastapi import APIRouter, Depends, HTTPException

from config import settings
from db.faiss_client import faiss_client
from db.neo4j_client import neo4j_client
from middleware.auth import get_optional_user, is_internal_service
from models.lstm_inference import lstm_inference
from services.indexing_service import schedule_rebuild


async def require_admin_or_service(
    user: Optional[dict] = Depends(get_optional_user), internal: bool = Depends(is_internal_service)
):
    """Admin JWT, or a service carrying X-Internal-Token (product-service on catalogue changes)."""
    if internal:
        return
    if user is None:
        raise HTTPException(status_code=401, detail="Missing token")
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Forbidden")


router = APIRouter(dependencies=[Depends(require_admin_or_service)])


@router.post("/rebuild-index", status_code=202)
async def rebuild_index():
    """Re-embed the catalogue into FAISS and upsert product nodes in Neo4j, in the background.

    Called by product-service after every product change; bursts are coalesced into one
    rebuild. Progress shows up in /admin/stats (faiss_products).
    """
    schedule_rebuild()
    return {"status": "scheduled"}


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
