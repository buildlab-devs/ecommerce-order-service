const prisma = require('./prisma');

const SERVICE = 'order-service';
const DB_TIMEOUT_MS = 2000;
const startedAt = Date.now();

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(`timed out after ${ms}ms`)), ms)),
  ]);
}

// GET /health — liveness + readiness in one response so a monitor (ServiceLens,
// a load balancer) can probe a single URL. 200 when the database answers,
// 503 when it doesn't, so an outage shows up as "down" instead of "healthy".
async function health(_req, res) {
  const started = Date.now();
  let database;
  try {
    await withTimeout(prisma.$queryRaw`SELECT 1`, DB_TIMEOUT_MS);
    database = { status: 'ok', latencyMs: Date.now() - started };
  } catch (err) {
    database = { status: 'error', error: err.message.split('\n').filter(Boolean).pop() };
  }

  const ok = database.status === 'ok';
  res.status(ok ? 200 : 503).json({
    success: ok,
    service: SERVICE,
    status: ok ? 'ok' : 'degraded',
    uptimeSec: Math.round((Date.now() - startedAt) / 1000),
    commit: process.env.VERCEL_GIT_COMMIT_SHA || null,
    checks: { database },
  });
}

module.exports = { health };
