const express = require("express");
const { protect } = require("../middleware/auth");
const { getPayment, listPayments, processPayment } = require("../controllers/paymentController");

const router = express.Router();

router.use(protect);
router.get("/", listPayments);
router.post("/process", processPayment);
router.get("/:id", getPayment);

module.exports = router;
