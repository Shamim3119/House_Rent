const express = require("express");
const router = express.Router();

const dashboardController = require("../controllers/dashboardController");

router.get("/overview", dashboardController.getOverview);
router.get("/monthly-trend", dashboardController.getMonthlyTrend);
router.get("/outstanding", dashboardController.getOutstanding);

module.exports = router;
