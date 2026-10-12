#!/usr/bin/env python3
"""
One-time setup script for ai-service:
- Creates Neo4j constraints and product nodes
- Builds the FAISS index from the product catalog
"""
import asyncio
import sys
from pathlib import Path

# Add ai-service to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from db.neo4j_client import neo4j_client  # noqa: E402
from services.indexing_service import build_product_index  # noqa: E402


async def main():
    print("🚀 AI-Service Setup")
    print("=" * 50)
    graph_ok = True
    try:
        await neo4j_client.connect()
        print("✅ Connected to Neo4j")
    except Exception as e:
        graph_ok = False
        print(f"⚠️  Neo4j unavailable, building FAISS only: {e}")

    try:
        indexed = await build_product_index(sync_graph=graph_ok)
        print(f"✅ FAISS index built: {indexed} products")
    except Exception as e:
        print(f"❌ Indexing failed: {e}")
    finally:
        if graph_ok:
            await neo4j_client.close()
    print("\n✅ Setup complete!")


if __name__ == "__main__":
    asyncio.run(main())
