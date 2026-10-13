#!/usr/bin/env python3
"""
Build everything the AI service needs, from scratch or again later:

  index  embed the product catalogue (product-service) into the FAISS index
  graph  rebuild the Neo4j graph from data/user_behavior.csv
         (product nodes, User-[VIEW|ADD_TO_CART|BUY]->Product, SIMILAR_TO edges)
  lstm   train the next-item LSTM on data/user_behavior.csv
  all    the three steps above (default), then ask the running service to reload

Run inside the container:   docker exec ecommerce-ai-service-1 python scripts/bootstrap.py [step ...]
Each step is independent and safe to re-run.
"""
import argparse
import asyncio
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from config import settings  # noqa: E402

MIN_LSTM_EVENTS = 100  # fewer interactions than this cannot train anything useful


def banner(text):
    print(f"\n=== {text} " + "=" * max(0, 60 - len(text)))


async def step_index():
    from services.indexing_service import build_product_index
    banner("1/3 FAISS index (semantic product search)")
    print(f"embedding model: {settings.EMBEDDING_MODEL} (downloaded on first use)")
    count = await build_product_index(sync_graph=False)
    if count == 0:
        print("product-service has no products yet: add products first, then re-run 'index'.")
    else:
        print(f"indexed {count} products -> {settings.FAISS_INDEX_PATH}")
    return count


async def step_graph():
    import pandas as pd
    from db.neo4j_client import neo4j_client
    from db.product_client import category_name, product_client
    banner("2/3 Neo4j recommendation graph")

    csv_path = Path(settings.BEHAVIOR_CSV_PATH)
    df = pd.read_csv(csv_path).dropna(subset=["user_id", "product_id"]) if csv_path.exists() else None
    await neo4j_client.connect()
    try:
        await neo4j_client.create_constraints()
        products = await product_client.get_all_products(fresh=True)
        if products:
            await neo4j_client.merge_products([
                {"id": p["id"], "name": p["name"], "category": category_name(p), "price": float(p.get("price", 0))}
                for p in products
            ])
        print(f"product nodes: {len(products)}")
        if df is None or df.empty:
            print("no behaviour log yet: the graph fills up as users browse and buy.")
            return 0
        await neo4j_client.clear_behaviour()  # rebuild, don't double-count
        await neo4j_client.record_events(df[["user_id", "product_id", "action"]].to_dict("records"))
        await neo4j_client.compute_similarity_edges()
        print(f"imported {len(df)} interactions from {df['user_id'].nunique()} users, computed SIMILAR_TO edges")
        return len(df)
    finally:
        await neo4j_client.close()


def step_lstm():
    banner("3/3 LSTM next-item model")
    csv_path = Path(settings.BEHAVIOR_CSV_PATH)
    events = sum(1 for _ in csv_path.open(encoding="utf-8")) - 1 if csv_path.exists() else 0
    if events < MIN_LSTM_EVENTS:
        print(f"only {events} behaviour events (need {MIN_LSTM_EVENTS}+): skipping, "
              "recommendations use the graph and semantic search meanwhile.")
        return None
    from models.train_lstm import train  # imported late: pulls in torch
    return train()


def reload_service():
    """Ask the running service to load the new index / model (admin JWT minted locally)."""
    import httpx
    from jose import jwt
    now = int(time.time())
    token = jwt.encode({"user_id": 0, "role": "admin", "iat": now, "exp": now + 60},
                       settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)
    try:
        resp = httpx.post("http://localhost:8007/admin/reload", headers={"Authorization": f"Bearer {token}"}, timeout=30)
        resp.raise_for_status()
        banner("service reloaded")
        for key, value in resp.json().items():
            print(f"  {key}: {value}")
    except Exception as e:
        print(f"\nCould not reach the running service ({e}); restart it to load the new artifacts.")


async def main(steps):
    started = time.time()
    if "index" in steps:
        await step_index()
    if "graph" in steps:
        await step_graph()
    if "lstm" in steps:
        await asyncio.to_thread(step_lstm)
    reload_service()
    print(f"\ndone in {time.time() - started:.0f}s")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    # (no `choices=`: with nargs="*" argparse < 3.12 rejects the empty default)
    parser.add_argument("steps", nargs="*", help="index, graph, lstm or all (default)")
    steps = set(parser.parse_args().steps) or {"all"}
    if steps - {"index", "graph", "lstm", "all"}:
        parser.error(f"unknown step(s): {', '.join(sorted(steps - {'index', 'graph', 'lstm', 'all'}))}")
    asyncio.run(main({"index", "graph", "lstm"} if "all" in steps else steps))
