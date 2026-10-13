from config import settings
import logging

logger = logging.getLogger(__name__)
try:
    from sentence_transformers import SentenceTransformer
except Exception:
    SentenceTransformer = None
import numpy as np

class Embedder:
    def __init__(self):
        self.model = None
        if SentenceTransformer is not None:
            try:
                self.model = SentenceTransformer(settings.EMBEDDING_MODEL)
            except Exception as e:
                logger.warning(f"Embedder failed to load model: {e}")

    def encode(self, text: str) -> np.ndarray:
        if self.model is None:
            # fallback: simple char-based hash vector (not semantic)
            v = np.random.RandomState(abs(hash(text)) % (2**32)).randn(384)
            vec = v / np.linalg.norm(v)
            return vec.astype("float32")
        vec = self.model.encode(text, normalize_embeddings=True)
        return np.array(vec).astype("float32")

    def encode_batch(self, texts: list) -> np.ndarray:
        if self.model is None:
            return np.array([self.encode(t) for t in texts]).astype("float32")
        return self.model.encode(texts, normalize_embeddings=True).astype("float32")

embedder = Embedder()
