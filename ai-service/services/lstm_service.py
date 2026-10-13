from models.lstm_inference import lstm_inference
from services.behavior_service import get_user_history
from utils.scores import normalize


async def get_lstm_scores(user_id: int) -> dict:
    """Next-item probabilities from the sequence model, given the user's recent history."""
    if not lstm_inference.loaded:
        return {}
    history = get_user_history(user_id, limit=10)
    if not history:
        return {}
    return normalize(lstm_inference.predict(history, top_n=20))
