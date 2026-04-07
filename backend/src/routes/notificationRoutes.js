const express = require("express");
const { protect, authorize } = require("../middleware/auth");
const { listSellerOrderAlerts } = require("../controllers/notificationController");

const router = express.Router();

router.use(protect);
router.get("/seller-orders", authorize("seller"), listSellerOrderAlerts);

module.exports = router;