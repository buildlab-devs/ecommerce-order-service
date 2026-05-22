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

app.use('/api/orders', orderRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
