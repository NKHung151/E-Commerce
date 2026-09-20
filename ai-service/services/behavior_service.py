import pandas as pd
from pathlib import Path
from config import settings

from db.neo4j_client import neo4j_client
from db.product_client import product_client

def track_behavior(user_id: int, product_id: int, action: str):
    import datetime
    path = Path(settings.BEHAVIOR_CSV_PATH)
    path.parent.mkdir(parents=True, exist_ok=True)
    
    new_data = {
        "user_id": [user_id],
        "product_id": [product_id],
        "action": [action],
        "timestamp": [datetime.datetime.now().isoformat()]
    }
    df = pd.DataFrame(new_data)
    
    header = not path.exists()
    df.to_csv(path, mode='a', index=False, header=header)
    print(f"DEBUG: Tracked {action} for user {user_id} on product {product_id}")

async def process_event(event):
    """Wrapper for router"""
    # 1. Record in CSV behavior log for LSTM training
    track_behavior(event.user_id, event.product_id, event.action)
    
    # 2. Record in Neo4j Graph DB for real-time Collaborative Filtering & Similarity
    if event.user_id and event.product_id:
        try:
            # Merge user node
            await neo4j_client.merge_user(event.user_id)
            
            # Fetch product details and merge product node
            try:
                product = await product_client.get_product(event.product_id)
                if product:
                    cat_name = product["category"]["name"] if isinstance(product.get("category"), dict) else "General"
                    await neo4j_client.merge_product(product["id"], product["name"], cat_name, product["price"])
                else:
                    await neo4j_client.merge_product(event.product_id, f"Product {event.product_id}", "General", 0.0)
            except Exception as pe:
                print(f"DEBUG: Failed to get product details, merging minimal node: {pe}")
                await neo4j_client.merge_product(event.product_id, f"Product {event.product_id}", "General", 0.0)
            
            # Record behavior relationship
            await neo4j_client.record_action(event.user_id, event.product_id, event.action)
            print(f"DEBUG: Successfully recorded action '{event.action}' in Neo4j")
        except Exception as e:
            print(f"DEBUG: Failed to write event to Neo4j: {e}")


def get_user_history(user_id: int) -> list:
    path = Path(settings.BEHAVIOR_CSV_PATH)
    if not path.exists():
        return []
    try:
        df = pd.read_csv(path)
        # Robust filtering for V4
        user_df = df[df["user_id"].astype(str) == str(user_id)].sort_values("timestamp")
        return user_df["product_id"].dropna().astype(int).tolist()
    except Exception as e:
        print(f"DEBUG: Error reading history: {e}")
        return []
