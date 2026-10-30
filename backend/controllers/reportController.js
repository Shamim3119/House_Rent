const db = require("../config/db");

// =====================================================
// Dashboard Summary
// =====================================================
const getDashboardSummary = async (req, res) => {
  try {
    const [[propertySummary]] = await db.query(
      `SELECT
                (SELECT COUNT(*) FROM houses) AS total_houses,

                (SELECT COUNT(*) FROM property_units)
                    AS total_property_units,

                (SELECT COUNT(*)
                 FROM tenancies
                 WHERE status = 'active')
                    AS active_tenancies,

                (SELECT COUNT(*)
                 FROM property_units pu
                 WHERE NOT EXISTS (
                    SELECT 1
                    FROM tenancies tn
                    WHERE tn.property_unit_id = pu.id
                    AND tn.status = 'active'
                 ))
                    AS vacant_units`,
    );

    const [[financialSummary]] = await db.query(
      `SELECT

                COALESCE((
                    SELECT SUM(bi.amount)
                    FROM bill_items bi
                ), 0) AS total_billed,

                COALESCE((
                    SELECT SUM(p.amount)
                    FROM payments p
                ), 0) AS total_paid,

                COALESCE((
                    SELECT SUM(bi.amount)
                    FROM bill_items bi
                ), 0)
                -
                COALESCE((
                    SELECT SUM(p.amount)
                    FROM payments p
                ), 0) AS total_due`,
    );

    const [[currentMonth]] = await db.query(
      `SELECT

                COALESCE((
                    SELECT SUM(bi.amount)

                    FROM bill_items bi

                    INNER JOIN monthly_bills mb
                        ON mb.id = bi.monthly_bill_id

                    WHERE YEAR(mb.billing_month) = YEAR(CURDATE())
                    AND MONTH(mb.billing_month) = MONTH(CURDATE())

                ), 0) AS current_month_billed,


                COALESCE((
                    SELECT SUM(p.amount)

                    FROM payments p

                    WHERE YEAR(p.payment_date) = YEAR(CURDATE())
                    AND MONTH(p.payment_date) = MONTH(CURDATE())

                ), 0) AS current_month_collected`,
    );

    return res.json({
      success: true,

      data: {
        property: {
          total_houses: Number(propertySummary.total_houses),

          total_property_units: Number(propertySummary.total_property_units),

          active_tenancies: Number(propertySummary.active_tenancies),

          vacant_units: Number(propertySummary.vacant_units),
        },

        financial: {
          total_billed: Number(financialSummary.total_billed),

          total_paid: Number(financialSummary.total_paid),

          total_due: Number(financialSummary.total_due),

          current_month_billed: Number(currentMonth.current_month_billed),

          current_month_collected: Number(currentMonth.current_month_collected),
        },
      },
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// =====================================================
// Outstanding Bills
// =====================================================
const getOutstandingBills = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT
                mb.id AS monthly_bill_id,
                mb.billing_month,
                mb.due_date,
                mb.status,

                mb.tenancy_id,

                t.id AS tenant_id,
                t.name AS tenant_name,
                t.phone AS tenant_phone,

                pu.id AS property_unit_id,
                pu.name AS property_unit_name,

                h.id AS house_id,
                h.name AS house_name,

                COALESCE((
                    SELECT SUM(bi.amount)
                    FROM bill_items bi
                    WHERE bi.monthly_bill_id = mb.id
                ), 0) AS total_amount,

                COALESCE((
                    SELECT SUM(p.amount)
                    FROM payments p
                    WHERE p.monthly_bill_id = mb.id
                ), 0) AS paid_amount,

                COALESCE((
                    SELECT SUM(bi.amount)
                    FROM bill_items bi
                    WHERE bi.monthly_bill_id = mb.id
                ), 0)
                -
                COALESCE((
                    SELECT SUM(p.amount)
                    FROM payments p
                    WHERE p.monthly_bill_id = mb.id
                ), 0) AS due_amount

             FROM monthly_bills mb

             INNER JOIN tenancies tn
                ON tn.id = mb.tenancy_id

             INNER JOIN tenants t
                ON t.id = tn.tenant_id

             INNER JOIN property_units pu
                ON pu.id = tn.property_unit_id

             INNER JOIN houses h
                ON h.id = pu.house_id

             WHERE mb.status IN ('unpaid', 'partial')

             ORDER BY
                mb.billing_month ASC,
                h.name ASC,
                pu.name ASC`,
    );

    const data = rows.map((row) => ({
      ...row,

      total_amount: Number(row.total_amount),

      paid_amount: Number(row.paid_amount),

      due_amount: Number(row.due_amount),
    }));

    return res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// =====================================================
// Tenant Ledger
// =====================================================
const getTenantLedger = async (req, res) => {
  try {
    const { tenantId } = req.params;

    // ---------------------------------------------
    // Tenant
    // ---------------------------------------------
    const [tenants] = await db.query(
      `SELECT
                id,
                name,
                address,
                phone,
                nid

             FROM tenants

             WHERE id = ?

             LIMIT 1`,
      [tenantId],
    );

    if (tenants.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Tenant not found",
      });
    }

    // ---------------------------------------------
    // Tenancies
    // ---------------------------------------------
    const [tenancies] = await db.query(
      `SELECT
                tn.id AS tenancy_id,

                tn.start_date,
                tn.end_date,
                tn.advance_amount,
                tn.status,

                pu.id AS property_unit_id,
                pu.name AS property_unit_name,

                h.id AS house_id,
                h.name AS house_name,
                h.address AS house_address

             FROM tenancies tn

             INNER JOIN property_units pu
                ON pu.id = tn.property_unit_id

             INNER JOIN houses h
                ON h.id = pu.house_id

             WHERE tn.tenant_id = ?

             ORDER BY tn.start_date DESC`,
      [tenantId],
    );

    // ---------------------------------------------
    // Monthly bills
    // ---------------------------------------------
    const [bills] = await db.query(
      `SELECT
                mb.id AS monthly_bill_id,

                mb.tenancy_id,

                mb.billing_month,
                mb.due_date,
                mb.status,

                pu.name AS property_unit_name,
                h.name AS house_name,

                COALESCE((
                    SELECT SUM(bi.amount)
                    FROM bill_items bi
                    WHERE bi.monthly_bill_id = mb.id
                ), 0) AS total_amount,

                COALESCE((
                    SELECT SUM(p.amount)
                    FROM payments p
                    WHERE p.monthly_bill_id = mb.id
                ), 0) AS paid_amount,

                COALESCE((
                    SELECT SUM(bi.amount)
                    FROM bill_items bi
                    WHERE bi.monthly_bill_id = mb.id
                ), 0)
                -
                COALESCE((
                    SELECT SUM(p.amount)
                    FROM payments p
                    WHERE p.monthly_bill_id = mb.id
                ), 0) AS due_amount

             FROM monthly_bills mb

             INNER JOIN tenancies tn
                ON tn.id = mb.tenancy_id

             INNER JOIN property_units pu
                ON pu.id = tn.property_unit_id

             INNER JOIN houses h
                ON h.id = pu.house_id

             WHERE tn.tenant_id = ?

             ORDER BY mb.billing_month ASC`,
      [tenantId],
    );

    const formattedBills = bills.map((bill) => ({
      ...bill,

      total_amount: Number(bill.total_amount),

      paid_amount: Number(bill.paid_amount),

      due_amount: Number(bill.due_amount),
    }));

    const totalBilled = formattedBills.reduce(
      (sum, bill) => sum + bill.total_amount,
      0,
    );

    const totalPaid = formattedBills.reduce(
      (sum, bill) => sum + bill.paid_amount,
      0,
    );

    const totalDue = totalBilled - totalPaid;

    return res.json({
      success: true,

      data: {
        tenant: tenants[0],

        summary: {
          total_billed: totalBilled,
          total_paid: totalPaid,
          total_due: totalDue,
        },

        tenancies,

        bills: formattedBills,
      },
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// =====================================================
// House Wise Outstanding
// =====================================================
const getHouseOutstanding = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT
                h.id AS house_id,
                h.name AS house_name,

                COUNT(DISTINCT mb.id)
                    AS outstanding_bill_count,

                COALESCE(
                    SUM(bill_totals.total_amount),
                    0
                ) AS total_billed,

                COALESCE(
                    SUM(payment_totals.paid_amount),
                    0
                ) AS total_paid,

                COALESCE(
                    SUM(bill_totals.total_amount),
                    0
                )
                -
                COALESCE(
                    SUM(payment_totals.paid_amount),
                    0
                ) AS total_due

             FROM houses h

             INNER JOIN property_units pu
                ON pu.house_id = h.id

             INNER JOIN tenancies tn
                ON tn.property_unit_id = pu.id

             INNER JOIN monthly_bills mb
                ON mb.tenancy_id = tn.id

             LEFT JOIN (
                SELECT
                    monthly_bill_id,
                    SUM(amount) AS total_amount

                FROM bill_items

                GROUP BY monthly_bill_id

             ) bill_totals
                ON bill_totals.monthly_bill_id = mb.id

             LEFT JOIN (
                SELECT
                    monthly_bill_id,
                    SUM(amount) AS paid_amount

                FROM payments

                GROUP BY monthly_bill_id

             ) payment_totals
                ON payment_totals.monthly_bill_id = mb.id

             WHERE mb.status IN ('unpaid', 'partial')

             GROUP BY
                h.id,
                h.name

             ORDER BY h.name ASC`,
    );

    const data = rows.map((row) => ({
      ...row,

      outstanding_bill_count: Number(row.outstanding_bill_count),

      total_billed: Number(row.total_billed),

      total_paid: Number(row.total_paid),

      total_due: Number(row.total_due),
    }));

    return res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// =====================================================
// Monthly Collection Report
//
// Example:
// /api/reports/monthly-collection?year=2026&month=10
// =====================================================
const getMonthlyCollection = async (req, res) => {
  try {
    const { year, month } = req.query;

    if (!year || !month) {
      return res.status(400).json({
        success: false,
        message: "Year and month are required",
      });
    }

    const numericYear = Number(year);
    const numericMonth = Number(month);

    if (
      !Number.isInteger(numericYear) ||
      numericYear < 2000 ||
      numericYear > 2100
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid year",
      });
    }

    if (
      !Number.isInteger(numericMonth) ||
      numericMonth < 1 ||
      numericMonth > 12
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid month",
      });
    }

    const [payments] = await db.query(
      `SELECT
                p.id AS payment_id,
                p.amount,
                p.payment_date,
                p.note,

                mb.id AS monthly_bill_id,
                mb.billing_month,

                t.id AS tenant_id,
                t.name AS tenant_name,

                pu.id AS property_unit_id,
                pu.name AS property_unit_name,

                h.id AS house_id,
                h.name AS house_name

             FROM payments p

             INNER JOIN monthly_bills mb
                ON mb.id = p.monthly_bill_id

             INNER JOIN tenancies tn
                ON tn.id = mb.tenancy_id

             INNER JOIN tenants t
                ON t.id = tn.tenant_id

             INNER JOIN property_units pu
                ON pu.id = tn.property_unit_id

             INNER JOIN houses h
                ON h.id = pu.house_id

             WHERE YEAR(p.payment_date) = ?
             AND MONTH(p.payment_date) = ?

             ORDER BY
                p.payment_date ASC,
                p.id ASC`,
      [numericYear, numericMonth],
    );

    const formattedPayments = payments.map((payment) => ({
      ...payment,
      amount: Number(payment.amount),
    }));

    const totalCollection = formattedPayments.reduce(
      (sum, payment) => sum + payment.amount,
      0,
    );

    return res.json({
      success: true,

      data: {
        year: numericYear,
        month: numericMonth,

        total_collection: totalCollection,

        payment_count: formattedPayments.length,

        payments: formattedPayments,
      },
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const getReportSummary = async (req, res) => {
  try {
    const { from_month, to_month, house_id, tenant_id, property_unit_id } =
      req.query;

    // Validate YYYY-MM format
    const isValidMonth = (value) => {
      if (typeof value !== "string") return false;

      const match = /^(\d{4})-(\d{2})$/.exec(value);
      if (!match) return false;

      const year = Number(match[1]);
      const month = Number(match[2]);

      return year >= 2000 && year <= 2100 && month >= 1 && month <= 12;
    };

    if (!isValidMonth(from_month) || !isValidMonth(to_month)) {
      return res.status(400).json({
        success: false,
        message: "Valid from_month and to_month (YYYY-MM) are required",
      });
    }

    if (from_month > to_month) {
      return res.status(400).json({
        success: false,
        message: "From month cannot be after to month",
      });
    }

    // First day of the month AFTER the selected ending month
    const [endYear, endMonth] = to_month.split("-").map(Number);
    const nextMonthDate = new Date(Date.UTC(endYear, endMonth, 1))
      .toISOString()
      .slice(0, 10);

    const startDate = `${from_month}-01`;

    const filters = [];
    const params = [startDate, nextMonthDate, startDate, nextMonthDate];

    const addIdFilter = (value, column, name) => {
      if (value === undefined || value === "") return null;

      const id = Number(value);

      if (!Number.isSafeInteger(id) || id <= 0) {
        return `Invalid ${name}`;
      }

      filters.push(`${column} = ?`);
      params.push(id);
      return null;
    };

    const validationError =
      addIdFilter(house_id, "h.id", "house_id") ||
      addIdFilter(tenant_id, "t.id", "tenant_id") ||
      addIdFilter(property_unit_id, "pu.id", "property_unit_id");

    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError,
      });
    }

    const whereClause = filters.length ? `WHERE ${filters.join(" AND ")}` : "";

    const [rows] = await db.query(
      `
            SELECT
                tn.id AS tenancy_id,
                tn.status AS tenancy_status,

                t.id AS tenant_id,
                t.name AS tenant_name,
                t.phone AS tenant_phone,

                pu.id AS property_unit_id,
                pu.name AS property_unit_name,

                h.id AS house_id,
                h.name AS house_name,

                COALESCE(b.opening_billed, 0)
                    AS opening_billed,

                COALESCE(b.period_billed, 0)
                    AS period_billed,

                COALESCE(p.opening_added, 0)
                    AS opening_added,

                COALESCE(p.opening_returned, 0)
                    AS opening_returned,

                COALESCE(p.period_added, 0)
                    AS period_added,

                COALESCE(p.period_returned, 0)
                    AS period_returned

            FROM tenancies tn

            INNER JOIN tenants t
                ON t.id = tn.tenant_id

            INNER JOIN property_units pu
                ON pu.id = tn.property_unit_id

            INNER JOIN houses h
                ON h.id = pu.house_id

            LEFT JOIN (
                SELECT
                    mb.tenancy_id,

                    SUM(
                        CASE
                            WHEN mb.billing_month < ?
                            THEN bi.amount
                            ELSE 0
                        END
                    ) AS opening_billed,

                    SUM(
                        CASE
                            WHEN mb.billing_month >= ?
                             AND mb.billing_month < ?
                            THEN bi.amount
                            ELSE 0
                        END
                    ) AS period_billed

                FROM monthly_bills mb

                INNER JOIN bill_items bi
                    ON bi.monthly_bill_id = mb.id

                GROUP BY mb.tenancy_id
            ) b ON b.tenancy_id = tn.id

            LEFT JOIN (
                SELECT
                    tenancy_id,

                    SUM(
                        CASE
                            WHEN payment_date < ?
                             AND payment_type = 'add'
                            THEN amount ELSE 0
                        END
                    ) AS opening_added,

                    SUM(
                        CASE
                            WHEN payment_date < ?
                             AND payment_type = 'return'
                            THEN amount ELSE 0
                        END
                    ) AS opening_returned,

                    SUM(
                        CASE
                            WHEN payment_date >= ?
                             AND payment_date < ?
                             AND payment_type = 'add'
                            THEN amount ELSE 0
                        END
                    ) AS period_added,

                    SUM(
                        CASE
                            WHEN payment_date >= ?
                             AND payment_date < ?
                             AND payment_type = 'return'
                            THEN amount ELSE 0
                        END
                    ) AS period_returned

                FROM payments
                WHERE is_void = FALSE
                GROUP BY tenancy_id
            ) p ON p.tenancy_id = tn.id

            ${whereClause}

            ORDER BY
                h.name,
                pu.name,
                t.name,
                tn.id
            `,
      [
        startDate,
        startDate,
        nextMonthDate,

        startDate,
        startDate,
        startDate,
        nextMonthDate,
        startDate,
        nextMonthDate,

        ...params.slice(4),
      ],
    );

    const money = (value) =>
      Math.round((Number(value) + Number.EPSILON) * 100) / 100;

    const data = rows.map((row) => {
      const openingBalance = money(
        Number(row.opening_billed) -
          Number(row.opening_added) +
          Number(row.opening_returned),
      );

      const periodBilled = money(row.period_billed);
      const periodAdded = money(row.period_added);
      const periodReturned = money(row.period_returned);

      const netPayment = money(periodAdded - periodReturned);

      const closingBalance = money(openingBalance + periodBilled - netPayment);

      return {
        tenancy_id: row.tenancy_id,
        tenancy_status: row.tenancy_status,
        tenant_id: row.tenant_id,
        tenant_name: row.tenant_name,
        tenant_phone: row.tenant_phone,
        house_id: row.house_id,
        house_name: row.house_name,
        property_unit_id: row.property_unit_id,
        property_unit_name: row.property_unit_name,

        opening_balance: openingBalance,
        period_billed: periodBilled,
        period_added: periodAdded,
        period_returned: periodReturned,
        net_payment: netPayment,
        closing_balance: closingBalance,

        balance_type:
          closingBalance > 0
            ? "due"
            : closingBalance < 0
              ? "advance"
              : "settled",

        balance_amount: Math.abs(closingBalance),
      };
    });

    const totals = data.reduce(
      (acc, row) => {
        acc.opening_balance += row.opening_balance;
        acc.period_billed += row.period_billed;
        acc.period_added += row.period_added;
        acc.period_returned += row.period_returned;
        acc.net_payment += row.net_payment;
        acc.closing_balance += row.closing_balance;
        return acc;
      },
      {
        opening_balance: 0,
        period_billed: 0,
        period_added: 0,
        period_returned: 0,
        net_payment: 0,
        closing_balance: 0,
      },
    );

    Object.keys(totals).forEach((key) => {
      totals[key] = money(totals[key]);
    });

    return res.json({
      success: true,
      data: {
        filters: {
          from_month,
          to_month,
          house_id: house_id || null,
          tenant_id: tenant_id || null,
          property_unit_id: property_unit_id || null,
        },
        totals,
        count: data.length,
        rows: data,
      },
    });
  } catch (error) {
    console.error("Report summary error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to generate summary report",
    });
  }
};

