FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y build-essential && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

# Chia nhỏ quá trình cài đặt để tận dụng Cache và tránh Timeout mạng
RUN pip install --default-timeout=1000 --retries 10 fastapi==0.111.0 uvicorn[standard]==0.29.0 pydantic==2.7.0 pydantic-settings==2.2.1 httpx==0.27.0
RUN pip install --default-timeout=1000 --retries 10 torch==2.3.0 --index-url https://download.pytorch.org/whl/cpu
RUN pip install --default-timeout=1000 --retries 10 faiss-cpu==1.8.0
RUN pip install --default-timeout=1000 --retries 10 sentence-transformers==3.0.0 pandas==2.2.2 numpy==1.26.4 neo4j==5.20.0 openai==1.30.0 python-dotenv==1.0.1 python-jose[cryptography]==3.3.0
RUN pip install prometheus-client>=0.20.0 pika>=1.3.2


COPY . .

RUN mkdir -p data/product_embeddings data/checkpoints

EXPOSE 8007

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8007", "--reload"]
