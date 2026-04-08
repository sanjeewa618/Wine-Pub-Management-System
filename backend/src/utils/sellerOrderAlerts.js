const { Product } = require("../models/Product");
const { SellerProduct } = require("../models/SellerProduct");
const { User } = require("../models/User");
const { Notification } = require("../models/Notification");
const { sendEmail } = require("./emailService");

async function notifySellersForOrder({ order, actor, payment = null, mode = "paid" }) {
  if (!order || !Array.isArray(order.items) || order.items.length === 0) {
    return;
  }

  const sellerItemsMap = new Map();
  const unresolvedProductIds = [];

  (order.items || []).forEach((item) => {
    if (!item?.sellerId && item?.productId) {
      unresolvedProductIds.push(String(item.productId));
    }
  });

  const [catalogProducts, sellerProducts] = await Promise.all([
    Product.find({ _id: { $in: unresolvedProductIds } }).select("_id sellerId"),
    SellerProduct.find({ _id: { $in: unresolvedProductIds } }).select("_id sellerId"),
  ]);

  const fallbackSellerByProductId = new Map(
    [...catalogProducts, ...sellerProducts].map((product) => [String(product._id), String(product.sellerId || "")])
  );

  (order.items || []).forEach((item) => {
    const sellerId = String(item?.sellerId || fallbackSellerByProductId.get(String(item?.productId || "")) || "");
    if (!sellerId) {
      return;
    }

    if (!sellerItemsMap.has(sellerId)) {
      sellerItemsMap.set(sellerId, []);
    }

    sellerItemsMap.get(sellerId).push({
      productId: String(item?.productId || ""),
      name: item?.name || "Item",
      quantity: Number(item?.quantity || 0),
      price: Number(item?.price || 0),
      brand: item?.brand || "",
      rating: Number(item?.rating || 0),
      selectedSize: item?.selectedSize || "",
    });
  });

  const sellerIds = Array.from(sellerItemsMap.keys());
  if (sellerIds.length === 0) {
    return;
  }

  const sellers = await User.find({ _id: { $in: sellerIds }, role: "seller" }).select("name email");
  const sellerById = new Map(sellers.map((seller) => [String(seller._id), seller]));
  const actorEmail = String(actor?.email || "").trim().toLowerCase();
  const paymentMethod = payment?.paymentMethod || order.paymentMethod || "other";
  const orderStatus = String(order?.status || "pending");
  const paymentStatus = mode === "paid" ? "paid" : String(order?.paymentStatus || "unpaid");
  const paymentReference = payment?.reference || null;
  const receiptId = payment?._id ? String(payment._id) : null;

  await Promise.all(
    sellerIds.map(async (sellerId) => {
      const seller = sellerById.get(sellerId);
      const itemList = sellerItemsMap.get(sellerId) || [];
      const title =
        mode === "paid"
          ? `New paid order from admin (${actor?.email || "admin"})`
          : `New COD order from admin (${actor?.email || "admin"})`;
      const message =
        mode === "paid"
          ? `Payment completed · ${itemList.length} item(s) awaiting confirmation`
          : `Cash on delivery order · ${itemList.length} item(s) awaiting confirmation`;

      await Notification.findOneAndUpdate(
        {
          type: "seller_order_alert",
          targetRole: "seller",
          userId: sellerId,
          "metadata.orderId": String(order._id),
        },
        {
          $set: {
            type: "seller_order_alert",
            title,
            message,
            targetRole: "seller",
            userId: sellerId,
            isRead: false,
            metadata: {
              orderId: String(order._id),
              trackingNumber: order.trackingNumber,
              paymentMethod,
              paymentStatus,
              orderStatus,
              adminName: actor?.name || "Admin",
              adminEmail: actor?.email || "",
              orderType: order.orderType,
              items: itemList,
              total: order.total,
              subtotal: order.subtotal,
              tax: order.tax,
              deliveryCharge: order.deliveryCharge,
              paymentReference,
              receiptId,
            },
          },
        },
        { upsert: true, setDefaultsOnInsert: true }
      );

      if (seller?.email) {
        const listText = itemList
          .map((entry) => {
            const brandText = entry.brand ? ` · Brand: ${entry.brand}` : "";
            const sizeText = entry.selectedSize ? ` · Size: ${entry.selectedSize}` : "";
            return `- ${entry.name} x${entry.quantity}${brandText}${sizeText} (LKR ${Number(entry.price || 0).toFixed(2)})`;
          })
          .join("\n");

        const statusLine = mode === "paid" ? "Payment completed" : "Payment pending (COD)";

        await sendEmail({
          to: seller.email,
          from: actorEmail || undefined,
          replyTo: actorEmail || undefined,
          subject: `${mode === "paid" ? "Paid" : "COD"} Seller Order Alert - ${order.trackingNumber}`,
          text:
            `Hello ${seller.name || "Seller"},\n\n` +
            `A seller order has been assigned to you by admin ${actor?.name || "Admin"} (${actorEmail || "N/A"}).\n` +
            `Order Status: ${orderStatus}\n` +
            `${statusLine}\n` +
            `Payment Method: ${paymentMethod}\n` +
            `Payment Reference: ${paymentReference || "N/A"}\n` +
            `Order Type: ${order.orderType}\n` +
            `Tracking Number: ${order.trackingNumber}\n\n` +
            `Assigned Items:\n${listText}\n\n` +
            `Please confirm this order from your seller orders page.`,
        });
      }
    })
  );
}

module.exports = { notifySellersForOrder };