const getTenancyRunningLedger = async (req, res) => {
  try {
    const tenancyId = Number(req.params.tenancyId);
    const { from_month, to_month } = req.query;

    if (!Number.isSafeInteger(tenancyId) || tenancyId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Valid tenancy ID is required",
      });
    }

    const isValidMonth = (value) => {
      if (typeof value !== "string") return false;

      const match = /^(\d{4})-(\d{2})$/.exec(value);
      if (!match) return false;

      const year = Number(match[1]);
      const month = Number(match[2]);

      return year >= 2000 && year <= 2100 && month >= 1 && month <= 12;
    };

    if (!isValidMonth(from_month) || !isValidMonth(to_month)) {
      return res.status(400).json({
        success: false,
        message: "Valid from_month and to_month are required (YYYY-MM)",
      });
    }

    if (from_month > to_month) {
      return res.status(400).json({
        success: false,
        message: "From month cannot be after to month",
      });
    }

    const startDate = `${from_month}-01`;

    const [endYear, endMonth] = to_month.split("-").map(Number);

    const nextMonthDate = new Date(Date.UTC(endYear, endMonth, 1))
      .toISOString()
      .slice(0, 10);

    const [tenancies] = await db.query(
      `
            SELECT
                tn.id AS tenancy_id,
                tn.status AS tenancy_status,
                DATE_FORMAT(tn.start_date, '%Y-%m-%d') AS start_date,
                DATE_FORMAT(tn.end_date, '%Y-%m-%d') AS end_date,

                t.id AS tenant_id,
                t.name AS tenant_name,
                t.phone AS tenant_phone,
                t.address AS tenant_address,

                pu.id AS property_unit_id,
                pu.name AS property_unit_name,

                h.id AS house_id,
                h.name AS house_name,
                h.address AS house_address

            FROM tenancies tn
            INNER JOIN tenants t ON t.id = tn.tenant_id
            INNER JOIN property_units pu
                ON pu.id = tn.property_unit_id
            INNER JOIN houses h ON h.id = pu.house_id

            WHERE tn.id = ?
            LIMIT 1
            `,
      [tenancyId],
    );

    if (tenancies.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Tenancy not found",
      });
    }

    // Use integer cents for accurate running balances.
    const toCents = (value) => Math.round(Number(value) * 100);

    const toMoney = (cents) => Math.round(cents) / 100;

    // Bills before the selected period.
    const [[openingBills]] = await db.query(
      `
            SELECT COALESCE(SUM(bi.amount), 0) AS total
            FROM monthly_bills mb
            INNER JOIN bill_items bi
                ON bi.monthly_bill_id = mb.id
            WHERE mb.tenancy_id = ?
              AND mb.billing_month < ?
            `,
      [tenancyId, startDate],
    );

    // Payments before the selected period.
    const [[openingPayments]] = await db.query(
      `
            SELECT
                COALESCE(SUM(
                    CASE WHEN payment_type = 'add'
                         THEN amount ELSE 0 END
                ), 0) AS added,

                COALESCE(SUM(
                    CASE WHEN payment_type = 'return'
                         THEN amount ELSE 0 END
                ), 0) AS returned

            FROM payments
            WHERE tenancy_id = ?
              AND is_void = FALSE
              AND payment_date < ?
            `,
      [tenancyId, startDate],
    );

    const openingBalanceCents =
      toCents(openingBills.total) -
      toCents(openingPayments.added) +
      toCents(openingPayments.returned);

    // Bills within the selected period.
    const [bills] = await db.query(
      `
            SELECT
                mb.id AS monthly_bill_id,
                DATE_FORMAT(
                    mb.billing_month, '%Y-%m-%d'
                ) AS transaction_date,

                DATE_FORMAT(
                    mb.billing_month, '%Y-%m'
                ) AS billing_month,

                COALESCE(SUM(bi.amount), 0) AS amount

            FROM monthly_bills mb
            LEFT JOIN bill_items bi
                ON bi.monthly_bill_id = mb.id

            WHERE mb.tenancy_id = ?
              AND mb.billing_month >= ?
              AND mb.billing_month < ?

            GROUP BY mb.id, mb.billing_month
            ORDER BY mb.billing_month, mb.id
            `,
      [tenancyId, startDate, nextMonthDate],
    );

    // Actual payments within the selected period.
    const [payments] = await db.query(
      `
            SELECT
                id AS payment_id,
                payment_type,

                DATE_FORMAT(
                    payment_date, '%Y-%m-%d %H:%i:%s'
                ) AS transaction_datetime,

                amount,
                reference_no,
                note

            FROM payments

            WHERE tenancy_id = ?
              AND is_void = FALSE
              AND payment_date >= ?
              AND payment_date < ?

            ORDER BY payment_date, id
            `,
      [tenancyId, startDate, nextMonthDate],
    );

    const transactions = [];

    for (const bill of bills) {
      transactions.push({
        transaction_type: "bill",
        transaction_id: Number(bill.monthly_bill_id),
        transaction_datetime: `${bill.transaction_date} 00:00:00`,
        billing_month: bill.billing_month,
        description: `Rent Bill - ${bill.billing_month}`,
        reference_no: null,
        note: null,
        debit_cents: toCents(bill.amount),
        credit_cents: 0,
        sort_priority: 0,
      });
    }

    for (const payment of payments) {
      const amountCents = toCents(payment.amount);
      const isReturn = payment.payment_type === "return";

      transactions.push({
        transaction_type: payment.payment_type,
        transaction_id: Number(payment.payment_id),
        transaction_datetime: payment.transaction_datetime,
        billing_month: null,
        description: isReturn ? "Payment Returned" : "Payment Received",
        reference_no: payment.reference_no,
        note: payment.note,
        debit_cents: isReturn ? amountCents : 0,
        credit_cents: isReturn ? 0 : amountCents,
        sort_priority: 1,
      });
    }

    transactions.sort((a, b) => {
      const dateCompare = a.transaction_datetime.localeCompare(
        b.transaction_datetime,
      );

      if (dateCompare !== 0) return dateCompare;

      if (a.sort_priority !== b.sort_priority) {
        return a.sort_priority - b.sort_priority;
      }

      return a.transaction_id - b.transaction_id;
    });

    let runningBalanceCents = openingBalanceCents;
    let totalDebitCents = 0;
    let totalCreditCents = 0;

    const ledgerRows = transactions.map((transaction) => {
      runningBalanceCents += transaction.debit_cents - transaction.credit_cents;

      totalDebitCents += transaction.debit_cents;
      totalCreditCents += transaction.credit_cents;

      return {
        transaction_type: transaction.transaction_type,
        transaction_id: transaction.transaction_id,
        transaction_datetime: transaction.transaction_datetime,
        billing_month: transaction.billing_month,
        description: transaction.description,
        reference_no: transaction.reference_no,
        note: transaction.note,

        debit: toMoney(transaction.debit_cents),
        credit: toMoney(transaction.credit_cents),
        running_balance: toMoney(runningBalanceCents),

        balance_type:
          runningBalanceCents > 0
            ? "due"
            : runningBalanceCents < 0
              ? "advance"
              : "settled",
      };
    });

    const closingBalanceCents = runningBalanceCents;

    return res.json({
      success: true,
      data: {
        tenancy: tenancies[0],

        filters: {
          from_month,
          to_month,
        },

        summary: {
          opening_balance: toMoney(openingBalanceCents),

          total_debit: toMoney(totalDebitCents),

          total_credit: toMoney(totalCreditCents),

          closing_balance: toMoney(closingBalanceCents),

          balance_type:
            closingBalanceCents > 0
              ? "due"
              : closingBalanceCents < 0
                ? "advance"
                : "settled",

          balance_amount: toMoney(Math.abs(closingBalanceCents)),
        },

        count: ledgerRows.length,
        transactions: ledgerRows,
      },
    });
  } catch (error) {
    console.error("Tenancy ledger error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to generate tenancy ledger",
    });
  }
};

