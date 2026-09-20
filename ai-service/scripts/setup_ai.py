#!/usr/bin/env python3
"""
One-time setup script for ai-service:
- Builds FAISS index from product catalog
- Seeds initial Neo4j constraints
- Generates sample behavior data if needed
"""
import asyncio
import sys
from pathlib import Path

# Add ai-service to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from db.neo4j_client import neo4j_client
from db.product_client import product_client
from db.faiss_client import faiss_client
from utils.embedder import embedder
import numpy as np


async def setup_faiss_index():
    """Fetch products from product-service and build FAISS index."""
    print("📦 Fetching products from product-service...")
    try:
        products = await product_client.get_all_products()
        print(f"✅ Fetched {len(products)} products")

        if not products:
            print("⚠️  No products found, skipping FAISS build")
            return

        # Prepare texts and metadata
        texts, ids, metadata = [], [], {}
        for p in products:
            desc = f"{p['name']} {p['category']['name'] if isinstance(p.get('category'), dict) else ''}"
            texts.append(desc)
            ids.append(p["id"])
            metadata[p["id"]] = {
                "name": p["name"],
                "price": p.get("price", 0),
                "image": p.get("image"),
                "category": p["category"]["name"] if isinstance(p.get("category"), dict) else ""
            }

        print(f"🤖 Embedding {len(texts)} product descriptions...")
        embeddings = np.array([embedder.encode(t) for t in texts])

        print("🔨 Building FAISS index...")
        faiss_client.rebuild(embeddings, ids, metadata)
        print(f"✅ FAISS index built: {len(ids)} products indexed")
    except Exception as e:
        print(f"❌ FAISS setup failed: {e}")


async def setup_neo4j():
    """Create Neo4j constraints and initial structure."""
    print("\n📊 Setting up Neo4j...")
    try:
        await neo4j_client.connect()
        print("✅ Connected to Neo4j")

        await neo4j_client.create_constraints()
        print("✅ Created Neo4j constraints")

        await neo4j_client.close()
    except Exception as e:
        print(f"❌ Neo4j setup failed: {e}")


async def main():
    print("🚀 AI-Service Setup")
    print("=" * 50)
    await setup_faiss_index()
    await setup_neo4j()
    print("\n✅ Setup complete!")


if __name__ == "__main__":
    asyncio.run(main())
