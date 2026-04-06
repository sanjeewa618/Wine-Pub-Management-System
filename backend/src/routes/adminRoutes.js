const express = require("express");
const { protect, authorize } = require("../middleware/auth");
const { activityLog, analytics, queues } = require("../controllers/adminController");

const router = express.Router();

router.use(protect, authorize("admin"));
router.get("/analytics", analytics);
router.get("/activity-log", activityLog);
router.get("/queues", queues);

module.exports = router;
