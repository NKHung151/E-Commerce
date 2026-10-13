"""FAISS index of product embeddings (exact cosine search with IndexFlatIP)."""
import json
import logging
from pathlib import Path

import faiss
import numpy as np

from config import settings

logger = logging.getLogger(__name__)


class FaissClient:
    def __init__(self):
        self.index = None
        self.id_map = []      # FAISS row -> product id
        self.model_name = None

    def load_index(self):
        index_path = Path(settings.FAISS_INDEX_PATH)
        meta_path = Path(settings.PRODUCT_METADATA_PATH)
        if not index_path.exists() or not meta_path.exists():
            self.index = None
            logger.warning("FAISS index not built yet — run scripts/bootstrap.py or POST /admin/rebuild-index")
            return

        raw = json.loads(meta_path.read_text(encoding="utf-8"))
        self.model_name = raw.get("model")
        if self.model_name != settings.EMBEDDING_MODEL:
            # Vectors from another model live in a different space: searching them is meaningless.
            self.index = None
            logger.warning(f"FAISS index was built with {self.model_name or 'an unknown model'}, "
                           f"current model is {settings.EMBEDDING_MODEL} — rebuild the index")
            return

        self.index = faiss.read_index(str(index_path))
        self.id_map = raw.get("id_map", [])
        logger.info(f"FAISS index loaded: {self.index.ntotal} products")

    def search(self, query_vector: np.ndarray, top_k: int = 5) -> list:
        if self.index is None or self.index.ntotal == 0:
            return []
        scores, rows = self.index.search(query_vector.reshape(1, -1).astype("float32"), top_k)
        # Vectors are L2-normalised, so the inner product is the cosine similarity.
        return [
            {"product_id": self.id_map[row], "score": float(score)}
            for score, row in zip(scores[0], rows[0])
            if 0 <= row < len(self.id_map)
        ]

    def rebuild(self, embeddings: np.ndarray, product_ids: list, model_name: str):
        if embeddings is None or embeddings.size == 0:
            logger.info("No products to index")
            return
        embeddings = np.ascontiguousarray(embeddings, dtype="float32")
        faiss.normalize_L2(embeddings)
        index = faiss.IndexFlatIP(embeddings.shape[1])
        index.add(embeddings)

        Path(settings.FAISS_INDEX_PATH).parent.mkdir(parents=True, exist_ok=True)
        faiss.write_index(index, settings.FAISS_INDEX_PATH)
        # The model name guards against searching an index built with another model.
        Path(settings.PRODUCT_METADATA_PATH).write_text(
            json.dumps({"model": model_name, "id_map": product_ids}), encoding="utf-8")

        self.index, self.id_map, self.model_name = index, product_ids, model_name
        logger.info(f"FAISS rebuilt: {len(product_ids)} products indexed")


faiss_client = FaissClient()
