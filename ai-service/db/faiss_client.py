import faiss
import json
import numpy as np
from pathlib import Path
from config import settings

class FaissClient:
    def __init__(self):
        self.index = None
        self.metadata = {}
        self.id_map = []

    def load_index(self):
        index_path = Path(settings.FAISS_INDEX_PATH)
        meta_path = Path(settings.PRODUCT_METADATA_PATH)

        if index_path.exists():
            self.index = faiss.read_index(str(index_path))
            print(f"✅ FAISS index loaded: {self.index.ntotal} vectors")
        else:
            print("⚠️ FAISS index not found — run admin rebuild-index")

        if meta_path.exists():
            with open(meta_path) as f:
                raw = json.load(f)
            self.metadata = {int(k): v for k, v in raw.get("metadata", {}).items()}
            self.id_map = raw.get("id_map", [])

    def search(self, query_vector: np.ndarray, top_k: int = 5):
        if self.index is None or self.index.ntotal == 0:
            return []
        query = query_vector.reshape(1, -1).astype("float32")
        faiss.normalize_L2(query)
        distances, indices = self.index.search(query, top_k)
        results = []
        for dist, idx in zip(distances[0], indices[0]):
            if idx != -1 and idx < len(self.id_map):
                pid = self.id_map[idx]
                # IndexFlatIP returns Inner Product (cosine similarity since vectors are normalized L2)
                # Max similarity is 1.0, we just return dist directly.
                results.append({"product_id": pid, "score": float(dist)})
        return results

    def rebuild(self, embeddings: np.ndarray, product_ids: list, metadata: dict):
        if embeddings is None or embeddings.size == 0:
            print("No embeddings provided — skipping rebuild")
            return
        dim = embeddings.shape[1]
        self.index = faiss.IndexFlatIP(dim)
        embeddings = embeddings.astype("float32")
        faiss.normalize_L2(embeddings)
        self.index.add(embeddings)
        self.id_map = product_ids
        self.metadata = metadata

        Path(settings.FAISS_INDEX_PATH).parent.mkdir(parents=True, exist_ok=True)
        faiss.write_index(self.index, settings.FAISS_INDEX_PATH)

        with open(settings.PRODUCT_METADATA_PATH, "w") as f:
            json.dump({"id_map": product_ids, "metadata": {str(k): v for k, v in metadata.items()}}, f)
        print(f"✅ FAISS rebuilt: {len(product_ids)} products indexed")

faiss_client = FaissClient()
