import asyncio
import logging
from db.neo4j_client import neo4j_client
from services.behavior_service import get_user_history

logger = logging.getLogger(__name__)

async def get_graph_scores(user_id: int) -> dict:
    # Independent graph queries run concurrently.
    collab, similar = await asyncio.gather(
        neo4j_client.recommend_collaborative(user_id, limit=15),
        neo4j_client.recommend_similar(user_id, limit=15),
    )
    
    # Also fetch bought together for the last product they viewed
    bought_together = {}
    try:
        history = get_user_history(user_id, limit=10)
        if history:
            last_pid = history[-1]
            bought_together = await neo4j_client.recommend_bought_together(last_pid, limit=10)
    except Exception as e:
        logger.warning(f"Error fetching bought together in graph scores: {e}")

    merged = {}
    for pid, score in collab.items():
        merged[pid] = merged.get(pid, 0) + score * 0.4
    for pid, score in similar.items():
        merged[pid] = merged.get(pid, 0) + score * 0.3
    for pid, score in bought_together.items():
        merged[pid] = merged.get(pid, 0) + score * 0.8  # Heavy weight for direct bought_together

    return _normalize(merged)

def _normalize(scores: dict) -> dict:
    if not scores:
        return {}
    max_val = max(scores.values()) or 1
    return {k: v / max_val for k, v in scores.items()}
