const { publishToQueue } = require("./queuePublisher");

const SELLER_ORDER_QUEUE = "seller_order_notifications";

/**
 * Generate a deterministic or custom unique notification ID
 * representing this specific order notification event.
 */
function generateNotificationId(orderId, mode, customId = null) {
  if (customId && typeof customId === "string" && customId.trim()) {
    return customId.trim();
  }
  return `notif_order_${orderId}_${mode}`;
}

async function enqueueSellerOrderNotification({
  order,
  actor,
  payment = null,
  mode = "paid",
  notificationId = null,
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

  const effectiveNotificationId = generateNotificationId(
    String(order._id),
    mode,
    notificationId
  );

  const payload = {
    notificationId: effectiveNotificationId,
    orderId: String(order._id),
    actorId: String(actor._id),
    paymentId: payment?._id ? String(payment._id) : null,
    mode,
  };

  await publishToQueue(SELLER_ORDER_QUEUE, payload, {
    headers: {
      "x-notification-id": effectiveNotificationId,
    },
    metadata: {
      notificationId: effectiveNotificationId,
    },
  });

  console.log("Seller order notification job queued:", {
    notificationId: payload.notificationId,
    orderId: payload.orderId,
    mode: payload.mode,
  });

  return effectiveNotificationId;
}

module.exports = {
  enqueueSellerOrderNotification,
  generateNotificationId,
};
