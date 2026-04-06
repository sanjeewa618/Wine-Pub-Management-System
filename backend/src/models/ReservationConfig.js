const mongoose = require("mongoose");

const reservationConfigSchema = new mongoose.Schema(
  {
    totalTables: { type: Number, default: 25, min: 1, max: 200 },
    timeSlots: {
      type: [String],
      default: ["18:00", "18:30", "19:00", "19:30", "20:00", "20:30", "21:00", "21:30", "22:00", "22:30"],
    },
  },
  { timestamps: true }
);

const ReservationConfig = mongoose.model("ReservationConfig", reservationConfigSchema);

module.exports = { ReservationConfig };
