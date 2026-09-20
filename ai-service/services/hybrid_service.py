import pandas as pd
from pathlib import Path
from typing import Optional, List, Tuple
from services.lstm_service import get_lstm_scores
from services.graph_service import get_graph_scores
from services.rag_service import get_rag_scores
from db.product_client import product_client
from schemas.recommend_schema import ProductSummary
from config import settings

async def get_recommendations(user_id: Optional[int] = None, top_n: int = 5, query: str = "") -> Tuple[List[ProductSummary], str]:
    W1 = settings.LSTM_WEIGHT
    W2 = settings.GRAPH_WEIGHT
    W3 = settings.RAG_WEIGHT

    print(f"DEBUG: [V4-INLINE-FIX] Request user_id={user_id}")
    
    # Inline behavior retrieval
    history = []
    lstm_scores = {}
    graph_scores = {}

    if user_id is not None:
        csv_path = Path("data/user_behavior.csv")
        if csv_path.exists():
            try:
                df = pd.read_csv(csv_path)
                # Match user_id as string to avoid type issues
                user_df = df[df["user_id"].astype(str) == str(user_id)].sort_values("timestamp")
                history = user_df["product_id"].dropna().astype(int).tolist()
                print(f"DEBUG: CSV path found, history length for user {user_id} = {len(history)}")
            except Exception as e:
                print(f"DEBUG: CSV read error: {e}")
        else:
            print(f"DEBUG: CSV path NOT FOUND: {csv_path.absolute()}")

        rag_query = query
        if not rag_query and history:
            try:
                last_pid = history[-1]
                last_product = await product_client.get_product(last_pid)
                if last_product:
                    rag_query = last_product.get("name", "")
                    print(f"DEBUG: Using last product '{rag_query}' from history for RAG")
            except Exception as e:
                print(f"DEBUG: Error getting product {last_pid}: {e}")

        lstm_scores = await get_lstm_scores(user_id)
        graph_scores = await get_graph_scores(user_id)
    else:
        rag_query = query

    rag_scores = await get_rag_scores(rag_query or "popular products", top_k=top_n)
    if rag_scores:
        max_rag = max(rag_scores.values()) or 1
        rag_scores = {k: v / max_rag for k, v in rag_scores.items()}

    sources = []
    if lstm_scores: sources.append("lstm")
    if graph_scores: sources.append("graph")
    if rag_scores and rag_query: sources.append("rag")

    if not sources:
        print("DEBUG: No behavior sources found. Falling back to latest products.")
        all_products = await product_client.get_all_products()
        products = sorted(all_products, key=lambda p: p.get("created_at", ""), reverse=True)
        return _to_summaries(products[:top_n], score=0.5), "fallback"

    # Boost RAG weight to 0.7 since we want content-based (name matching) to strongly influence recent views
    # LSTM and Graph split the remaining 0.3
    W1 = 0.15
    W2 = 0.15
    W3 = 0.7

    all_ids = set(lstm_scores) | set(graph_scores) | set(rag_scores)
    final = {}
    for pid in all_ids:
        final[pid] = (
            W1 * lstm_scores.get(pid, 0) +
            W2 * graph_scores.get(pid, 0) +
            W3 * rag_scores.get(pid, 0)
        )

    top_ids = sorted(final, key=final.get, reverse=True)[:top_n]
    products = await product_client.get_products_by_ids(top_ids)

    # Secondary fallback if products are empty (e.g. deleted)
    if not products and sources:
        all_products = await product_client.get_all_products()
        products = sorted(all_products, key=lambda p: p.get("views", 0), reverse=True)[:top_n]

    summaries = _to_summaries(products, score_map=final)
    return summaries, "+".join(sources)

def _to_summaries(products: list, score_map: dict = None, score: float = 1.0) -> list[ProductSummary]:
    result = []
    for p in products:
        img = p.get("image_url") or p.get("image")
        if not img or img.strip() == "":
            img = f"https://placehold.co/600x400?text={p['name'].replace(' ', '+')}"

        result.append(ProductSummary(
            id=p["id"],
            name=p["name"],
            price=p["price"],
            image=img,
            category=p["category"]["name"] if isinstance(p.get("category"), dict) else "General",
            score=score_map.get(p["id"], score) if score_map else score
        ))
    return sorted(result, key=lambda x: x.score, reverse=True)
