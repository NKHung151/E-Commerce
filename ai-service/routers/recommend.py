import logging
from typing import Optional
from fastapi import APIRouter, Query
from schemas.recommend_schema import RecommendResponse
from services.hybrid_service import get_recommendations, to_summaries
from db.neo4j_client import neo4j_client
from db.product_client import product_client, category_id

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("", response_model=RecommendResponse)
async def recommend(
    user_id: Optional[int] = Query(None),
    top_n: int = Query(10, ge=1, le=50),
    context: str = Query("")
):
    products, source = await get_recommendations(user_id, top_n, context)
    return RecommendResponse(user_id=user_id, products=products, source=source)


async def _from_graph(scores: dict, source: str) -> Optional[RecommendResponse]:
    if not scores:
        return None
    products = await product_client.get_products_by_ids(list(scores.keys()))
    if not products:
        return None
    return RecommendResponse(user_id=None, products=to_summaries(products, score_map=scores), source=source)


async def _same_category(product_id: int, top_n: int, fill_with_any: bool):
    """Products sharing the target's category (fallback when the graph has no data).

    Returns (products, error_source); error_source is set when no answer is possible.
    """
    target = await product_client.get_product(product_id)
    if not target:
        return [], "not_found"

    target_category = category_id(target)
    if not target_category and not fill_with_any:
        return [], "no_category"

    others = [p for p in await product_client.get_all_products() if p["id"] != product_id]
    candidates = [p for p in others if target_category and category_id(p) == target_category]
    if fill_with_any and len(candidates) < top_n:
        candidates = others
    return candidates[:top_n], None


@router.get("/similar", response_model=RecommendResponse)
async def get_similar_products(
    product_id: int = Query(...),
    top_n: int = Query(10, ge=1, le=50)
):
    try:
        response = await _from_graph(
            await neo4j_client.recommend_similar_p2p(product_id, limit=top_n), "graph-similar")
        if response:
            return response
    except Exception as e:
        logger.warning(f"Error fetching similarity from Neo4j: {e}")

    try:
        products, error = await _same_category(product_id, top_n, fill_with_any=False)
        if error:
            return RecommendResponse(user_id=None, products=[], source=error)
        return RecommendResponse(user_id=None, products=to_summaries(products, score=0.9), source="category-fallback")
    except Exception as e:
        logger.error(f"Error in similar fallback: {e}")
        return RecommendResponse(user_id=None, products=[], source="error")


@router.get("/bought-together", response_model=RecommendResponse)
async def get_bought_together(
    product_id: int = Query(...),
    top_n: int = Query(5, ge=1, le=50)
):
    try:
        response = await _from_graph(
            await neo4j_client.recommend_bought_together(product_id, limit=top_n), "graph-bought-together")
        if response:
            return response
    except Exception as e:
        logger.warning(f"Error fetching bought together from Neo4j: {e}")

    try:
        products, error = await _same_category(product_id, top_n, fill_with_any=True)
        if error:
            return RecommendResponse(user_id=None, products=[], source=error)
        return RecommendResponse(user_id=None, products=to_summaries(products, score=0.5), source="category-fallback")
    except Exception as e:
        logger.error(f"Error in bought together fallback: {e}")
        return RecommendResponse(user_id=None, products=[], source="error")
