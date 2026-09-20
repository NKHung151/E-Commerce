import asyncio
import pandas as pd
from pathlib import Path
import sys

# Add ai-service to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from db.neo4j_client import neo4j_client
from db.product_client import product_client
from config import settings

async def sync_data():
    csv_path = Path(settings.BEHAVIOR_EXCEL_PATH)
    if not csv_path.exists():
        csv_path = Path(settings.BEHAVIOR_CSV_PATH)
        
    if not csv_path.exists():
        print(f"Error: File {csv_path} not found!")
        return

    print("Connecting to Neo4j...")
    passwords = [settings.NEO4J_PASSWORD, "neo4j"]
    uris = [settings.NEO4J_URI, settings.NEO4J_URI.replace("host.docker.internal", "localhost")]
    
    connected = False
    for uri in uris:
        for pwd in passwords:
            try:
                print(f"Trying connection to {uri} with password {'*' * len(pwd)}...")
                from neo4j import AsyncGraphDatabase
                neo4j_client._driver = AsyncGraphDatabase.driver(uri, auth=(settings.NEO4J_USER, pwd))
                await neo4j_client._driver.verify_connectivity()
                connected = True
                print(f"Successfully connected to {uri}")
                break
            except Exception as e:
                print(f"Connection failed for {uri}: {e}")
        if connected: break
        
    if not connected:
        print("Failed to connect to Neo4j after trying all combinations.")
        return
        
    print("Creating constraints...")
    await neo4j_client.create_constraints()

    print(f"Reading behavior data from {csv_path}...")
    df = pd.read_csv(csv_path)
    df = df.dropna(subset=['user_id', 'product_id'])
    
    # 1. Sync Products
    print("Syncing Products to Neo4j...")
    products = []
    try:
        products = await product_client.get_all_products()
    except Exception:
        print("Falling back to localhost for Product Service...")
        original_url = settings.PRODUCT_SERVICE_URL
        settings.PRODUCT_SERVICE_URL = settings.PRODUCT_SERVICE_URL.replace("product-service", "localhost")
        try:
            products = await product_client.get_all_products()
        except Exception as e:
            print(f"Could not fetch product metadata from any source: {e}")
            settings.PRODUCT_SERVICE_URL = original_url # Reset
            
    if products:
        for p in products:
            cat_name = p['category']['name'] if isinstance(p.get('category'), dict) else "General"
            await neo4j_client.merge_product(
                product_id=p['id'],
                name=p['name'],
                category=cat_name,
                price=float(p.get('price', 0))
            )
        print(f"Synced {len(products)} products with metadata")
    else:
        print("Syncing IDs only from behavior data...")
        unique_pids = df['product_id'].unique()
        for pid in unique_pids:
            if pd.isna(pid): continue
            await neo4j_client.merge_product(int(pid), f"Product {pid}", "General", 0.0)

    # 2. Sync Users
    print("Syncing Users to Neo4j...")
    unique_uids = df['user_id'].unique()
    for uid in unique_uids:
        if pd.isna(uid): continue
        await neo4j_client.merge_user(int(uid))
    print(f"Synced {len(unique_uids)} users")

    # 3. Sync Relationships in Batches
    print("Syncing Relationships (this may take a minute)...")
    total = len(df)
    for i, row in df.iterrows():
        try:
            await neo4j_client.record_action(
                user_id=int(row['user_id']),
                product_id=int(row['product_id']),
                action=row['action']
            )
        except:
            pass
        if (i + 1) % 1000 == 0:
            print(f"   Progress: {i+1}/{total} relationships synced")

    # 4. Compute Similarity Edges
    print("Computing product similarity based on co-purchases...")
    await neo4j_client.compute_similarity_edges()
    
    print("Neo4j Sync & Processing Complete!")
    await neo4j_client.close()

if __name__ == "__main__":
    asyncio.run(sync_data())
