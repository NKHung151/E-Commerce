from fastapi import APIRouter, Depends
from middleware.auth import require_roles
from db.faiss_client import faiss_client
from services.indexing_service import build_product_index

# Index rebuilds are expensive and rewrite the graph: admin JWT required
# (ai-service port 8007 is published by docker-compose, so this was open to anyone).
router = APIRouter(dependencies=[Depends(require_roles("admin"))])


@router.post("/rebuild-index")
async def rebuild_index():
    indexed = await build_product_index()
    return {"status": "ok", "products_indexed": indexed}


@router.get("/stats")
async def stats():
    from models.lstm_inference import lstm_inference
    return {
        "faiss_vectors": faiss_client.index.ntotal if faiss_client.index else 0,
        "lstm_loaded": lstm_inference.loaded,
    }
