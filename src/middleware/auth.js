const jwt = require('jsonwebtoken');
const { AppError } = require('../lib/errors');

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'dev-access-secret';

function authenticate(req, _res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return next(new AppError('Unauthorized', 401, 'UNAUTHORIZED'));
  }

  try {
    const token = authHeader.slice(7);
    const payload = jwt.verify(token, ACCESS_SECRET);
    req.user = { id: payload.sub, email: payload.email };
    next();
  } catch {
    next(new AppError('Invalid or expired token', 401, 'INVALID_TOKEN'));
  }
}

function requireInternalKey(req, _res, next) {
  const key = req.headers['x-internal-key'];
  if (!process.env.INTERNAL_API_KEY || key !== process.env.INTERNAL_API_KEY) {
    return next(new AppError('Forbidden', 403, 'FORBIDDEN'));
  }
  next();
}

module.exports = { authenticate, requireInternalKey };
