#!/usr/bin/env python3
"""
Rebuild the recommendation graph in Neo4j from the behaviour log:
  1. product nodes (with metadata from product-service when reachable)
  2. User -[VIEW|ADD_TO_CART|BUY]-> Product relationships from data/user_behavior.csv
  3. SIMILAR_TO edges between products co-purchased by >= 2 users

Uses NEO4J_URI / NEO4J_PASSWORD from .env; writes are batched (UNWIND), so the
full log imports in seconds instead of one round trip per row.
"""
import asyncio
import sys
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).parent.parent))

from config import settings  # noqa: E402
from db.neo4j_client import neo4j_client  # noqa: E402
from db.product_client import category_name, product_client  # noqa: E402


async def sync_data():
    csv_path = Path(settings.BEHAVIOR_CSV_PATH)
    if not csv_path.exists():
        print(f"Behaviour log not found: {csv_path}")
        return

    df = pd.read_csv(csv_path).dropna(subset=["user_id", "product_id"])
    print(f"Loaded {len(df)} behaviour events from {csv_path}")

    await neo4j_client.connect()
    try:
        await neo4j_client.create_constraints()

        try:
            products = await product_client.get_all_products()
        except Exception as e:
            print(f"product-service unreachable ({e}); product nodes will only carry ids")
            products = []
        if products:
            await neo4j_client.merge_products([
                {"id": p["id"], "name": p["name"], "category": category_name(p), "price": float(p.get("price", 0))}
                for p in products
            ])
            print(f"Synced {len(products)} products")

        await neo4j_client.record_events(df[["user_id", "product_id", "action"]].to_dict("records"))
        print(f"Synced {len(df)} interactions from {df['user_id'].nunique()} users")

        await neo4j_client.compute_similarity_edges()
        print("Computed SIMILAR_TO edges from co-purchases — done.")
    finally:
        await neo4j_client.close()


if __name__ == "__main__":
    asyncio.run(sync_data())
