import numpy as np
from db.faiss_client import faiss_client
from db.product_client import product_client, category_name
from utils.embedder import embedder
from config import settings

async def get_rag_scores(query: str, top_k: int = 10) -> dict:
    if faiss_client.index is None:
        return {}
    vector = np.array(embedder.encode(query))
    results = faiss_client.search(vector, top_k=top_k)
    return {r["product_id"]: r["score"] for r in results}

async def generate_rag_response(query: str, product_ids: list) -> str:
    products = await product_client.get_products_by_ids(product_ids[:5])
    if not products:
        return "I couldn't find specific products matching your query. Please try different keywords."

    product_context = "\n".join([
        f"- {p['name']} | Price: {float(p.get('price', 0)):,.0f} VND | Category: {category_name(p)}"
        for p in products
    ])

    prompt = f"""You are a helpful shopping assistant for an e-commerce store.
A customer asked: "{query}"

Here are relevant products from our store:
{product_context}

Write a friendly, concise response (2-3 sentences) recommending these products.
Answer in the same language the customer used. Be specific about product names and prices."""

    return await _call_llm(prompt)

async def _call_llm(prompt: str) -> str:
    if settings.LLM_PROVIDER == "openai":
        try:
            # openai>=1.0 removed openai.ChatCompletion; the old call always raised.
            from openai import AsyncOpenAI
            client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
            resp = await client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[{"role": "user", "content": prompt}],
                max_tokens=200
            )
            return resp.choices[0].message.content
        except Exception as e:
            print(f"⚠️ OpenAI call failed: {e}")
            return "Here are some products that might interest you."
    elif settings.LLM_PROVIDER == "ollama":
        import httpx
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.post(
                    f"{settings.OLLAMA_BASE_URL}/api/generate",
                    json={"model": settings.OLLAMA_MODEL, "prompt": prompt, "stream": False}
                )
                return resp.json().get("response", "")
        except Exception as e:
            print(f"⚠️ Ollama call failed: {e}")
            return "Here are some products that might interest you."
    return "Here are some products that might interest you."
