const express = require("express");
const { protect, authorize } = require("../middleware/auth");
const {
  listSellerProducts,
  getSellerProduct,
  createSellerProduct,
  updateSellerProduct,
  deleteSellerProduct,
} = require("../controllers/sellerProductController");

const router = express.Router();

router.use(protect, authorize("seller", "admin"));

router.get("/", listSellerProducts);
router.get("/:id", getSellerProduct);
router.post("/", createSellerProduct);
router.put("/:id", updateSellerProduct);
router.delete("/:id", deleteSellerProduct);

module.exports = router;