# API Gateway (Nginx)

Single entry point for the API. The frontend container forwards `/api`, `/recommend`, `/chatbot` and
`/behavior` here (same origin for the browser); everything else is the React app.

## Port
- **8080**. The configuration (`nginx.conf`) is mounted read-only by docker compose, so
  `docker compose restart gateway` applies a change.

## Routing

| Path | Service |
|---|---|
| `/api/v1/auth/*`, `/api/v1/users/*`, `/api/v1/admin/users/*` | user-service :8001 |
| `/api/v1/products/*` | product-service :8002 |
| `/api/v1/staff/{products,books,electronics,fashion,home-living,sports-outdoors,beauty-health,toys-games,automotive,food-grocery,office-supplies}/*` | product-service :8002 (back office) |
| `/api/v1/categories/*` | catalog-service :8008 |
| `/api/v1/comments/*` | comment-rate-service :8009 |
| `/api/v1/cart/*` | cart-service :8003 |
| `/api/v1/orders/*`, `/api/v1/staff/orders/*` | order-service :8004 |
| `/api/v1/payment/*` | payment-service :8005 |
| `/api/v1/staff/shipping/*` | shipping-service :8006 |
| `/recommend*`, `/chatbot`, `/behavior/track` | ai-service :8007 |
| any other `/api/*` | `404 {"error": "Not found", "code": 404}` |
| everything else | frontend |

## Behaviour
- **Rate limiting:** 10 requests/second per client IP, burst 20, then `429`. Browser traffic arrives
  through the frontend container, so the client IP is taken from its `X-Real-IP` header (trusted only from
  the Docker networks `172.16.0.0/12`); otherwise all users would share one limit.
- **Headers:** `Host` is forwarded with its port (DRF builds correct pagination links), plus `X-Real-IP`,
  `X-Forwarded-For`, `X-Forwarded-Proto`; `Authorization` passes through untouched.
- **CORS:** allowed origin `http://localhost:3000` (only needed when the API is called cross-origin; the
  bundled frontend uses the same origin).
- **Timeouts:** 300 s (chatbot answers from the LLM can take a while on a cold start).
- **Logs:** access log to stdout with request time and upstream time (collected by Promtail into Loki).
