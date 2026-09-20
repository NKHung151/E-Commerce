from typing import Optional
from fastapi import APIRouter, Query
from schemas.recommend_schema import RecommendResponse, ProductSummary
from services.hybrid_service import get_recommendations

router = APIRouter()

@router.get("", response_model=RecommendResponse)
async def recommend(
    user_id: Optional[int] = Query(None),
    top_n: int = Query(10, ge=1, le=50),
    context: str = Query("")
):
    products, source = await get_recommendations(user_id, top_n, context)
    return RecommendResponse(user_id=user_id, products=products, source=source)


@router.get("/similar", response_model=RecommendResponse)
async def get_similar_products(
    product_id: int = Query(...),
    top_n: int = Query(10, ge=1, le=50)
):
    try:
        from db.neo4j_client import neo4j_client
        from db.product_client import product_client
        
        sim_scores = await neo4j_client.recommend_similar_p2p(product_id, limit=top_n)
        if sim_scores:
            products = await product_client.get_products_by_ids(list(sim_scores.keys()))
            if products:
                summaries = []
                for p in products:
                    img = p.get("image_url") or p.get("image") or f"https://placehold.co/600x400?text={p['name'].replace(' ', '+')}"
                    summaries.append(ProductSummary(
                        id=p["id"],
                        name=p["name"],
                        price=p.get("price", 0),
                        image=img,
                        category=p["category"]["name"] if isinstance(p.get("category"), dict) else "General",
                        score=sim_scores.get(p["id"], 1.0)
                    ))
                return RecommendResponse(user_id=None, products=summaries, source="graph-similar")
    except Exception as e:
        print(f"Error fetching similarity from Neo4j: {e}")

    try:
        from db.product_client import product_client
        target_product = await product_client.get_product(product_id)
        if not target_product:
            return RecommendResponse(user_id=None, products=[], source="not_found")
        
        category_id = None
        if isinstance(target_product.get("category"), dict):
            category_id = target_product["category"].get("id")
        
        if not category_id:
            return RecommendResponse(user_id=None, products=[], source="no_category")
            
        all_products = await product_client.get_all_products()
        similar_products = [
            p for p in all_products
            if p["id"] != product_id and (
                (isinstance(p.get("category"), dict) and p["category"].get("id") == category_id) or
                (p.get("category") == target_product.get("category"))
            )
        ]
        similar_products = similar_products[:top_n]
        
        summaries = []
        for p in similar_products:
            img = p.get("image_url") or p.get("image") or f"https://placehold.co/600x400?text={p['name'].replace(' ', '+')}"
            summaries.append(ProductSummary(
                id=p["id"],
                name=p["name"],
                price=p.get("price", 0),
                image=img,
                category=p["category"]["name"] if isinstance(p.get("category"), dict) else "General",
                score=0.9
            ))
        return RecommendResponse(user_id=None, products=summaries, source="category-fallback")
    except Exception as e:
        print(f"Error in similar fallback: {e}")
        return RecommendResponse(user_id=None, products=[], source="error")


@router.get("/bought-together", response_model=RecommendResponse)
async def get_bought_together(
    product_id: int = Query(...),
    top_n: int = Query(5, ge=1, le=50)
):
    try:
        from db.neo4j_client import neo4j_client
        from db.product_client import product_client
        
        bought_scores = await neo4j_client.recommend_bought_together(product_id, limit=top_n)
        if bought_scores:
            products = await product_client.get_products_by_ids(list(bought_scores.keys()))
            if products:
                summaries = []
                for p in products:
                    img = p.get("image_url") or p.get("image") or f"https://placehold.co/600x400?text={p['name'].replace(' ', '+')}"
                    summaries.append(ProductSummary(
                        id=p["id"],
                        name=p["name"],
                        price=p.get("price", 0),
                        image=img,
                        category=p["category"]["name"] if isinstance(p.get("category"), dict) else "General",
                        score=bought_scores.get(p["id"], 1.0)
                    ))
                return RecommendResponse(user_id=None, products=summaries, source="graph-bought-together")
    except Exception as e:
        print(f"Error fetching bought together from Neo4j: {e}")

    try:
        from db.product_client import product_client
        target_product = await product_client.get_product(product_id)
        if not target_product:
            return RecommendResponse(user_id=None, products=[], source="not_found")
        
        category_id = None
        if isinstance(target_product.get("category"), dict):
            category_id = target_product["category"].get("id")
        
        all_products = await product_client.get_all_products()
        candidates = [
            p for p in all_products
            if p["id"] != product_id and (
                (isinstance(p.get("category"), dict) and p["category"].get("id") == category_id) if category_id else True
            )
        ]
        
        if len(candidates) < top_n:
            candidates = [p for p in all_products if p["id"] != product_id]
            
        candidates = candidates[:top_n]
        
        summaries = []
        for p in candidates:
            img = p.get("image_url") or p.get("image") or f"https://placehold.co/600x400?text={p['name'].replace(' ', '+')}"
            summaries.append(ProductSummary(
                id=p["id"],
                name=p["name"],
                price=p.get("price", 0),
                image=img,
                category=p["category"]["name"] if isinstance(p.get("category"), dict) else "General",
                score=0.5
            ))
        return RecommendResponse(user_id=None, products=summaries, source="category-fallback")
    except Exception as e:
        print(f"Error in bought together fallback: {e}")
        return RecommendResponse(user_id=None, products=[], source="error")
