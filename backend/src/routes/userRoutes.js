const express = require("express");
const { protect, authorize } = require("../middleware/auth");
const { approveSeller, blockUser, deleteCustomer, listUsers, updateUser, listSellers, blockSeller, deleteSeller } = require("../controllers/userController");

const router = express.Router();

router.use(protect, authorize("admin"));

// More specific routes first
router.get("/sellers/list", listSellers);

// General routes
router.get("/", listUsers);
router.put("/:id", updateUser);
router.put("/:id/approve-seller", approveSeller);
router.put("/:id/block", blockUser);
router.put("/:id/block-seller", blockSeller);
router.delete("/:id", deleteCustomer);
router.delete("/:id/seller", deleteSeller);

module.exports = router;
