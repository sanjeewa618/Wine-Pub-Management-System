const express = require("express");
const { protect, authorize } = require("../middleware/auth");
const {
	createReservation,
	deleteReservation,
	getAvailability,
	getReservation,
	listReservations,
	updateReservation,
	updateReservationStatusByAdmin,
	getReservationAdminConfig,
	addReservationTableCount,
	addReservationTimeSlot,
} = require("../controllers/reservationController");

const router = express.Router();

router.use(protect);
router.post("/", createReservation);
router.get("/availability", getAvailability);
router.get("/config", getReservationAdminConfig);
router.get("/admin/config", authorize("admin"), getReservationAdminConfig);
router.put("/admin/tables", authorize("admin"), addReservationTableCount);
router.post("/admin/time-slots", authorize("admin"), addReservationTimeSlot);
router.get("/", listReservations);
router.put("/:id([0-9a-fA-F]{24})/status", authorize("admin"), updateReservationStatusByAdmin);
router.get("/:id([0-9a-fA-F]{24})", getReservation);
router.put("/:id([0-9a-fA-F]{24})", updateReservation);
router.delete("/:id([0-9a-fA-F]{24})", deleteReservation);

module.exports = router;
