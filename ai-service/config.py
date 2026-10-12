from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # Server
    APP_HOST: str = "0.0.0.0"
    APP_PORT: int = 8007
    DEBUG: bool = False

    # Neo4j (already running — use these exact credentials)
    NEO4J_URI: str = "bolt://my-neo4j:7687"
    NEO4J_USER: str = "neo4j"
    NEO4J_PASSWORD: str = "12345678"

    # FAISS
    FAISS_INDEX_PATH: str = "data/product_embeddings/index.faiss"
    PRODUCT_METADATA_PATH: str = "data/product_metadata.json"

    # LSTM
    LSTM_CHECKPOINT_PATH: str = "data/checkpoints/lstm_checkpoint.pt"
    LSTM_INPUT_DIM: int = 64
    LSTM_HIDDEN_DIM: int = 128
    LSTM_OUTPUT_DIM: int = 500
    LSTM_SEQUENCE_LENGTH: int = 10

    # Behavior data (Source of truth)
    BEHAVIOR_EXCEL_PATH: str = "data/user_behavior.xlsx"
    BEHAVIOR_CSV_PATH: str = "data/user_behavior.csv"

    # Service URLs
    PRODUCT_SERVICE_URL: str = "http://product-service:8002"
    ORDER_SERVICE_URL: str = "http://order-service:8004"
    USER_SERVICE_URL: str = "http://user-service:8001"
    PAYMENT_SERVICE_URL: str = "http://payment-service:8005"
    SHIPPING_SERVICE_URL: str = "http://shipping-service:8006"

    # JWT
    JWT_SECRET: str = "shared-jwt-secret"  # must match user-service
    JWT_ALGORITHM: str = "HS256"

    # LLM (choose one)
    LLM_PROVIDER: str = "openai"
    OPENAI_API_KEY: str = ""
    OLLAMA_BASE_URL: str = "http://ollama:11434"
    OLLAMA_MODEL: str = "phi3:mini"

    # Embedding model (Reverted to light model for stability)
    EMBEDDING_MODEL: str = "sentence-transformers/all-MiniLM-L6-v2"

    # Hybrid weights
    LSTM_WEIGHT: float = 0.15
    GRAPH_WEIGHT: float = 0.15
    RAG_WEIGHT: float = 0.7

    class Config:
        env_file = ".env"

settings = Settings()
