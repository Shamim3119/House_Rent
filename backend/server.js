const express = require("express");
const db = require("./config/db");

const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const houseRoutes = require("./routes/houseRoutes");
const propertyTypeRoutes = require("./routes/propertyTypeRoutes");
const billingItemRoutes = require("./routes/billingItemRoutes");
const propertyUnitRoutes = require("./routes/propertyUnitRoutes");
const tenantRoutes = require("./routes/tenantRoutes");
const tenancyRoutes = require("./routes/tenancyRoutes");
const tenancyChargeRoutes = require("./routes/tenancyChargeRoutes");
const monthlyBillRoutes = require("./routes/monthlyBillRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const reportRoutes = require("./routes/reportRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");

const app = express();
const cors = require("cors");

// ================================
// Middleware
// ================================

app.use(
  cors({
    origin: "http://localhost:5173",
  }),
);

app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    message: "Node API is working",
  });
});

app.get("/test-db", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT 1 + 1 AS result");

    res.json({
      success: true,
      message: "Database connected successfully",
      result: rows[0].result,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Database connection failed",
    });
  }
});

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/houses", houseRoutes);
app.use("/api/property-types", propertyTypeRoutes);
app.use("/api/billing-items", billingItemRoutes);
app.use("/api/property-units", propertyUnitRoutes);
app.use("/api/tenants", tenantRoutes);
app.use("/api/tenancies", tenancyRoutes);
app.use("/api/tenancy-charges", tenancyChargeRoutes);
app.use("/api/monthly-bills", monthlyBillRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/dashboard", dashboardRoutes);

const PORT = 3000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
