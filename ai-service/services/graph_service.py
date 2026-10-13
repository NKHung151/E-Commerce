import asyncio
import logging

from db.neo4j_client import neo4j_client
from services.behavior_service import get_user_history
from utils.scores import normalize

logger = logging.getLogger(__name__)

# How much each graph signal contributes to the graph score.
COLLABORATIVE_WEIGHT = 0.4   # users who bought what you interacted with also bought ...
SIMILAR_WEIGHT = 0.3         # SIMILAR_TO edges from products you interacted with
BOUGHT_TOGETHER_WEIGHT = 0.8  # co-purchased with the last product you looked at


async def _bought_together_with_last(user_id: int) -> dict:
    history = get_user_history(user_id, limit=1)
    return await neo4j_client.recommend_bought_together(history[-1], limit=10) if history else {}


async def get_graph_scores(user_id: int) -> dict:
    # The three graph queries are independent: run them concurrently.
    collab, similar, together = await asyncio.gather(
        neo4j_client.recommend_collaborative(user_id, limit=15),
        neo4j_client.recommend_similar(user_id, limit=15),
        _bought_together_with_last(user_id),
        return_exceptions=True,
    )
    merged = {}
    for scores, weight in ((collab, COLLABORATIVE_WEIGHT), (similar, SIMILAR_WEIGHT), (together, BOUGHT_TOGETHER_WEIGHT)):
        if isinstance(scores, Exception):
            logger.warning(f"Graph query failed: {scores}")
            continue
        for pid, score in scores.items():
            merged[pid] = merged.get(pid, 0) + score * weight
    return normalize(merged)
