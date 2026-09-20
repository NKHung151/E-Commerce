"""Similar Products Router - Returns products in the same category"""
from fastapi import APIRouter, Query
from schemas.recommend_schema import RecommendResponse
from db.product_client import product_client
from db.neo4j_client import neo4j_client

router = APIRouter()


@router.get("", response_model=RecommendResponse)
async def get_similar_products(
    product_id: int = Query(...),
    top_n: int = Query(10, ge=1, le=50)
):
    """
    Get similar products (same category) based on a given product.
    
    Args:
        product_id: The product ID to find similar products for
        top_n: Maximum number of products to return
    
    Returns:
        RecommendResponse with products in the same category
    """
    try:
        # Get the target product
        target_product = await product_client.get_product(product_id)
        if not target_product:
            return RecommendResponse(user_id=0, products=[], source="not_found")
        
        # Get its category
        category_id = None
        if isinstance(target_product.get("category"), dict):
            category_id = target_product["category"].get("id")
        
        if not category_id:
            return RecommendResponse(user_id=0, products=[], source="no_category")
        
        # Get all products in the same category
        all_products = await product_client.get_all_products()
        
        # Filter to same category, excluding the target product
        similar_products = [
            p for p in all_products
            if p["id"] != product_id and (
                (isinstance(p.get("category"), dict) and p["category"].get("id") == category_id) or
                (p.get("category") == target_product.get("category"))
            )
        ]
        
        # Sort by rating or relevance (if available), limit to top_n
        similar_products = similar_products[:top_n]
        
        # Convert to ProductSummary format
        from schemas.recommend_schema import ProductSummary
        
        products = []
        for p in similar_products:
            img = p.get("image_url") or p.get("image")
            if not img or img.strip() == "":
                img = f"https://placehold.co/600x400?text={p['name'].replace(' ', '+')}"
            
            products.append(ProductSummary(
                id=p["id"],
                name=p["name"],
                price=p.get("price", 0),
                image=img,
                category=p["category"]["name"] if isinstance(p.get("category"), dict) else "General",
                score=0.9  # High score for same-category products
            ))
        
        return RecommendResponse(user_id=0, products=products, source="similar")
    
    except Exception as e:
        print(f"Error getting similar products: {e}")
        return RecommendResponse(user_id=0, products=[], source="error")