// =====================================================
// Collection Report
// GET /api/reports/collections
// =====================================================
const getCollectionReport = async (req, res) => {
  try {
    const { from_month, to_month, house_id, tenant_id, property_unit_id } =
      req.query;

    // Validate YYYY-MM
    const isValidMonth = (value) => {
      if (typeof value !== "string") return false;

      const match = /^(\d{4})-(\d{2})$/.exec(value);
      if (!match) return false;

      const year = Number(match[1]);
      const month = Number(match[2]);

      return year >= 2000 && year <= 2100 && month >= 1 && month <= 12;
    };

    if (!isValidMonth(from_month) || !isValidMonth(to_month)) {
      return res.status(400).json({
        success: false,
        message: "Valid from_month and to_month (YYYY-MM) are required",
      });
    }

    if (from_month > to_month) {
      return res.status(400).json({
        success: false,
        message: "From month cannot be after to month",
      });
    }

    const startDate = `${from_month}-01`;

    // Exclusive ending date
    const [endYear, endMonth] = to_month.split("-").map(Number);

    const nextMonthDate = new Date(Date.UTC(endYear, endMonth, 1))
      .toISOString()
      .slice(0, 10);

    // Optional filters
    const conditions = [
      "p.payment_date >= ?",
      "p.payment_date < ?",
      "p.is_void = FALSE",
      "p.payment_type IN ('add', 'return')",
    ];

    const params = [startDate, nextMonthDate];

    const addIdFilter = (value, column, name) => {
      if (value === undefined || value === null || value === "") {
        return null;
      }

      const id = Number(value);

      if (!Number.isSafeInteger(id) || id <= 0) {
        return `Invalid ${name}`;
      }

      conditions.push(`${column} = ?`);
      params.push(id);

      return null;
    };

    const validationError =
      addIdFilter(house_id, "h.id", "house_id") ||
      addIdFilter(tenant_id, "t.id", "tenant_id") ||
      addIdFilter(property_unit_id, "pu.id", "property_unit_id");

    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError,
      });
    }

    const whereClause = conditions.join(" AND ");

    const [rows] = await db.query(
      `
      SELECT
        p.id AS payment_id,
        p.tenancy_id,
        p.payment_type,

        DATE_FORMAT(
          p.payment_date,
          '%Y-%m-%d %H:%i:%s'
        ) AS payment_date,

        p.amount,
        p.reference_no,
        p.note,

        tn.status AS tenancy_status,

        t.id AS tenant_id,
        t.name AS tenant_name,

        pu.id AS property_unit_id,
        pu.name AS property_unit_name,

        h.id AS house_id,
        h.name AS house_name

      FROM payments p

      INNER JOIN tenancies tn
        ON tn.id = p.tenancy_id

      INNER JOIN tenants t
        ON t.id = tn.tenant_id

      INNER JOIN property_units pu
        ON pu.id = tn.property_unit_id

      INNER JOIN houses h
        ON h.id = pu.house_id

      WHERE ${whereClause}

      ORDER BY
        p.payment_date ASC,
        p.id ASC
      `,
      params,
    );

    // Use integer cents for accurate totals
    const toCents = (value) => Math.round(Number(value || 0) * 100);

    const toMoney = (cents) => Math.round(cents) / 100;

    let receivedCents = 0;
    let returnedCents = 0;

    const payments = rows.map((row) => {
      const amountCents = toCents(row.amount);

      const isReturn = row.payment_type === "return";

      const received = isReturn ? 0 : amountCents;
      const returned = isReturn ? amountCents : 0;

      receivedCents += received;
      returnedCents += returned;

      return {
        payment_id: Number(row.payment_id),

        tenancy_id: Number(row.tenancy_id),

        payment_date: row.payment_date,
        payment_type: row.payment_type,

        tenant_id: Number(row.tenant_id),
        tenant_name: row.tenant_name,

        property_unit_id: Number(row.property_unit_id),
        property_unit_name: row.property_unit_name,

        house_id: Number(row.house_id),
        house_name: row.house_name,

        tenancy_status: row.tenancy_status,

        reference_no: row.reference_no,
        note: row.note,

        amount: toMoney(amountCents),
        received: toMoney(received),
        returned: toMoney(returned),

        net_collection: toMoney(received - returned),
      };
    });

    const netCollectionCents = receivedCents - returnedCents;

    return res.json({
      success: true,

      data: {
        filters: {
          from_month,
          to_month,
          house_id: house_id || null,
          tenant_id: tenant_id || null,
          property_unit_id: property_unit_id || null,
        },

        totals: {
          received: toMoney(receivedCents),
          returned: toMoney(returnedCents),
          net_collection: toMoney(netCollectionCents),
        },

        count: payments.length,
        payments,
      },
    });
  } catch (error) {
    console.error("Collection report error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to generate collection report",
    });
  }
};

