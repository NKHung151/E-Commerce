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

# Fault injection is a testing tool: it is OFF unless explicitly enabled, otherwise any
# client could send X-Simulate-Error / X-Simulate-Delay through the gateway and take
# the service down (a huge delay blocks a worker for as long as the caller wants).
FAULT_INJECTION_ENABLED = os.getenv('FAULT_INJECTION_ENABLED', 'false').lower() in ('1', 'true', 'yes')
MAX_SIMULATED_DELAY = 10.0


def _parse_float(value):
    try:
        return float(value)
    except (TypeError, ValueError):
        return 0.0


class ObservabilityAndFaultMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # 1. Prometheus Metrics Endpoint
        if request.path in ('/metrics', '/metrics/'):
            return HttpResponse(generate_latest(), content_type=CONTENT_TYPE_LATEST)

        # 2. Fault Simulation (Delay & Error)
        if FAULT_INJECTION_ENABLED:
            fault_response = self._simulate_fault(request)
            if fault_response is not None:
                return fault_response

        # 3. Normal request flow tracking
        start_time = time.perf_counter()
        response = self.get_response(request)
        latency = time.perf_counter() - start_time

        # Use the route pattern (e.g. "api/v1/products/<pk>/") as label. Unmatched paths
        # are grouped, otherwise every random 404 URL creates a new time series.
        endpoint = request.resolver_match.route if request.resolver_match else 'unmatched'
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

    def _simulate_fault(self, request):
        if 'HTTP_X_SIMULATE_DELAY' in request.META:
            delay = _parse_float(request.META['HTTP_X_SIMULATE_DELAY'])
        else:
            delay = _parse_float(os.getenv('FAULT_SIMULATE_DELAY'))

        if delay > 0:
            time.sleep(min(delay, MAX_SIMULATED_DELAY))

        if 'HTTP_X_SIMULATE_ERROR' in request.META:
            should_fail = True
        else:
            rate = _parse_float(os.getenv('FAULT_SIMULATE_ERROR_RATE'))
            should_fail = rate > 0 and random.random() < rate

        if should_fail:
            return JsonResponse(
                {"error": "Simulated system fault (observability testing)", "code": 500},
                status=500
            )
        return None
