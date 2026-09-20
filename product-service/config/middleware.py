import time
import os
import random
from prometheus_client import Counter, Histogram, generate_latest, CONTENT_TYPE_LATEST
from django.http import HttpResponse, JsonResponse

# Define metrics
REQUEST_COUNT = Counter(
    'django_http_requests_total',
    'Total HTTP Requests',
    ['method', 'endpoint', 'status']
)
REQUEST_LATENCY = Histogram(
    'django_http_request_latency_seconds',
    'HTTP Request Latency',
    ['method', 'endpoint']
)

class ObservabilityAndFaultMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # 1. Prometheus Metrics Endpoint
        if request.path == '/metrics' or request.path == '/metrics/':
            return HttpResponse(generate_latest(), content_type=CONTENT_TYPE_LATEST)

        # 2. Fault Simulation (Delay & Error)
        delay = 0.0
        if 'HTTP_X_SIMULATE_DELAY' in request.META:
            try:
                delay = float(request.META['HTTP_X_SIMULATE_DELAY'])
            except ValueError:
                pass
        else:
            env_delay = os.getenv('FAULT_SIMULATE_DELAY')
            if env_delay:
                try:
                    delay = float(env_delay)
                except ValueError:
                    pass

        if delay > 0:
            time.sleep(delay)

        should_fail = False
        if 'HTTP_X_SIMULATE_ERROR' in request.META:
            should_fail = True
        else:
            error_rate = os.getenv('FAULT_SIMULATE_ERROR_RATE')
            if error_rate:
                try:
                    rate = float(error_rate)
                    if random.random() < rate:
                        should_fail = True
                except ValueError:
                    pass

        if should_fail:
            return JsonResponse(
                {"error": "Simulated system fault (observability testing)", "code": 500},
                status=500
            )

        # 3. Normal request flow tracking
        start_time = time.time()
        response = self.get_response(request)
        latency = time.time() - start_time

        # Track requests
        endpoint = request.resolver_match.route if request.resolver_match else request.path
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
