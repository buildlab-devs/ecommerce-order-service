require('dotenv').config();
const express = require('express');
const cors = require('cors');
const orderRoutes = require('./routes/orderRoutes');
const { errorHandler, notFoundHandler } = require('./lib/errors');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (_req, res) => {
  res.json({ success: true, service: 'order-service' });
});

// Provide a reliable health endpoint for monitoring and legacy callers.
app.get(['/health', '/api/orders/health'], (req, res) => {
  res.json({ success: true, service: 'order-service', status: 'ok' });
});

app.use('/api/orders', orderRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
