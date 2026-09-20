# API Gateway (Nginx)

## Overview
The Nginx API Gateway is the single entry point for all client requests to the e-commerce microservices platform.
It routes requests to the appropriate backend service, enforces rate limiting, and provides health checks.

## Port
- **8080** (exposed to clients)

## Features
- **Reverse Proxy**: Routes `/api/v1/*` to downstream services
- **Rate Limiting**: 10 requests/second per IP with burst of 20
- **Header Forwarding**: Automatically forwards `Authorization` header for JWT validation
- **Error Handling**: Returns 502 errors with JSON format
- **Access Logging**: Comprehensive request logging to `/var/log/nginx/access.log`
- **Health Check**: `/health` endpoint returns `{"status":"ok"}`

## Routing Configuration

| Route | Service | Port |
|-------|---------|------|
| `/api/v1/auth/*` | user-service | 8001 |
| `/api/v1/users/*` | user-service | 8001 |
| `/api/v1/products/*` | product-service | 8002 |
| `/api/v1/categories/*` | product-service | 8002 |
| `/api/v1/cart/*` | cart-service | 8003 |
| `/api/v1/orders/*` | order-service | 8004 |
| `/api/v1/payment/*` | payment-service | 8005 |
| `/api/v1/shipping/*` | shipping-service | 8006 |

## Environment
The gateway runs via Docker Compose and depends on all 6 downstream services.

## Docker Compose
```yaml
gateway:
  build: ../gateway
  ports: ["8080:8080"]
  depends_on:
    - user-service
    - product-service
    - cart-service
    - order-service
    - payment-service
    - shipping-service
```

## Health Check
```bash
curl http://localhost:8080/health
# Response: {"status":"ok"}
```

## Rate Limiting
- **Limit**: 10 requests per second per IP
- **Burst**: 20 requests allowed
- **Zone**: api_limit
- **Applied to**: All `/api/` routes

## Error Responses
When a service is unavailable, the gateway returns:
```json
{
  "error": "Service unavailable",
  "code": 502
}
```

## Proxy Timeouts
- Connection timeout: 10s
- Send timeout: 30s
- Read timeout: 30s

## Build & Run
```bash
# Build the image
docker build -t ecom-gateway .

# Run with Docker Compose (recommended)
cd infrastructure
docker-compose up gateway
```
