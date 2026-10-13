# Infrastructure

Everything needed to run the platform locally. The step-by-step setup (shared containers, databases,
`.env` files, AI bootstrap) is in the [main README](../README.md#5-cài-đặt-và-chạy).

## Files

| File | Purpose |
|---|---|
| `docker-compose.yml` | Compose project `ecommerce`: gateway, 9 services, frontend, Prometheus, Loki, Promtail, Grafana |
| `prometheus.yml` | Scrapes `/metrics` of the eight Django services and ai-service |
| `promtail-config.yml` | Ships every container's logs to Loki |
| `seed/generate_seed_data.py` | Regenerates the demo catalogue and reviews (see below) |

## What runs where

| Inside this compose project | Outside it (shared with other projects) |
|---|---|
| gateway, frontend, the 9 application services, Prometheus, Loki, Promtail, Grafana | `mysql-container`, `rabbitmq`, `neo4j`, `ollama` on the external Docker network `shared-infra`; PostgreSQL installed on the host, reached at `host.docker.internal:5432` |

Services join both the compose network and `shared-infra`. Each service reads its `../<service>/.env`;
compose only overrides `RABBITMQ_HOST`, the MySQL host of user-service and the Neo4j URI of ai-service.

```bash
docker compose up -d --build            # everything
docker compose up -d --build <service>  # one service after a code change
docker compose restart gateway          # after re-creating a service container (fresh IP)
docker compose logs -f <service>
docker compose down
```

## Demo data (`seed/`)

`generate_seed_data.py` turns the catalogue table it contains and the AI behaviour log
(`ai-service/data/user_behavior.csv`) into:

- `product-service/product_app/seed/products.json` - 300 products with ids 1-300 (the ids used in the log)
- `comment-rate-service/comment_app/seed/reviews.json` - 445 reviews by customers who bought the product

Product `views` are counted from the log and `rating` uses the same Bayesian average as
comment-rate-service. The files are loaded by data migrations (`catalog 0002`, `product 0002`,
`comment-rate 0002`, `user 0002`/`0003` for the admin, staff and 548 customer accounts) on a fresh database;
existing rows are never overwritten.

```bash
python infrastructure/seed/generate_seed_data.py   # after editing the catalogue table
```
