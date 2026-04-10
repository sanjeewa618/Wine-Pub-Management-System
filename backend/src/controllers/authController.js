const { User } = require("../models/User");
const { Cart } = require("../models/Cart");
const { Notification } = require("../models/Notification");
const { asyncHandler } = require("../utils/asyncHandler");
const { ApiError } = require("../utils/ApiError");
const { generateToken } = require("../utils/token");
const crypto = require("crypto");

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
    twoFactorEnabled: Boolean(user.twoFactorEnabled),
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

const loginWithGoogle = asyncHandler(async (req, res) => {
  const accessToken = String(req.body?.accessToken || "").trim();
  if (!accessToken) {
    throw new ApiError(400, "Google access token is required");
  }

  const googleClientId = String(process.env.GOOGLE_CLIENT_ID || "").trim();
  if (!googleClientId) {
    throw new ApiError(500, "Google authentication is not configured");
  }

  const googleResponse = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!googleResponse.ok) {
    throw new ApiError(401, "Google authentication failed");
  }

  const googleProfile = await googleResponse.json();
  const email = String(googleProfile?.email || "").trim().toLowerCase();
  const name = String(googleProfile?.name || "").trim();
  const avatar = String(googleProfile?.picture || "").trim();
  const emailVerified = Boolean(googleProfile?.email_verified);

  if (!email || !emailVerified) {
    throw new ApiError(401, "Your Google account email is not verified");
  }

  let user = await User.findOne({ email });

  if (!user) {
    const generatedPassword = `${crypto.randomBytes(16).toString("hex")}Aa1!`;
    user = await User.create({
      name: name || email.split("@")[0],
      email,
      password: generatedPassword,
      role: "customer",
      status: "active",
      avatar,
    });

    await Cart.findOneAndUpdate(
      { userId: user._id },
      { userId: user._id, items: [] },
      { upsert: true, new: true }
    );
  }

  if (user.status === "blocked") {
    throw new ApiError(403, "Your account is blocked. Contact admin");
  }

  if (user.role === "seller" && user.status !== "active") {
    throw new ApiError(403, "Seller registration requested. Wait for admin approval");
  }

  if (!user.avatar && avatar) {
    user.avatar = avatar;
    await user.save();
  }

  const token = generateToken(user._id);
  res.json({ success: true, token, user: sanitizeUser(user) });
});

const getMe = asyncHandler(async (req, res) => {
  res.json({ success: true, user: sanitizeUser(req.user) });
});

const updateMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const nextName = String(req.body.name ?? user.name).trim();
  const nextEmail = String(req.body.email ?? user.email).trim().toLowerCase();
  const nextPhone = String(req.body.phone ?? user.phone ?? "").trim();
  const nextAvatar = String(req.body.avatar ?? user.avatar ?? "").trim();

  if (!nextName) {
    throw new ApiError(400, "Name is required");
  }

  if (String(user.role || "") === "seller") {
    if (!SELLER_NAME_REGEX.test(nextName)) {
      throw new ApiError(400, "Company/Restaurant/Supplier name should be 2-80 characters");
    }
  } else if (!NAME_REGEX.test(nextName)) {
    throw new ApiError(400, "Full name should contain only letters and spaces (2-60 characters)");
  }

  if (!EMAIL_REGEX.test(nextEmail)) {
    throw new ApiError(400, "Invalid email format");
  }

  if (nextPhone.length > 30) {
    throw new ApiError(400, "Phone number is too long");
  }

  if (nextEmail !== user.email) {
    const existing = await User.findOne({ email: nextEmail, _id: { $ne: user._id } });
    if (existing) {
      throw new ApiError(409, "Email already exists");
    }
  }

  user.name = nextName;
  user.email = nextEmail;
  user.phone = nextPhone;
  user.avatar = nextAvatar;
  await user.save();

  res.json({ success: true, user: sanitizeUser(user) });
});

const changePassword = asyncHandler(async (req, res) => {
  const currentPassword = String(req.body.currentPassword ?? "");
  const newPassword = String(req.body.newPassword ?? "");

  if (!currentPassword || !newPassword) {
    throw new ApiError(400, "Current password and new password are required");
  }

  if (!PASSWORD_REGEX.test(newPassword)) {
    throw new ApiError(400, "Password must be 8-16 characters and include uppercase, number, and special character");
  }

  const user = await User.findById(req.user._id).select("+password");
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const isMatch = await user.matchPassword(currentPassword);
  if (!isMatch) {
    throw new ApiError(401, "Current password is incorrect");
  }

  const isSamePassword = await user.matchPassword(newPassword);
  if (isSamePassword) {
    throw new ApiError(400, "New password must be different from current password");
  }

  user.password = newPassword;
  await user.save();

  res.json({ success: true, message: "Password updated successfully" });
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

const toggleTwoFactor = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  user.twoFactorEnabled = Boolean(req.body?.enabled);
  await user.save();

  res.json({
    success: true,
    message: user.twoFactorEnabled ? "Two-factor authentication enabled" : "Two-factor authentication disabled",
    user: sanitizeUser(user),
  });
});

module.exports = { register, login, loginWithGoogle, getMe, updateMe, changePassword, logout, refreshToken, toggleTwoFactor };
