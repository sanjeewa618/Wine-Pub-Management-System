const crypto = require("crypto");
const { Reservation } = require("../models/Reservation");
const { asyncHandler } = require("../utils/asyncHandler");
const { ApiError } = require("../utils/ApiError");

const TOTAL_TABLE_COUNT = 25;

function normalizeTableLabel(tableLabel = "") {
  const normalized = String(tableLabel).trim().toUpperCase();
  const match = normalized.match(/^T?(\d{1,2})$/);
  if (!match) {
    return "";
  }

  const tableNumber = Number(match[1]);
  if (tableNumber < 1 || tableNumber > TOTAL_TABLE_COUNT) {
    return "";
  }

  return `T${tableNumber}`;
}

function normalizeTableLabels(tableLabels = []) {
  return Array.from(
    new Set(
      (Array.isArray(tableLabels) ? tableLabels : [tableLabels])
        .map((value) => normalizeTableLabel(value))
        .filter(Boolean)
    )
  );
}

async function getAvailableTableLabels(date, time) {
  const allTables = Array.from({ length: TOTAL_TABLE_COUNT }, (_, index) => `T${index + 1}`);

  const reservations = await Reservation.find({
    date,
    time,
    status: { $ne: "cancelled" },
  })
    .select("tableLabel tableLabels")
    .lean();

  const reserved = new Set();
  reservations.forEach((item) => {
    normalizeTableLabels(item.tableLabels).forEach((label) => reserved.add(label));

    const singleTable = normalizeTableLabel(item.tableLabel);
    if (singleTable) {
      reserved.add(singleTable);
    }
  });

  return allTables.filter((label) => !reserved.has(label));
}

const getAvailability = asyncHandler(async (req, res) => {
  const { date, time } = req.query;
  if (!date || !time) {
    throw new ApiError(400, "date and time are required");
  }

  const availableTables = await getAvailableTableLabels(String(date), String(time));

  res.json({
    success: true,
    totalTables: TOTAL_TABLE_COUNT,
    availableTables,
    bookedCount: TOTAL_TABLE_COUNT - availableTables.length,
  });
});

const createReservation = asyncHandler(async (req, res) => {
  const requestedTableLabels = normalizeTableLabels(req.body.tableLabels ?? req.body.tableLabel);
  if (!requestedTableLabels.length) {
    throw new ApiError(400, `Please select at least one valid table (T1 - T${TOTAL_TABLE_COUNT})`);
  }

  if (requestedTableLabels.length > 2) {
    throw new ApiError(400, "Maximum 2 tables can be reserved in a single booking");
  }

  const date = String(req.body.date);
  const time = String(req.body.time);
  const bookingEmail = String(req.body.email || "")
    .trim()
    .toLowerCase();

  if (!bookingEmail) {
    throw new ApiError(400, "Email is required");
  }

  const existingReservation = await Reservation.findOne({
    email: bookingEmail,
    date,
    time,
    status: { $ne: "cancelled" },
  }).sort({ createdAt: -1 });

  if (existingReservation) {
    const existingLabels = normalizeTableLabels(
      existingReservation.tableLabels?.length ? existingReservation.tableLabels : existingReservation.tableLabel
    );
    const mergedLabels = Array.from(new Set([...existingLabels, ...requestedTableLabels]));

    if (mergedLabels.length > 2) {
      throw new ApiError(400, "Maximum 2 tables can be reserved in a single booking");
    }

    const availableTables = await getAvailableTableLabels(date, time);
    const allowedForUpdate = new Set([...availableTables, ...existingLabels]);
    const unavailable = mergedLabels.filter((label) => !allowedForUpdate.has(label));
    if (unavailable.length) {
      throw new ApiError(409, `Selected table(s) already booked for this time slot: ${unavailable.join(", ")}`);
    }

    existingReservation.tableLabels = mergedLabels;
    existingReservation.tableLabel = mergedLabels[0];
    existingReservation.guestCount = Number(req.body.guestCount) || existingReservation.guestCount;
    existingReservation.customerName = req.body.customerName || existingReservation.customerName;
    existingReservation.email = bookingEmail;
    existingReservation.phone = req.body.phone || existingReservation.phone;
    existingReservation.specialRequests = req.body.specialRequests ?? existingReservation.specialRequests;

    const reservation = await existingReservation.save();
    res.status(200).json({ success: true, reservation, updatedExisting: true });
    return;
  }

  const availableTables = await getAvailableTableLabels(date, time);
  const unavailable = requestedTableLabels.filter((label) => !availableTables.includes(label));
  if (unavailable.length) {
    throw new ApiError(409, `Selected table(s) already booked for this time slot: ${unavailable.join(", ")}`);
  }

  const payload = {
    ...req.body,
    date,
    time,
    email: bookingEmail,
    tableLabel: requestedTableLabels[0],
    tableLabels: requestedTableLabels,
    userId: req.user._id,
    bookingReference: `RSV-${crypto.randomBytes(3).toString("hex").toUpperCase()}`,
  };

  const reservation = await Reservation.create(payload);
  res.status(201).json({ success: true, reservation });
});

const listReservations = asyncHandler(async (req, res) => {
  const filter =
    req.user.role === "admin"
      ? {}
      : {
          $or: [{ userId: req.user._id }, { email: String(req.user.email || "").trim().toLowerCase() }],
        };
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

module.exports = { createReservation, listReservations, getReservation, updateReservation, deleteReservation, getAvailability };
