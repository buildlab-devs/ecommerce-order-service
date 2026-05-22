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

## Vercel Deployment

Set all peer service URLs and internal API keys. Set `ORDER_SERVICE_URL` and `ORDER_INTERNAL_KEY` in payment-service.
