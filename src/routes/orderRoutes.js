const express = require('express');
const { authenticate, requireInternalKey } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const orderController = require('../controllers/orderController');

const router = express.Router();

router.get('/health', orderController.health);
router.post('/checkout', authenticate, orderController.checkout);
router.get('/', authenticate, orderController.list);
router.get('/:id', authenticate, validate(orderController.orderIdSchema), orderController.getById);
router.patch(
  '/internal/:id/payment-status',
  requireInternalKey,
  validate(orderController.paymentStatusSchema),
  orderController.updatePaymentStatus
);

module.exports = router;
