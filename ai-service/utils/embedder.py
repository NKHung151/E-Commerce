"""Sentence embeddings for semantic product search (FAISS).

Default model: intfloat/multilingual-e5-small (384-dim, multilingual). On 8 Vietnamese
shopping queries over the 300-product catalogue it reached 68% precision@5, versus 28%
for the English-only all-MiniLM-L6-v2 used before. E5 models expect "query: " /
"passage: " prefixes, which are added automatically.

If the model cannot be loaded, `available` is False and semantic search is disabled
(it used to fall back to random vectors seeded with Python's per-process hash(), which
silently returned meaningless results).
"""
import logging

import numpy as np

from config import settings

logger = logging.getLogger(__name__)


class Embedder:
    def __init__(self, model_name: str):
        self.model_name = model_name
        self._model = None
        self._failed = False
        is_e5 = "e5" in model_name.lower()
        self.query_prefix = "query: " if is_e5 else ""
        self.doc_prefix = "passage: " if is_e5 else ""

    @property
    def model(self):
        """Loaded on first use (the download is cached in HF_HOME, see Dockerfile)."""
        if self._model is None and not self._failed:
            try:
                from sentence_transformers import SentenceTransformer
                self._model = SentenceTransformer(self.model_name)
                logger.info(f"Embedding model loaded: {self.model_name}")
            except Exception as e:
                self._failed = True
                logger.error(f"Embedding model {self.model_name} unavailable, semantic search disabled: {e}")
        return self._model

    @property
    def available(self) -> bool:
        return self.model is not None

    def encode_query(self, text: str) -> np.ndarray:
        return self.model.encode(self.query_prefix + text, normalize_embeddings=True).astype("float32")

    def encode_documents(self, texts: list) -> np.ndarray:
        return self.model.encode(
            [self.doc_prefix + t for t in texts], normalize_embeddings=True, batch_size=64
        ).astype("float32")


embedder = Embedder(settings.EMBEDDING_MODEL)
