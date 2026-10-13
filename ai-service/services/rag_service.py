import asyncio

import numpy as np
from db.faiss_client import faiss_client
from utils.embedder import embedder


async def get_rag_scores(query: str, top_k: int = 10) -> dict:
    """Semantic similarity of products to `query` using the FAISS index."""
    if faiss_client.index is None:
        return {}
    # Encoding is CPU-bound (sentence-transformers); keep it off the event loop.
    vector = np.array(await asyncio.to_thread(embedder.encode, query))
    results = faiss_client.search(vector, top_k=top_k)
    return {r["product_id"]: r["score"] for r in results}
