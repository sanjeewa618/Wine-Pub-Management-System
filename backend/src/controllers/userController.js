const { User } = require("../models/User");
const { Notification } = require("../models/Notification");
const { asyncHandler } = require("../utils/asyncHandler");
const { ApiError } = require("../utils/ApiError");
const { sendEmail } = require("../utils/emailService");

const listUsers = asyncHandler(async (req, res) => {
  const users = await User.find().select("-password").sort({ createdAt: -1 });
  res.json({ success: true, users });
});

const updateUser = asyncHandler(async (req, res) => {
  const user = await User.findByIdAndUpdate(req.params.id, req.body, { new: true }).select("-password");
  if (!user) throw new ApiError(404, "User not found");
  res.json({ success: true, user });
});

const blockUser = asyncHandler(async (req, res) => {
  const user = await User.findByIdAndUpdate(req.params.id, { status: "blocked" }, { new: true }).select("-password");
  if (!user) throw new ApiError(404, "User not found");
  res.json({ success: true, user });
});

const approveSeller = asyncHandler(async (req, res) => {
  const approverEmail = String(req.user?.email || "").trim().toLowerCase();
  if (!approverEmail) {
    throw new ApiError(400, "Admin email is required to approve sellers");
  }

  const seller = await User.findById(req.params.id);
  if (!seller) throw new ApiError(404, "User not found");

  if (seller.role !== "seller") {
    throw new ApiError(400, "Selected user is not a seller");
  }

  seller.status = "active";
  await seller.save();

  await Notification.create({
    type: "seller_registration_approved",
    title: "Seller Registration Approved",
    message: `Your seller request was approved by ${approverEmail}. You can now log in.`,
    targetRole: "seller",
    userId: seller._id,
  });

  await Notification.updateMany(
    { type: "seller_registration_requested", targetRole: "admin", userId: seller._id, isRead: false },
    { $set: { isRead: true } }
  );

  await sendEmail({
    to: seller.email,
    from: approverEmail,
    replyTo: approverEmail,
    subject: "Seller Request Approved - VinoVerse",
    text: `Hi ${seller.name}, your seller registration request has been approved by ${approverEmail}. You can now log in using your email and password.`,
    html: `<p>Hi ${seller.name},</p><p>Your seller registration request has been approved by <strong>${approverEmail}</strong>.</p><p>You can now log in using your email and password.</p>`,
  });

  res.json({ success: true, message: "Seller approved successfully", user: { id: seller._id, email: seller.email, role: seller.role, status: seller.status } });
});

module.exports = { listUsers, updateUser, blockUser, approveSeller };
