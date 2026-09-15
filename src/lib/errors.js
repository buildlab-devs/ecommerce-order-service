class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
}

// Only AppErrors (thrown on purpose, with a client-safe message) are echoed.
// Anything else — a Prisma error, a bug — gets a generic 500 so database
// details and file paths never reach the client; the full error goes to the
// server log instead, in every environment.
function errorHandler(err, req, res, _next) {
  if (err instanceof AppError) {
    if (err.statusCode >= 500) console.error(`[${req.method} ${req.originalUrl}]`, err);
    return res.status(err.statusCode).json({ success: false, error: { code: err.code, message: err.message } });
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ success: false, error: { code: 'INVALID_JSON', message: 'Request body is not valid JSON' } });
  }
  console.error(`[${req.method} ${req.originalUrl}]`, err);
  res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
}

function notFoundHandler(_req, res) {
  res.status(404).json({
    success: false,
    error: { code: 'NOT_FOUND', message: 'Route not found' },
  });
}

module.exports = { AppError, errorHandler, notFoundHandler };
