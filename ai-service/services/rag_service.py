import asyncio

from db.faiss_client import faiss_client
from utils.embedder import embedder


async def get_rag_scores(query: str, top_k: int = 10) -> dict:
    """Cosine similarity of products to `query` via the FAISS index ({} when unavailable)."""
    if faiss_client.index is None or not query.strip():
        return {}
    # Encoding is CPU-bound (transformer forward pass); keep it off the event loop.
    vector = await asyncio.to_thread(embedder.encode_query, query)
    return {r["product_id"]: r["score"] for r in faiss_client.search(vector, top_k=top_k)}
