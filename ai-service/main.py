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
        start_consumer()
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
    delay = 0.0
    if "x-simulate-delay" in request.headers:
        try:
            delay = float(request.headers["x-simulate-delay"])
        except ValueError:
            pass
    else:
        env_delay = os.getenv("FAULT_SIMULATE_DELAY")
        if env_delay:
            try:
                delay = float(env_delay)
            except ValueError:
                pass

    if delay > 0:
        time.sleep(delay)

    should_fail = False
    if "x-simulate-error" in request.headers:
        should_fail = True
    else:
        error_rate = os.getenv("FAULT_SIMULATE_ERROR_RATE")
        if error_rate:
            try:
                rate = float(error_rate)
                if random.random() < rate:
                    should_fail = True
            except ValueError:
                pass

    if should_fail:
        return JSONResponse(
            content={"error": "Simulated system fault (observability testing)", "code": 500},
            status_code=500
        )

    # 2. Track metrics
    start_time = time.time()
    response = await call_next(request)
    latency = time.time() - start_time

    # Record metrics
    endpoint = request.url.path
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

