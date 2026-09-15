# ecommerce-order-service

Order microservice — checkout saga, order history, payment status updates.

## Setup

```bash
npm install
cp .env.example .env
npm run prisma:generate
npm run prisma:migrate
npm run dev
```

Runs on **port 4005**. Requires cart, product, and payment services running.

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check: runs `SELECT 1` against the database; 200 `ok`, or 503 `degraded` with the reason (also at `/api/orders/health`) |
| POST | `/api/orders/checkout` | Checkout the caller's cart: reserve stock → create payment → order `PENDING` (Bearer) |
| GET | `/api/orders` | The caller's orders (Bearer) |
| GET | `/api/orders/:id` | One order (Bearer) |
| PATCH | `/api/orders/internal/:id/payment-status` | Payment result from payment-service (internal, `X-Internal-Key`) |

## Configuration

Service-to-service keys must pair up, or checkout fails with 403:

| This service's variable | Must equal |
|---|---|
| `CART_INTERNAL_KEY` | cart-service `INTERNAL_API_KEY` |
| `PRODUCT_INTERNAL_KEY` | product-service `INTERNAL_API_KEY` |
| `PAYMENT_INTERNAL_KEY` | payment-service `INTERNAL_API_KEY` |
| `INTERNAL_API_KEY` | payment-service `ORDER_INTERNAL_KEY` |

`CART_SERVICE_URL`, `PRODUCT_SERVICE_URL` and `PAYMENT_SERVICE_URL` are base URLs (a trailing slash is stripped). `JWT_ACCESS_SECRET` must match auth-service.

## Vercel Deployment

Set all peer service URLs and internal API keys. Set `ORDER_SERVICE_URL` and `ORDER_INTERNAL_KEY` in payment-service.

## Monitoring

Point your monitor (e.g. ServiceLens: repo URL + deployed URL, health path `/health`) at `GET /health`. It returns 503 when the database is unreachable. Unexpected errors return a generic `500 INTERNAL_ERROR` to clients and are logged in full server-side.
