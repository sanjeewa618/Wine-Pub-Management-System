const { User } = require("../models/User");
const { Cart } = require("../models/Cart");
const { Notification } = require("../models/Notification");
const { asyncHandler } = require("../utils/asyncHandler");
const { ApiError } = require("../utils/ApiError");
const { generateToken } = require("../utils/token");

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,16}$/;
const NAME_REGEX = /^[A-Za-z][A-Za-z\s]{1,59}$/;
const SELLER_NAME_REGEX = /^(?=.{2,80}$)[A-Za-z0-9][A-Za-z0-9\s&.,'/-]{1,79}$/;
const ALLOWED_ROLES = ["customer", "seller", "admin"];

function sanitizeUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    avatar: user.avatar,
    phone: user.phone,
    status: user.status,
  };
}

const register = asyncHandler(async (req, res) => {
  const { name, email, password, role = "customer" } = req.body;

  const normalizedName = String(name || "").trim();
  const normalizedEmail = String(email || "").trim().toLowerCase();
  const normalizedPassword = String(password || "");
  const normalizedRole = String(role || "customer");

  if (!normalizedName || !normalizedEmail || !normalizedPassword) {
    throw new ApiError(400, "Name, email, and password are required");
  }

  if (normalizedRole === "seller") {
    if (!SELLER_NAME_REGEX.test(normalizedName)) {
      throw new ApiError(400, "Company/Restaurant/Supplier name should be 2-80 characters");
    }
  } else if (!NAME_REGEX.test(normalizedName)) {
    throw new ApiError(400, "Full name should contain only letters and spaces (2-60 characters)");
  }

  if (!EMAIL_REGEX.test(normalizedEmail)) {
    throw new ApiError(400, "Invalid email format");
  }

  if (!PASSWORD_REGEX.test(normalizedPassword)) {
    throw new ApiError(400, "Password must be 8-16 characters and include uppercase, number, and special character");
  }

  if (!ALLOWED_ROLES.includes(normalizedRole)) {
    throw new ApiError(400, "Invalid role selected");
  }

  if (normalizedRole === "admin") {
    const adminCount = await User.countDocuments({ role: "admin" });
    if (adminCount > 0) {
      throw new ApiError(409, "Admin account already exists");
    }
  }

  const existing = await User.findOne({ email: normalizedEmail });
  if (existing) {
    throw new ApiError(409, "Email already exists");
  }

  const user = await User.create({
    name: normalizedName,
    email: normalizedEmail,
    password: normalizedPassword,
    role: normalizedRole,
    status: normalizedRole === "seller" ? "pending" : "active",
  });

  await Cart.findOneAndUpdate(
    { userId: user._id },
    { userId: user._id, items: [] },
    { upsert: true, new: true }
  );

  if (normalizedRole === "seller") {
    await Notification.create({
      type: "seller_registration_requested",
      title: "Seller Registration Requested",
      message: `${normalizedName} requested seller account approval`,
      targetRole: "admin",
      userId: user._id,
    });

    res.status(201).json({
      success: true,
      requiresApproval: true,
      message: "Seller registration requested. Wait for admin approval.",
      user: sanitizeUser(user),
    });
    return;
  }

  res.status(201).json({
    success: true,
    message: "Registration successful. Please login to continue.",
    user: sanitizeUser(user),
  });
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const normalizedEmail = String(email || "").trim().toLowerCase();
  const normalizedPassword = String(password || "");

  if (!normalizedEmail || !normalizedPassword) {
    throw new ApiError(400, "Email and password are required");
  }

  if (!EMAIL_REGEX.test(normalizedEmail)) {
    throw new ApiError(400, "Invalid email format");
  }

  const user = await User.findOne({ email: normalizedEmail }).select("+password");
  if (!user) {
    throw new ApiError(401, "Invalid credentials");
  }

  if (user.status === "blocked") {
    throw new ApiError(403, "Your account is blocked. Contact admin");
  }

  if (user.role === "seller" && user.status !== "active") {
    throw new ApiError(403, "Seller registration requested. Wait for admin approval");
  }

  const isMatch = await user.matchPassword(normalizedPassword);
  if (!isMatch) {
    throw new ApiError(401, "Invalid credentials");
  }

  const token = generateToken(user._id);
  res.json({ success: true, token, user: sanitizeUser(user) });
});

const getMe = asyncHandler(async (req, res) => {
  res.json({ success: true, user: sanitizeUser(req.user) });
});

const logout = asyncHandler(async (req, res) => {
  res.json({ success: true, message: "Logged out" });
});

const refreshToken = asyncHandler(async (req, res) => {
  const { token } = req.body;
  if (!token) {
    throw new ApiError(400, "Token is required");
  }

  res.json({ success: true, token });
});

module.exports = { register, login, getMe, logout, refreshToken };
