import logging

import torch
from pathlib import Path
from models.lstm_model import LSTMRecommender
from config import settings

logger = logging.getLogger(__name__)

class LSTMInference:
    def __init__(self):
        self.model = None
        self.product2idx = {}
        self.idx2product = {}
        self.loaded = False

    def load(self):
        path = Path(settings.LSTM_CHECKPOINT_PATH)
        if not path.exists():
            logger.info("LSTM checkpoint not found — LSTM scores disabled")
            return
        ckpt = torch.load(path, map_location="cpu")
        self.product2idx = ckpt.get("product2idx", {})
        self.idx2product = {v: k for k, v in self.product2idx.items()}
        self.model = LSTMRecommender(num_products=ckpt.get("num_products", 0))
        self.model.load_state_dict(ckpt.get("model_state", {}))
        self.model.eval()
        self.loaded = True
        logger.info(f"LSTM loaded: {ckpt.get('num_products', 0)} products")

    def predict(self, product_history: list[int], top_n: int = 10) -> dict:
        if not self.loaded or not product_history:
            return {}
        seq_len = settings.LSTM_SEQUENCE_LENGTH
        encoded = [self.product2idx.get(p, 0) for p in product_history[-seq_len:]]
        if len(encoded) < seq_len:
            encoded = [0] * (seq_len - len(encoded)) + encoded

        x = torch.tensor([encoded], dtype=torch.long)
        with torch.no_grad():
            logits = self.model(x)[0]
            probs = torch.softmax(logits, dim=-1)

        # Over-fetch so that products already in the history can be skipped.
        seen = set(product_history)
        top_indices = torch.topk(probs, k=min(top_n + len(seen), len(probs))).indices.tolist()
        scores = {}
        for idx in top_indices:
            pid = self.idx2product.get(idx + 1)  # model output i <-> product index i + 1 (0 = padding)
            if pid is not None and pid not in seen:
                scores[pid] = float(probs[idx])
            if len(scores) >= top_n:
                break
        return scores

lstm_inference = LSTMInference()
