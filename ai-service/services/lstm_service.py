import pandas as pd
from pathlib import Path
from models.lstm_inference import lstm_inference
from config import settings

async def get_lstm_scores(user_id: int) -> dict:
    if not lstm_inference.loaded:
        return {}

    history = _get_user_history(user_id)
    if not history:
        return {}

    scores = lstm_inference.predict(history, top_n=20)
    return _normalize(scores)

def _get_user_history(user_id: int) -> list:
    path = Path(settings.BEHAVIOR_CSV_PATH)
    if not path.exists():
        return []
    df = pd.read_csv(path)
    user_df = df[df["user_id"] == user_id].sort_values("timestamp")
    return user_df["product_id"].dropna().astype(int).tolist()[-10:]

def _normalize(scores: dict) -> dict:
    if not scores:
        return {}
    max_val = max(scores.values()) or 1
    return {k: v / max_val for k, v in scores.items()}
