# Frontend — PTIT Shop

React 18 + React Router 6 + Tailwind CSS. One bundle, two apps with separate sessions:

| URL | App | Who |
|---|---|---|
| `/` | **Shop** — catalogue, product page, cart, checkout, orders, AI chatbot & recommendations | guests, customers |
| `/staff`, `/admin` | **Back office** — dashboard, orders (status, payment confirmation, shipment), products, categories, users (admin only) | staff, admins |

The back office is code-split, so shoppers never download it.

## Run

```bash
npm install
npm start          # http://localhost:3000, API calls proxied to the gateway on :8080 ("proxy" in package.json)
npm run build
```

In Docker the bundle is served by nginx, which also proxies `/api`, `/recommend`, `/chatbot`
and `/behavior` to the `gateway` container (see `nginx.conf`). All requests are same-origin,
so no CORS setup or hard-coded host is needed. Set `REACT_APP_GATEWAY_URL` at build time only
if the gateway lives on another origin.

## Structure

```
src/
  App.js              picks Shop or Back office from the URL prefix
  config.js           gateway / API base URLs
  api/                every backend endpoint used by the UI (shop.js, backoffice.js)
  lib/                http client (JWT + refresh), auth context, tokens, formatting,
                      useAsync hook, constants mirroring backend state machines
  components/ui/      design system: Button, Input, Card, Badge, Pagination, Modal,
                      toasts, confirm dialog, product image / price / stars
  shop/               storefront (layout, cart context, chat widget, pages)
  backoffice/         staff & admin area (layout, pages)
```

`lib/constants.js` mirrors the order / shipment state machines and product categories
of the backend — keep them in sync when those change.
