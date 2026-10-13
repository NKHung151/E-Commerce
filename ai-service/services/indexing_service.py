"""Builds the FAISS product index and syncs product nodes into Neo4j.

Single implementation used by POST /admin/rebuild-index and scripts/bootstrap.py.
(There used to be three copies that embedded different text, so search quality
depended on which one ran last.)
"""
import asyncio
import logging

from db.faiss_client import faiss_client
from db.neo4j_client import neo4j_client
from db.product_client import product_client, category_name
from utils.embedder import embedder

logger = logging.getLogger(__name__)


def product_document(product: dict) -> str:
    """Text that gets embedded for a product: name, category and description."""
    return (f"Sản phẩm: {product['name']}. Danh mục: {category_name(product)}. "
            f"Mô tả: {product.get('description', '')}")


async def build_product_index(sync_graph: bool = True) -> int:
    """Re-embed every product into FAISS (and optionally upsert Neo4j nodes).

    Returns the number of indexed products.
    """
    if not await asyncio.to_thread(lambda: embedder.available):
        raise RuntimeError(f"Embedding model {embedder.model_name} could not be loaded")
    products = await product_client.get_all_products(fresh=True)
    if not products:
        logger.warning("No products found to index")
        return 0

    ids = [p["id"] for p in products]
    metadata = {
        p["id"]: {
            "name": p["name"],
            "price": p.get("price", 0),
            "image": p.get("image_url") or p.get("image"),
            "category": category_name(p),
        }
        for p in products
    }
    # Embedding the catalogue is CPU-heavy: run it in a worker thread so the API stays responsive.
    vectors = await asyncio.to_thread(embedder.encode_documents, [product_document(p) for p in products])
    await asyncio.to_thread(faiss_client.rebuild, vectors, ids, metadata, embedder.model_name)

    if sync_graph:
        await neo4j_client.create_constraints()
        await neo4j_client.merge_products([
            {"id": p["id"], "name": p["name"], "category": category_name(p), "price": float(p.get("price", 0))}
            for p in products
        ])

    logger.info(f"Indexed {len(ids)} products")
    return len(ids)
