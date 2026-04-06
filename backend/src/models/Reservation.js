const mongoose = require("mongoose");

const reservationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    customerName: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, default: "" },
    date: { type: String, required: true },
    time: { type: String, required: true },
    guestCount: { type: Number, required: true, min: 1 },
    specialRequests: { type: String, default: "" },
    status: { type: String, enum: ["pending", "confirmed", "completed", "cancelled"], default: "pending" },
    tableLabel: { type: String, default: "" },
    tableLabels: [{ type: String }],
    bookingReference: { type: String, required: true, unique: true },
  },
  { timestamps: true }
);

const Reservation = mongoose.model("Reservation", reservationSchema);

module.exports = { Reservation };
