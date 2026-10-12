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
  index.js · App.js        entry; App picks Shop or Back office from the URL prefix
  config.js                gateway / API base URLs
  styles/index.css         Tailwind layers + a few shared component classes

  shared/                  app-agnostic, used by both apps
    api/client.js          axios factory (JWT + single-flight refresh), pagination & error helpers
    api/tokens.js          per-app token storage, JWT decoding
    auth/AuthProvider.js   session context (useAuth)
    hooks/                 useAsync, useDebounced, useQueryParams (URL-driven filters)
    utils/constants.js     mirrors backend state machines, payment methods, product types
    utils/format.js        currency / dates / address packing / item counts
    utils/products.js      attach product details to cart & order lines
    ui/                    design system (import from 'shared/ui'): Button, form controls,
                           Card/PageHeader/Avatar, Badge/StatusBadge/Alert, loading & empty
                           states, Pagination, Modal/toast/confirm, product image/price/stars/
                           quantity stepper, Logo, AuthShell

  shop/                    storefront
    api.js · ShopApp.js · categoryMeta.js
    context/CartContext.js
    layout/                Header, Footer, ShopLayout
    components/            ProductCard, ProductGrid, CatalogFilters, Reviews, OrderSummary,
                           OrderTimeline, ChatWidget
    pages/                 Home, Catalog, Product, Cart, Checkout, Orders, Order, Profile, Auth

  backoffice/              staff & admin area
    api.js · BackofficeApp.js
    layout/                Layout, Sidebar
    components/            StatCard, TransitionButtons, ProductCell, UserFormModal
    pages/                 Dashboard, Orders, Order, Products, ProductForm, Categories, Users, Login
```

Rules of thumb: `shared/` never imports from `shop/` or `backoffice/`; each app talks to the
backend only through its own `api.js`; anything used by two pages of one app goes in that
app's `components/`, anything used by both apps goes in `shared/`.

`shared/utils/constants.js` mirrors the order / shipment state machines and product categories
of the backend — keep them in sync when those change.
