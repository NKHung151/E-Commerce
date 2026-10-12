from models.lstm_inference import lstm_inference
from services.behavior_service import get_user_history

async def get_lstm_scores(user_id: int) -> dict:
    if not lstm_inference.loaded:
        return {}

    history = get_user_history(user_id, limit=10)
    if not history:
        return {}

    scores = lstm_inference.predict(history, top_n=20)
    return _normalize(scores)

def _normalize(scores: dict) -> dict:
    if not scores:
        return {}
    max_val = max(scores.values()) or 1
    return {k: v / max_val for k, v in scores.items()}
