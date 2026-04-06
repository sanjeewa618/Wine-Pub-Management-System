const express = require("express");
const { protect, authorize } = require("../middleware/auth");
const { approveSeller, blockUser, listUsers, updateUser } = require("../controllers/userController");

const router = express.Router();

router.use(protect, authorize("admin"));
router.get("/", listUsers);
router.put("/:id", updateUser);
router.put("/:id/approve-seller", approveSeller);
router.put("/:id/block", blockUser);

module.exports = router;
