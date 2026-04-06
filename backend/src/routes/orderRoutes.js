const express = require("express");
const { protect, authorize } = require("../middleware/auth");
const { createOrder, getOrder, listOrders, trackOrder, updateOrderStatus } = require("../controllers/orderController");

const router = express.Router();

router.use(protect);
router.post("/", createOrder);
router.get("/", listOrders);
router.get("/:id", getOrder);
router.get("/:id/tracks", trackOrder);
router.put("/:id/status", authorize("admin"), updateOrderStatus);

module.exports = router;
