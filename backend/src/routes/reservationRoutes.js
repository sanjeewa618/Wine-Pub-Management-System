const express = require("express");
const { protect } = require("../middleware/auth");
const { createReservation, deleteReservation, getReservation, listReservations, updateReservation } = require("../controllers/reservationController");

const router = express.Router();

router.use(protect);
router.post("/", createReservation);
router.get("/", listReservations);
router.get("/:id", getReservation);
router.put("/:id", updateReservation);
router.delete("/:id", deleteReservation);

module.exports = router;
