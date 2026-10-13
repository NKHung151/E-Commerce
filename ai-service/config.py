from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Neo4j (recommendation graph)
    NEO4J_URI: str = "bolt://neo4j:7687"
    NEO4J_USER: str = "neo4j"
    NEO4J_PASSWORD: str = "12345678"

    # FAISS semantic index of products
    FAISS_INDEX_PATH: str = "data/product_embeddings/index.faiss"
    PRODUCT_METADATA_PATH: str = "data/product_metadata.json"

    # LSTM next-item model
    LSTM_CHECKPOINT_PATH: str = "data/checkpoints/lstm_checkpoint.pt"
    LSTM_SEQUENCE_LENGTH: int = 10

    # Behaviour log: appended on every event, used for history and LSTM training
    BEHAVIOR_CSV_PATH: str = "data/user_behavior.csv"

    # Other services
    PRODUCT_SERVICE_URL: str = "http://product-service:8002"
    ORDER_SERVICE_URL: str = "http://order-service:8004"

    # JWT (must match user-service)
    JWT_SECRET: str = "shared-jwt-secret"
    JWT_ALGORITHM: str = "HS256"

    # LLM for the chatbot: "openai" (needs OPENAI_API_KEY) or "ollama"
    LLM_PROVIDER: str = "ollama"
    OPENAI_API_KEY: str = ""
    OLLAMA_BASE_URL: str = "http://ollama:11434"
    OLLAMA_MODEL: str = "qwen2.5:3b"  # small, good Vietnamese, fits a 4 GB GPU

    # Sentence-transformers model for product / query embeddings
    EMBEDDING_MODEL: str = "sentence-transformers/all-MiniLM-L6-v2"

    # Hybrid recommendation weights (content-based dominates, see hybrid_service)
    LSTM_WEIGHT: float = 0.15
    GRAPH_WEIGHT: float = 0.15
    RAG_WEIGHT: float = 0.7

    class Config:
        env_file = ".env"
        # Older .env files may still set removed options (APP_HOST, DEBUG, ...).
        extra = "ignore"


settings = Settings()
