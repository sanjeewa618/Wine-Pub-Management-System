const { publishToQueue } = require("./queuePublisher");

const SELLER_ORDER_QUEUE = "seller_order_notifications";

async function enqueueSellerOrderNotification({
  order,
  actor,
  payment = null,
  mode = "paid",
}) {
  if (!order?._id) {
    throw new Error("Order ID is required for seller notification");
  }

  if (!actor?._id) {
    throw new Error("Admin ID is required for seller notification");
  }

  if (!["paid", "cod"].includes(mode)) {
    throw new Error("Invalid seller notification mode");
  }

  const payload = {
    orderId: String(order._id),
    actorId: String(actor._id),
    paymentId: payment?._id ? String(payment._id) : null,
    mode,
  };

  await publishToQueue(SELLER_ORDER_QUEUE, payload);

  console.log("Seller order notification job queued:", {
    orderId: payload.orderId,
    mode: payload.mode,
  });
}

module.exports = {
  enqueueSellerOrderNotification,
};

