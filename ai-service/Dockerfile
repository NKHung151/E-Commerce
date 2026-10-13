FROM python:3.11-slim

WORKDIR /app
# Hugging Face models are cached in the mounted data/ volume, so the embedding
# model is downloaded once instead of on every container re-creation.
ENV PYTHONUNBUFFERED=1 HF_HOME=/app/data/hf-cache

# CPU-only PyTorch first (the default wheel bundles ~2 GB of CUDA libraries),
# in its own layer so code changes don't reinstall it.
RUN pip install --no-cache-dir --default-timeout=1000 --retries 10     torch==2.3.0 --index-url https://download.pytorch.org/whl/cpu

COPY requirements.txt .
RUN pip install --no-cache-dir --default-timeout=1000 --retries 10 -r requirements.txt

COPY . .

EXPOSE 8007
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8007"]
