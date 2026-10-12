import asyncio
import logging
import time
import os
import random
from fastapi import FastAPI, Request
from fastapi.responses import Response, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from prometheus_client import Counter, Histogram, generate_latest, CONTENT_TYPE_LATEST

from routers import recommend, chatbot, behavior, admin
from db.neo4j_client import neo4j_client
from db.faiss_client import faiss_client
from models.lstm_inference import lstm_inference
from services.rabbitmq_consumer import start_consumer

REQUEST_COUNT = Counter(
    'fastapi_http_requests_total',
    'Total HTTP Requests',
    ['method', 'endpoint', 'status']
)
REQUEST_LATENCY = Histogram(
    'fastapi_http_request_latency_seconds',
    'HTTP Request Latency',
    ['method', 'endpoint']
)

logging.basicConfig(level=logging.INFO, format='[%(levelname)s] %(asctime)s %(name)s %(message)s')

# Fault injection is opt-in (see Django services' middleware for the rationale).
FAULT_INJECTION_ENABLED = os.getenv("FAULT_INJECTION_ENABLED", "false").lower() in ("1", "true", "yes")
MAX_SIMULATED_DELAY = 10.0


def _parse_float(value) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return 0.0

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    try:
        await neo4j_client.connect()
    except Exception as e:
        print(f"⚠️ Neo4j connect failed: {e}")
    try:
        faiss_client.load_index()
    except Exception as e:
        print(f"⚠️ FAISS load failed: {e}")
    try:
        lstm_inference.load()
    except Exception as e:
        print(f"⚠️ LSTM load failed: {e}")

    # Start RabbitMQ consumer
    try:
        start_consumer(asyncio.get_running_loop())
        print("✅ RabbitMQ behavior tracking consumer started")
    except Exception as e:
        print(f"⚠️ Failed to start RabbitMQ consumer: {e}")

    print("✅ AI-service startup complete")
    yield
    # Shutdown
    try:
        await neo4j_client.close()
    except Exception:
        pass
    print("🛑 AI-service shutting down")

app = FastAPI(title="AI Service — ecom-final", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def observability_and_fault_middleware(request: Request, call_next):
    # Skip metrics and health check for logging/faults
    if request.url.path in ["/metrics", "/health", "/health/"]:
        return await call_next(request)

    # 1. Fault Simulation (Delay & Error)
    if FAULT_INJECTION_ENABLED:
        if "x-simulate-delay" in request.headers:
            delay = _parse_float(request.headers["x-simulate-delay"])
        else:
            delay = _parse_float(os.getenv("FAULT_SIMULATE_DELAY"))
        if delay > 0:
            # asyncio.sleep: time.sleep here blocked the whole event loop, i.e. every request.
            await asyncio.sleep(min(delay, MAX_SIMULATED_DELAY))

        if "x-simulate-error" in request.headers:
            should_fail = True
        else:
            rate = _parse_float(os.getenv("FAULT_SIMULATE_ERROR_RATE"))
            should_fail = rate > 0 and random.random() < rate

        if should_fail:
            return JSONResponse(
                content={"error": "Simulated system fault (observability testing)", "code": 500},
                status_code=500
            )

    # 2. Track metrics
    start_time = time.perf_counter()
    response = await call_next(request)
    latency = time.perf_counter() - start_time

    # Label by route template, not raw path, to keep metric cardinality bounded.
    route = request.scope.get("route")
    endpoint = getattr(route, "path", None) or "unmatched"
    REQUEST_COUNT.labels(
        method=request.method,
        endpoint=endpoint,
        status=response.status_code
    ).inc()
    REQUEST_LATENCY.labels(
        method=request.method,
        endpoint=endpoint
    ).observe(latency)

    return response

app.include_router(recommend.router, prefix="/recommend", tags=["Recommendation"])
app.include_router(chatbot.router, prefix="/chatbot", tags=["Chatbot"])
app.include_router(behavior.router, prefix="/behavior", tags=["Behavior"])
app.include_router(admin.router, prefix="/admin", tags=["Admin"])


@app.get("/health")
async def health():
    return {"status": "ok", "service": "ai-service"}

@app.get("/metrics")
async def metrics():
    return Response(content=generate_latest(), media_type=CONTENT_TYPE_LATEST)

