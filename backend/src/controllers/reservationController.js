const crypto = require("crypto");
const { Reservation } = require("../models/Reservation");
const { asyncHandler } = require("../utils/asyncHandler");
const { ApiError } = require("../utils/ApiError");

const createReservation = asyncHandler(async (req, res) => {
  const payload = {
    ...req.body,
    userId: req.user._id,
    bookingReference: `RSV-${crypto.randomBytes(3).toString("hex").toUpperCase()}`,
  };

  const reservation = await Reservation.create(payload);
  res.status(201).json({ success: true, reservation });
});

const listReservations = asyncHandler(async (req, res) => {
  const filter = req.user.role === "admin" ? {} : { userId: req.user._id };
  const reservations = await Reservation.find(filter).sort({ createdAt: -1 });
  res.json({ success: true, reservations });
});

const getReservation = asyncHandler(async (req, res) => {
  const reservation = await Reservation.findById(req.params.id);
  if (!reservation) throw new ApiError(404, "Reservation not found");
  res.json({ success: true, reservation });
});

const updateReservation = asyncHandler(async (req, res) => {
  const reservation = await Reservation.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!reservation) throw new ApiError(404, "Reservation not found");
  res.json({ success: true, reservation });
});

const deleteReservation = asyncHandler(async (req, res) => {
  const reservation = await Reservation.findByIdAndDelete(req.params.id);
  if (!reservation) throw new ApiError(404, "Reservation not found");
  res.json({ success: true, message: "Reservation removed" });
});

module.exports = { createReservation, listReservations, getReservation, updateReservation, deleteReservation };
