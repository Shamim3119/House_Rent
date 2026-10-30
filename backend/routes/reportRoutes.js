const express = require("express");
const router = express.Router();

const {
  getDashboardSummary,
  getOutstandingBills,
  getTenantLedger,
  getHouseOutstanding,
  getMonthlyCollection,
  getReportSummary,
  getTenancyRunningLedger,
  getCollectionReport,
  getMonthlyCollectionSummary,
} = require("../controllers/reportController");

const { authenticateToken } = require("../middleware/authMiddleware");

// =============================================
// Dashboard
// =============================================
router.get("/dashboard", authenticateToken, getDashboardSummary);

// =============================================
// Outstanding Bills
// =============================================
router.get("/outstanding-bills", authenticateToken, getOutstandingBills);

// =============================================
// Tenant Ledger (Old)
// =============================================
router.get("/tenant-ledger/:tenantId", authenticateToken, getTenantLedger);

// =============================================
// House Outstanding
// =============================================
router.get("/house-outstanding", authenticateToken, getHouseOutstanding);

// =============================================
// Monthly Collection (Old)
// =============================================
router.get("/monthly-collection", authenticateToken, getMonthlyCollection);

// =============================================
// Summary Report
// =============================================
router.get(
  "/summary",
  // authenticateToken, // Development only
  getReportSummary,
);

// =============================================
// Tenancy Running Ledger
// =============================================
router.get(
  "/tenancy-ledger/:tenancyId",
  // authenticateToken, // Development only
  getTenancyRunningLedger,
);

// =============================================
// Collection Report (New)
// =============================================
router.get(
  "/collections",
  // authenticateToken, // Development only
  getCollectionReport,
);

router.get(
  "/monthly-collections",
  authenticateToken,
  getMonthlyCollectionSummary,
);

module.exports = router;
