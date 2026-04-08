const express = require("express");
const { protect } = require("../middleware/auth");
const { addItem, checkout, clearCart, getCart, removeItem, updateItem } = require("../controllers/cartController");

const router = express.Router();

router.use(protect);
router.get("/", getCart);
router.post("/clear", clearCart);
router.post("/items", addItem);
router.put("/items/:productId", updateItem);
router.delete("/items/:productId", removeItem);
router.post("/checkout", checkout);

module.exports = router;
