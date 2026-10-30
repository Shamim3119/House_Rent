const express = require("express");
const router = express.Router();

const { authenticateToken } = require("../middleware/authMiddleware");

const {
  getPayments,
  getPaymentsByTenancy,
  getPaymentById,
  createPayment,
  voidPayment,
  getTenancyBalance,
  getVoidHistory,
} = require("../controllers/paymentController");

// Protect all payment endpoints
router.use(authenticateToken);

router.get("/void-history", getVoidHistory);

router.get("/", getPayments);

router.get("/tenancy/:tenancyId", getPaymentsByTenancy);

router.get("/tenancy/:tenancyId/balance", getTenancyBalance);

router.get("/:id", getPaymentById);

router.post("/", createPayment);

router.put("/:id/void", voidPayment);

module.exports = router;
