const express = require("express");
const { protect } = require("../middleware/auth");
const {
  getPayment,
  listPayments,
  processPayment,
  handlePaymentWebhook,
  verifyPaymentStatus,
} = require("../controllers/paymentController");

const router = express.Router();

// Webhook / Callback endpoints for payment gateways (can be called without JWT session)
router.post("/webhook", handlePaymentWebhook);
router.post("/callback", handlePaymentWebhook);

// Protected endpoints requiring user authentication
router.use(protect);
router.get("/", listPayments);
router.post("/process", processPayment);
router.get("/verify/:orderId", verifyPaymentStatus);
router.get("/:id", getPayment);

module.exports = router;
