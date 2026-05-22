const { z } = require('zod');
const orderService = require('../services/orderService');

const orderIdSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
});

const paymentStatusSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    status: z.enum(['PAID', 'FAILED']),
    paymentId: z.string().uuid(),
  }),
});

async function checkout(req, res, next) {
  try {
    const result = await orderService.checkout(req.user.id, req.headers.authorization);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

async function list(req, res, next) {
  try {
    const orders = await orderService.listOrders(req.user.id);
    res.json({ success: true, data: orders });
  } catch (err) {
    next(err);
  }
}

async function getById(req, res, next) {
  try {
    const order = await orderService.getOrder(req.user.id, req.validated.params.id);
    res.json({ success: true, data: order });
  } catch (err) {
    next(err);
  }
}

async function updatePaymentStatus(req, res, next) {
  try {
    const order = await orderService.updatePaymentStatus(
      req.validated.params.id,
      req.validated.body
    );
    res.json({ success: true, data: order });
  } catch (err) {
    next(err);
  }
}

async function health(_req, res) {
  res.json({ success: true, service: 'order-service', status: 'ok' });
}

module.exports = {
  orderIdSchema,
  paymentStatusSchema,
  checkout,
  list,
  getById,
  updatePaymentStatus,
  health,
};
