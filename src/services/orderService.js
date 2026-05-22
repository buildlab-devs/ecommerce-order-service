const prisma = require('../lib/prisma');
const { serviceRequest } = require('../lib/serviceClient');
const { AppError } = require('../lib/errors');

const CART_SERVICE_URL = process.env.CART_SERVICE_URL || 'http://localhost:4004';
const PRODUCT_SERVICE_URL = process.env.PRODUCT_SERVICE_URL || 'http://localhost:4003';
const PAYMENT_SERVICE_URL = process.env.PAYMENT_SERVICE_URL || 'http://localhost:4006';

const CART_INTERNAL_KEY = process.env.CART_INTERNAL_KEY || 'change-me-cart-internal';
const PRODUCT_INTERNAL_KEY = process.env.PRODUCT_INTERNAL_KEY || 'change-me-product-internal';
const PAYMENT_INTERNAL_KEY = process.env.PAYMENT_INTERNAL_KEY || 'change-me-payment-internal';

async function addStatusHistory(orderId, status, note) {
  return prisma.orderStatusHistory.create({
    data: { orderId, status, note },
  });
}

async function checkout(userId, authHeader) {
  const cartResponse = await serviceRequest(`${CART_SERVICE_URL}/api/cart/internal/${userId}`, {
    headers: { 'X-Internal-Key': CART_INTERNAL_KEY },
  });

  const cart = cartResponse.data;
  if (!cart || !cart.items || cart.items.length === 0) {
    throw new AppError('Cart is empty', 400, 'EMPTY_CART');
  }

  const productIds = cart.items.map((item) => item.productId);
  const productsResponse = await serviceRequest(`${PRODUCT_SERVICE_URL}/api/products/internal/by-ids`, {
    method: 'POST',
    headers: { 'X-Internal-Key': PRODUCT_INTERNAL_KEY },
    body: { ids: productIds },
  });

  const products = productsResponse.data;
  const productMap = Object.fromEntries(products.map((p) => [p.id, p]));

  let total = 0;
  const orderItems = [];

  for (const item of cart.items) {
    const product = productMap[item.productId];
    if (!product) {
      throw new AppError(`Product ${item.productId} not found`, 400, 'PRODUCT_NOT_FOUND');
    }
    const price = Number(product.price);
    total += price * item.quantity;
    orderItems.push({
      productId: item.productId,
      variantId: item.variantId,
      name: product.name,
      price,
      quantity: item.quantity,
    });
  }

  const stockItems = cart.items.map((item) => ({
    productId: item.productId,
    quantity: item.quantity,
  }));

  let reserved = false;
  try {
    await serviceRequest(`${PRODUCT_SERVICE_URL}/api/products/internal/reserve`, {
      method: 'POST',
      headers: { 'X-Internal-Key': PRODUCT_INTERNAL_KEY },
      body: { items: stockItems },
    });
    reserved = true;

    const order = await prisma.order.create({
      data: {
        userId,
        total,
        status: 'PENDING',
        items: { create: orderItems },
        history: { create: { status: 'PENDING', note: 'Order created' } },
      },
      include: { items: true, history: true },
    });

    const paymentResponse = await serviceRequest(`${PAYMENT_SERVICE_URL}/api/payments/internal/create`, {
      method: 'POST',
      headers: { 'X-Internal-Key': PAYMENT_INTERNAL_KEY },
      body: { orderId: order.id, amount: total },
    });

    const { paymentId, clientSecret } = paymentResponse.data;

    const updatedOrder = await prisma.order.update({
      where: { id: order.id },
      data: { paymentId },
      include: { items: true, history: true },
    });

    return { order: updatedOrder, clientSecret, paymentId };
  } catch (err) {
    if (reserved) {
      await serviceRequest(`${PRODUCT_SERVICE_URL}/api/products/internal/release`, {
        method: 'POST',
        headers: { 'X-Internal-Key': PRODUCT_INTERNAL_KEY },
        body: { items: stockItems },
      }).catch(() => {});
    }
    throw err;
  }
}

async function updatePaymentStatus(orderId, { status, paymentId }) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });

  if (!order) {
    throw new AppError('Order not found', 404, 'NOT_FOUND');
  }

  if (order.status !== 'PENDING') {
    return order;
  }

  const stockItems = order.items.map((item) => ({
    productId: item.productId,
    quantity: item.quantity,
  }));

  if (status === 'PAID') {
    await serviceRequest(`${PRODUCT_SERVICE_URL}/api/products/internal/confirm`, {
      method: 'POST',
      headers: { 'X-Internal-Key': PRODUCT_INTERNAL_KEY },
      body: { items: stockItems },
    });

    await serviceRequest(`${CART_SERVICE_URL}/api/cart/internal/${order.userId}`, {
      method: 'DELETE',
      headers: { 'X-Internal-Key': CART_INTERNAL_KEY },
    }).catch(() => {});

    await prisma.order.update({
      where: { id: orderId },
      data: { status: 'PAID', paymentId },
    });
    await addStatusHistory(orderId, 'PAID', 'Payment confirmed');
  } else if (status === 'FAILED') {
    await serviceRequest(`${PRODUCT_SERVICE_URL}/api/products/internal/release`, {
      method: 'POST',
      headers: { 'X-Internal-Key': PRODUCT_INTERNAL_KEY },
      body: { items: stockItems },
    });

    await prisma.order.update({
      where: { id: orderId },
      data: { status: 'FAILED', paymentId },
    });
    await addStatusHistory(orderId, 'FAILED', 'Payment failed');
  }

  return prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true, history: true },
  });
}

async function listOrders(userId) {
  return prisma.order.findMany({
    where: { userId },
    include: { items: true },
    orderBy: { createdAt: 'desc' },
  });
}

async function getOrder(userId, orderId) {
  const order = await prisma.order.findFirst({
    where: { id: orderId, userId },
    include: { items: true, history: true },
  });

  if (!order) {
    throw new AppError('Order not found', 404, 'NOT_FOUND');
  }

  return order;
}

module.exports = {
  checkout,
  updatePaymentStatus,
  listOrders,
  getOrder,
};