const getMonthlyCollectionSummary = async (req, res) => {
  try {
    const { from_month, to_month, house_id, tenant_id, property_unit_id } =
      req.query;

    const monthPattern = /^\d{4}-(0[1-9]|1[0-2])$/;

    if (
      !monthPattern.test(from_month || "") ||
      !monthPattern.test(to_month || "")
    ) {
      return res.status(400).json({
        success: false,
        message: "Valid from_month and to_month are required (YYYY-MM).",
      });
    }

    if (from_month > to_month) {
      return res.status(400).json({
        success: false,
        message: "From Month cannot be greater than To Month.",
      });
    }

    const parseFilterId = (value) => {
      if (value === undefined || value === "") return null;

      const number = Number(value);

      return Number.isSafeInteger(number) && number > 0 ? number : NaN;
    };

    const filters = {
      house_id: parseFilterId(house_id),
      tenant_id: parseFilterId(tenant_id),
      property_unit_id: parseFilterId(property_unit_id),
    };

    if (Object.values(filters).some(Number.isNaN)) {
      return res.status(400).json({
        success: false,
        message: "Invalid house, tenant or property unit filter.",
      });
    }

    const where = [
      "p.is_void = 0",
      "p.payment_date >= ?",
      "p.payment_date < DATE_ADD(?, INTERVAL 1 MONTH)",
    ];

    const params = [`${from_month}-01`, `${to_month}-01`];

    if (filters.house_id !== null) {
      where.push("h.id = ?");
      params.push(filters.house_id);
    }

    if (filters.tenant_id !== null) {
      where.push("t.id = ?");
      params.push(filters.tenant_id);
    }

    if (filters.property_unit_id !== null) {
      where.push("pu.id = ?");
      params.push(filters.property_unit_id);
    }

    const sql = `
            SELECT
                DATE_FORMAT(p.payment_date, '%Y-%m') AS month,

                COUNT(*) AS payment_count,

                COALESCE(SUM(
                    CASE
                        WHEN p.payment_type = 'add'
                        THEN p.amount
                        ELSE 0
                    END
                ), 0) AS received,

                COALESCE(SUM(
                    CASE
                        WHEN p.payment_type = 'return'
                        THEN p.amount
                        ELSE 0
                    END
                ), 0) AS returned

            FROM payments p

            INNER JOIN tenancies tn
                ON tn.id = p.tenancy_id

            INNER JOIN tenants t
                ON t.id = tn.tenant_id

            INNER JOIN property_units pu
                ON pu.id = tn.property_unit_id

            INNER JOIN houses h
                ON h.id = pu.house_id

            WHERE ${where.join(" AND ")}

            GROUP BY DATE_FORMAT(p.payment_date, '%Y-%m')
            ORDER BY month ASC
        `;

    const [records] = await db.query(sql, params);

    const recordMap = new Map(records.map((record) => [record.month, record]));

    const months = [];

    const [startYear, startMonth] = from_month.split("-").map(Number);
    const [endYear, endMonth] = to_month.split("-").map(Number);

    let year = startYear;
    let month = startMonth;

    const totals = {
      received: 0,
      returned: 0,
      net_collection: 0,
      payment_count: 0,
    };

    while (year < endYear || (year === endYear && month <= endMonth)) {
      const monthKey = `${year}-${String(month).padStart(2, "0")}`;

      const record = recordMap.get(monthKey);

      const received = Number(record?.received || 0);
      const returned = Number(record?.returned || 0);
      const paymentCount = Number(record?.payment_count || 0);

      const netCollection = received - returned;

      months.push({
        month: monthKey,
        received,
        returned,
        net_collection: netCollection,
        payment_count: paymentCount,
      });

      totals.received += received;
      totals.returned += returned;
      totals.net_collection += netCollection;
      totals.payment_count += paymentCount;

      month++;

      if (month > 12) {
        month = 1;
        year++;
      }
    }

    return res.json({
      success: true,
      data: {
        filters: {
          from_month,
          to_month,
          ...filters,
        },
        totals,
        count: months.length,
        months,
      },
    });
  } catch (error) {
    console.error("Monthly Collection Summary Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to generate monthly collection summary.",
    });
  }
};

module.exports = {
  getDashboardSummary,
  getOutstandingBills,
  getTenantLedger,
  getHouseOutstanding,
  getMonthlyCollection,
  getReportSummary,
  getTenancyRunningLedger,
  getCollectionReport,
  getMonthlyCollectionSummary,
};
