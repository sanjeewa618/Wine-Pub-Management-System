const express = require("express");
const { protect } = require("../middleware/auth");
const { getPayment, processPayment } = require("../controllers/paymentController");

const router = express.Router();

router.use(protect);
router.post("/process", processPayment);
router.get("/:id", getPayment);

module.exports = router;
