import csv
import datetime
import logging
import threading
from pathlib import Path

import pandas as pd
from config import settings

from db.neo4j_client import neo4j_client
from db.product_client import product_client, category_name

logger = logging.getLogger(__name__)

CSV_COLUMNS = ["user_id", "product_id", "action", "timestamp"]

_write_lock = threading.Lock()
# Parsed behaviour log, reloaded only when the file changes. Recommendation requests
# used to parse the whole CSV up to three times each (hybrid, lstm and graph services).
_history_cache = {"key": None, "by_user": {}}
_history_lock = threading.Lock()


def _action_value(action) -> str:
    # ActionType is a str Enum; str() of it would be written as "ActionType.view".
    return getattr(action, "value", action)


def track_behavior(user_id: int, product_id, action):
    path = Path(settings.BEHAVIOR_CSV_PATH)
    path.parent.mkdir(parents=True, exist_ok=True)
    row = [user_id, "" if product_id is None else product_id, _action_value(action),
           datetime.datetime.now().isoformat()]
    with _write_lock:
        new_file = not path.exists()
        with path.open("a", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            if new_file:
                writer.writerow(CSV_COLUMNS)
            writer.writerow(row)
    logger.debug(f"Tracked {row[2]} for user {user_id} on product {product_id}")


async def record_in_graph(user_id: int, product_id, action):
    """Record behaviour in Neo4j for real-time collaborative filtering & similarity."""
    if not (user_id and product_id):
        return
    try:
        await neo4j_client.merge_user(user_id)
        try:
            product = await product_client.get_product(product_id)
        except Exception as pe:
            logger.warning(f"Failed to get product details, merging minimal node: {pe}")
            product = None
        if product:
            await neo4j_client.merge_product(product["id"], product["name"], category_name(product), product["price"])
        else:
            await neo4j_client.merge_product(product_id, f"Product {product_id}", "General", 0.0)

        await neo4j_client.record_action(user_id, product_id, _action_value(action))
    except Exception as e:
        logger.warning(f"Failed to write event to Neo4j: {e}")


async def process_event(event):
    """Shared entry point for HTTP and RabbitMQ events: CSV log (LSTM training) + Neo4j graph."""
    track_behavior(event.user_id, event.product_id, event.action)
    await record_in_graph(event.user_id, event.product_id, event.action)


def _load_history_index(path: Path) -> dict:
    stat = path.stat()
    key = (stat.st_mtime_ns, stat.st_size)
    with _history_lock:
        if _history_cache["key"] == key:
            return _history_cache["by_user"]
        df = pd.read_csv(path, usecols=["user_id", "product_id", "timestamp"])
        df = df.dropna(subset=["product_id"]).sort_values("timestamp", kind="stable")
        df["user_id"] = df["user_id"].astype(str)
        by_user = {uid: g["product_id"].astype(int).tolist() for uid, g in df.groupby("user_id", sort=False)}
        _history_cache.update(key=key, by_user=by_user)
        return by_user


def get_user_history(user_id: int, limit: int = None) -> list:
    """Product ids the user interacted with, oldest first."""
    path = Path(settings.BEHAVIOR_CSV_PATH)
    if not path.exists():
        return []
    try:
        history = _load_history_index(path).get(str(user_id), [])
    except Exception as e:
        logger.warning(f"Error reading behaviour history: {e}")
        return []
    return history[-limit:] if limit else list(history)
