const express = require("express");
const { authorize, protect } = require("../middleware/auth");
const { createProduct, deleteProduct, getProduct, listProducts, updateProduct } = require("../controllers/productController");

const router = express.Router();

router.use((req, res, next) => {
  req.productType = req.baseUrl.includes("bites") ? "bite" : "wine";
  next();
});

router.get("/", listProducts);
router.get("/:id", getProduct);
router.post("/", protect, authorize("admin", "seller"), createProduct);
router.put("/:id", protect, authorize("admin", "seller"), updateProduct);
router.delete("/:id", protect, authorize("admin"), deleteProduct);

module.exports = router;
