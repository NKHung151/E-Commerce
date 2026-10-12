import asyncio
import sys
import os
from pathlib import Path

# Add current dir to path to import local modules
sys.path.append(os.getcwd())

from config import settings
from db.product_client import product_client, category_name
from db.faiss_client import faiss_client
from utils.embedder import embedder

async def reindex():
    print(f"🚀 Starting re-indexing process...")
    print(f"📦 Model: {settings.EMBEDDING_MODEL}")
    
    # 1. Fetch all products
    print("🔍 Fetching products from product-service...")
    try:
        products = await product_client.get_all_products()
        print(f"✅ Found {len(products)} products.")
    except Exception as e:
        print(f"❌ Failed to fetch products: {e}")
        return

    if not products:
        print("⚠️ No products found to index.")
        return

    # 2. Prepare data for embedding
    # We combine Name, Category and Description for better semantic search
    documents = []
    metadata = []
    
    print("🧠 Generating embeddings (this may take a moment)...")
    for p in products:
        cat_name = category_name(p)
        description = p.get('description', '')
        
        # Rich text for embedding
        text = f"Sản phẩm: {p['name']}. Danh mục: {cat_name}. Mô tả: {description}"
        documents.append(text)
        metadata.append({
            "product_id": p['id'],
            "name": p['name'],
            "category": cat_name
        })

    # 3. Create FAISS index
    try:
        # Generate vectors in batch for much better performance
        vectors = embedder.encode_batch(documents)
        
        # Prepare metadata for rebuild
        product_ids = [m['product_id'] for m in metadata]
        # Metadata dict for FaissClient (product_id -> info)
        meta_dict = {m['product_id']: m for m in metadata}
        
        # Reset and build index using the 'rebuild' method in FaissClient
        faiss_client.rebuild(vectors, product_ids, meta_dict)
        
        print(f"✨ Successfully indexed {len(products)} products!")
        print(f"💾 Index saved to: {settings.FAISS_INDEX_PATH}")
        print(f"📄 Metadata saved to: {settings.PRODUCT_METADATA_PATH}")
        
    except Exception as e:
        print(f"❌ Error during indexing: {e}")

if __name__ == "__main__":
    asyncio.run(reindex())
