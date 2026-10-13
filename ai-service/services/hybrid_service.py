import asyncio
import logging
from typing import Optional, List, Tuple
from services.lstm_service import get_lstm_scores
from services.graph_service import get_graph_scores
from services.rag_service import get_rag_scores
from services.behavior_service import get_user_history
from db.product_client import product_client, category_name
from schemas.recommend_schema import ProductSummary
from config import settings
from utils.scores import normalize

logger = logging.getLogger(__name__)

# Products the user interacted with most recently are not recommended back: semantic
# search for "like the last viewed product" would otherwise rank that product first.
RECENT_EXCLUDE = 20


async def get_recommendations(user_id: Optional[int] = None, top_n: int = 5, query: str = "") -> Tuple[List[ProductSummary], str]:
    # Content-based (RAG) dominates so recent views strongly steer results; LSTM and
    # graph share the rest. Weights are configurable (they used to be hard-coded here,
    # silently overriding the values in config).
    W1 = settings.LSTM_WEIGHT
    W2 = settings.GRAPH_WEIGHT
    W3 = settings.RAG_WEIGHT

    lstm_scores = {}
    graph_scores = {}
    rag_query = query
    recent = set()

    if user_id is not None:
        history = get_user_history(user_id)
        recent = set(history[-RECENT_EXCLUDE:])
        logger.debug(f"History length for user {user_id} = {len(history)}")

        if not rag_query and history:
            try:
                last_product = await product_client.get_product(history[-1])
                if last_product:
                    rag_query = last_product.get("name", "")
            except Exception as e:
                logger.warning(f"Error getting product {history[-1]}: {e}")

        # Independent sources run concurrently.
        lstm_scores, graph_scores = await asyncio.gather(
            get_lstm_scores(user_id), _safe_graph_scores(user_id))

    # Content similarity only makes sense for a real query (explicit context or the
    # last viewed product). The old placeholder query "popular products" still got
    # the 0.7 weight and drowned out the LSTM / graph signals.
    rag_scores = normalize(await get_rag_scores(rag_query, top_k=top_n + len(recent))) if rag_query else {}

    sources = [name for name, scores in (("lstm", lstm_scores), ("graph", graph_scores), ("rag", rag_scores)) if scores]

    if not sources:
        logger.info("No behaviour sources found. Falling back to latest products.")
        all_products = await product_client.get_all_products()
        products = sorted(all_products, key=lambda p: p.get("created_at", ""), reverse=True)
        return to_summaries(products[:top_n], score=0.5), "fallback"

    all_ids = (set(lstm_scores) | set(graph_scores) | set(rag_scores)) - recent
    final = {
        pid: W1 * lstm_scores.get(pid, 0) + W2 * graph_scores.get(pid, 0) + W3 * rag_scores.get(pid, 0)
        for pid in all_ids
    }

    top_ids = sorted(final, key=final.get, reverse=True)[:top_n]
    products = await product_client.get_products_by_ids(top_ids)

    # Secondary fallback if products are empty (e.g. deleted)
    if not products:
        all_products = await product_client.get_all_products()
        products = sorted(all_products, key=lambda p: p.get("views", 0), reverse=True)[:top_n]

    return to_summaries(products, score_map=final), "+".join(sources)


async def _safe_graph_scores(user_id: int) -> dict:
    try:
        return await get_graph_scores(user_id)
    except Exception as e:
        # Neo4j being down must not break recommendations.
        logger.warning(f"Graph scores unavailable: {e}")
        return {}


def to_summaries(products: list, score_map: dict = None, score: float = 1.0) -> list[ProductSummary]:
    result = []
    for p in products:
        img = p.get("image_url") or p.get("image")
        if not img or not img.strip():
            img = f"https://placehold.co/600x400?text={p['name'].replace(' ', '+')}"

        result.append(ProductSummary(
            id=p["id"],
            name=p["name"],
            price=p.get("price", 0),
            image=img,
            category=category_name(p),
            score=score_map.get(p["id"], score) if score_map else score
        ))
    return sorted(result, key=lambda x: x.score, reverse=True)
