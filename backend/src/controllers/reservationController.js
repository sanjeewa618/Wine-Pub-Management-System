const crypto = require("crypto");
const { Reservation } = require("../models/Reservation");
const { ReservationConfig } = require("../models/ReservationConfig");
const { asyncHandler } = require("../utils/asyncHandler");
const { ApiError } = require("../utils/ApiError");

const DEFAULT_TOTAL_TABLE_COUNT = 25;
const DEFAULT_TIME_SLOTS = ["18:00", "18:30", "19:00", "19:30", "20:00", "20:30", "21:00", "21:30", "22:00", "22:30"];

async function getReservationConfig() {
  let config = await ReservationConfig.findOne();
  if (!config) {
    config = await ReservationConfig.create({
      totalTables: DEFAULT_TOTAL_TABLE_COUNT,
      timeSlots: DEFAULT_TIME_SLOTS,
    });
  } else {
    const currentSlots = Array.isArray(config.timeSlots) ? config.timeSlots.map((slot) => String(slot).trim()) : [];
    const shouldNormalize =
      currentSlots.length !== DEFAULT_TIME_SLOTS.length ||
      DEFAULT_TIME_SLOTS.some((slot, index) => currentSlots[index] !== slot);

    if (shouldNormalize) {
      config.timeSlots = DEFAULT_TIME_SLOTS;
      await config.save();
    }
  }

  return config;
}

function normalizeTableLabel(tableLabel = "", maxTableCount = DEFAULT_TOTAL_TABLE_COUNT) {
  const normalized = String(tableLabel).trim().toUpperCase();
  const match = normalized.match(/^T?(\d{1,3})$/);
  if (!match) {
    return "";
  }

  const tableNumber = Number(match[1]);
  if (tableNumber < 1 || tableNumber > maxTableCount) {
    return "";
  }

  return `T${tableNumber}`;
}

function normalizeTableLabels(tableLabels = [], maxTableCount = DEFAULT_TOTAL_TABLE_COUNT) {
  return Array.from(
    new Set(
      (Array.isArray(tableLabels) ? tableLabels : [tableLabels])
        .map((value) => normalizeTableLabel(value, maxTableCount))
        .filter(Boolean)
    )
  );
}

async function getAvailableTableLabels(date, time, totalTableCount = DEFAULT_TOTAL_TABLE_COUNT) {
  const allTables = Array.from({ length: totalTableCount }, (_, index) => `T${index + 1}`);

  const reservations = await Reservation.find({
    date,
    time,
    status: { $ne: "cancelled" },
  })
    .select("tableLabel tableLabels")
    .lean();

  const reserved = new Set();
  reservations.forEach((item) => {
    normalizeTableLabels(item.tableLabels, totalTableCount).forEach((label) => reserved.add(label));

    const singleTable = normalizeTableLabel(item.tableLabel, totalTableCount);
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

  const config = await getReservationConfig();
  const totalTables = Number(config.totalTables || DEFAULT_TOTAL_TABLE_COUNT);

  const availableTables = await getAvailableTableLabels(String(date), String(time), totalTables);

  res.json({
    success: true,
    totalTables,
    availableTables,
    bookedCount: totalTables - availableTables.length,
  });
});

const createReservation = asyncHandler(async (req, res) => {
  const config = await getReservationConfig();
  const totalTables = Number(config.totalTables || DEFAULT_TOTAL_TABLE_COUNT);
  const requestedTableLabels = normalizeTableLabels(req.body.tableLabels ?? req.body.tableLabel, totalTables);
  if (!requestedTableLabels.length) {
    throw new ApiError(400, `Please select at least one valid table (T1 - T${totalTables})`);
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
      existingReservation.tableLabels?.length ? existingReservation.tableLabels : existingReservation.tableLabel,
      totalTables
    );
    const mergedLabels = Array.from(new Set([...existingLabels, ...requestedTableLabels]));

    if (mergedLabels.length > 2) {
      throw new ApiError(400, "Maximum 2 tables can be reserved in a single booking");
    }

    const availableTables = await getAvailableTableLabels(date, time, totalTables);
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

  const availableTables = await getAvailableTableLabels(date, time, totalTables);
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

const updateReservationStatusByAdmin = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const allowed = ["confirmed", "cancelled"];
  if (!allowed.includes(String(status || "").toLowerCase())) {
    throw new ApiError(400, "Status must be confirmed or cancelled");
  }

  const reservation = await Reservation.findByIdAndUpdate(
    req.params.id,
    { status: String(status).toLowerCase() },
    { new: true }
  );
  if (!reservation) throw new ApiError(404, "Reservation not found");

  res.json({ success: true, reservation, message: `Reservation ${reservation.status}` });
});

const getReservationAdminConfig = asyncHandler(async (req, res) => {
  const config = await getReservationConfig();
  const totalTables = Number(config.totalTables || DEFAULT_TOTAL_TABLE_COUNT);
  const tableNumbers = Array.from({ length: totalTables }, (_, index) => `T${index + 1}`);

  res.json({
    success: true,
    config: {
      totalTables,
      timeSlots: config.timeSlots || DEFAULT_TIME_SLOTS,
      tableNumbers,
    },
  });
});

const addReservationTableCount = asyncHandler(async (req, res) => {
  const { totalTables } = req.body;
  const parsed = Number(totalTables);
  if (!Number.isFinite(parsed) || parsed < 1 || parsed > 200) {
    throw new ApiError(400, "totalTables must be a number between 1 and 200");
  }

  const config = await getReservationConfig();
  config.totalTables = parsed;
  await config.save();

  res.json({ success: true, config, message: `Table count updated to ${parsed}` });
});

const addReservationTimeSlot = asyncHandler(async (req, res) => {
  const { timeSlot } = req.body;
  const normalized = String(timeSlot || "").trim();
  if (!normalized || !/^\d{2}:\d{2}$/.test(normalized)) {
    throw new ApiError(400, "timeSlot must be in HH:mm format");
  }

  const config = await getReservationConfig();
  const existing = new Set((config.timeSlots || []).map((slot) => String(slot).trim()));
  if (existing.has(normalized)) {
    throw new ApiError(409, "Time slot already exists");
  }

  config.timeSlots = [...existing, normalized].sort();
  await config.save();

  res.json({ success: true, config, message: `Time slot ${normalized} added` });
});

const deleteReservation = asyncHandler(async (req, res) => {
  const reservation = await Reservation.findByIdAndDelete(req.params.id);
  if (!reservation) throw new ApiError(404, "Reservation not found");
  res.json({ success: true, message: "Reservation removed" });
});

module.exports = {
  createReservation,
  listReservations,
  getReservation,
  updateReservation,
  deleteReservation,
  getAvailability,
  updateReservationStatusByAdmin,
  getReservationAdminConfig,
  addReservationTableCount,
  addReservationTimeSlot,
};
