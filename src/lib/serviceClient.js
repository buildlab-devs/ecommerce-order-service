const { AppError } = require('./errors');

async function serviceRequest(url, options = {}) {
  const { method = 'GET', body, headers = {}, timeout = 10000 } = options;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new AppError(
        data.error?.message || `Service request failed: ${response.status}`,
        response.status,
        data.error?.code || 'SERVICE_ERROR'
      );
    }

    return data;
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new AppError('Service request timed out', 504, 'TIMEOUT');
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { serviceRequest };
