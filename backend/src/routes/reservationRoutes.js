const express = require("express");
const { protect } = require("../middleware/auth");
const { createReservation, deleteReservation, getAvailability, getReservation, listReservations, updateReservation } = require("../controllers/reservationController");

const router = express.Router();

router.use(protect);
router.post("/", createReservation);
router.get("/availability", getAvailability);
router.get("/", listReservations);
router.get("/:id([0-9a-fA-F]{24})", getReservation);
router.put("/:id([0-9a-fA-F]{24})", updateReservation);
router.delete("/:id([0-9a-fA-F]{24})", deleteReservation);

module.exports = router;
