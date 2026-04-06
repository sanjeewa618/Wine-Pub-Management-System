const express = require("express");
const { login, logout, refreshToken, register, getMe, updateMe, changePassword } = require("../controllers/authController");
const { protect } = require("../middleware/auth");

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.get("/me", protect, getMe);
router.put("/me", protect, updateMe);
router.put("/change-password", protect, changePassword);
router.post("/logout", protect, logout);
router.post("/refresh-token", refreshToken);

module.exports = router;
