from fastapi import APIRouter, Depends
from middleware.auth import require_roles
from db.faiss_client import faiss_client
from db.product_client import product_client, category_name
from db.neo4j_client import neo4j_client
from utils.embedder import embedder
import numpy as np

# Index rebuilds are expensive and rewrite the graph: admin JWT required
# (ai-service port 8007 is published by docker-compose, so this was open to anyone).
router = APIRouter(dependencies=[Depends(require_roles("admin"))])


@router.post("/rebuild-index")
async def rebuild_index():
    await neo4j_client.create_constraints()
    products = await product_client.get_all_products()
    texts, ids, metadata = [], [], {}

    for p in products:
        desc = f"{p['name']} {category_name(p, '')}"
        texts.append(desc)
        ids.append(p["id"])
        metadata[p["id"]] = {
            "name": p["name"], "price": p["price"],
            "image": p.get("image_url") or p.get("image"), "category":
            category_name(p, "")
        }
        await neo4j_client.merge_product(
            p["id"], p["name"],
            category_name(p, ""),
            p["price"]
        )

    embeddings = np.array([embedder.encode(t) for t in texts]) if texts else np.zeros((0, 1))
    faiss_client.rebuild(embeddings, ids, metadata)

    return {"status": "ok", "products_indexed": len(ids)}


@router.get("/stats")
async def stats():
    from models.lstm_inference import lstm_inference
    return {
        "faiss_vectors": faiss_client.index.ntotal if faiss_client.index else 0,
        "lstm_loaded": lstm_inference.loaded,
    }
