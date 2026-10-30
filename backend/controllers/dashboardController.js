const db = require("../config/db");

// ==========================================
// Helpers
// ==========================================

const toCents = (value) => Math.round(Number(value || 0) * 100);

const toMoney = (cents) => Math.round(cents) / 100;

const getCurrentMonth = () => {
  const now = new Date();

  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
};

const isValidMonth = (value) => {
  if (typeof value !== "string") return false;

  const match = /^(\d{4})-(\d{2})$/.exec(value);
  if (!match) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);

  return year >= 2000 && year <= 2100 && month >= 1 && month <= 12;
};

const nextMonth = (month) => {
  const [year, monthNumber] = month.split("-").map(Number);

  return new Date(Date.UTC(year, monthNumber, 1)).toISOString().slice(0, 10);
};

const parseFilters = (req) => {
  const month = req.query.month || getCurrentMonth();

  if (!isValidMonth(month)) {
    return { error: "Invalid month. Use YYYY-MM." };
  }

  let houseId = null;

  if (req.query.house_id !== undefined && req.query.house_id !== "") {
    houseId = Number(req.query.house_id);

    if (!Number.isSafeInteger(houseId) || houseId <= 0) {
      return { error: "Invalid house_id." };
    }
  }

  return {
    month,
    houseId,
    startDate: `${month}-01`,
    endDate: nextMonth(month),
  };
};

const sendError = (res, error, label) => {
  console.error(label, error);

  return res.status(500).json({
    success: false,
    message: "Failed to load dashboard data",
  });
};

// ==========================================
// Shared tenancy balances
// ==========================================
// Closing balance as of selected month end.
// Positive = Due, Negative = Advance.
// Voided payments are excluded.

const getTenancyBalances = async (houseId, endDate) => {
  const houseCondition = houseId ? "AND h.id = ?" : "";

  const params = [endDate, endDate, ...(houseId ? [houseId] : [])];

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

      COALESCE(b.total_billed, 0) AS total_billed,
      COALESCE(p.total_received, 0) AS total_received,
      COALESCE(p.total_returned, 0) AS total_returned

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
        SUM(bi.amount) AS total_billed

      FROM monthly_bills mb

      INNER JOIN bill_items bi
        ON bi.monthly_bill_id = mb.id

      WHERE mb.billing_month < ?

      GROUP BY mb.tenancy_id
    ) b ON b.tenancy_id = tn.id

    LEFT JOIN (
      SELECT
        tenancy_id,

        SUM(
          CASE
            WHEN payment_type = 'add'
            THEN amount ELSE 0
          END
        ) AS total_received,

        SUM(
          CASE
            WHEN payment_type = 'return'
            THEN amount ELSE 0
          END
        ) AS total_returned

      FROM payments

      WHERE is_void = FALSE
        AND payment_date < ?

      GROUP BY tenancy_id
    ) p ON p.tenancy_id = tn.id

    WHERE 1 = 1
      ${houseCondition}

    ORDER BY h.name, pu.name, t.name, tn.id
    `,
    params,
  );

  return rows.map((row) => {
    const billed = toCents(row.total_billed);
    const received = toCents(row.total_received);
    const returned = toCents(row.total_returned);

    const balance = billed - received + returned;

    return {
      tenancy_id: Number(row.tenancy_id),
      tenancy_status: row.tenancy_status,

      tenant_id: Number(row.tenant_id),
      tenant_name: row.tenant_name,
      tenant_phone: row.tenant_phone,

      property_unit_id: Number(row.property_unit_id),
      property_unit_name: row.property_unit_name,

      house_id: Number(row.house_id),
      house_name: row.house_name,

      total_billed: toMoney(billed),
      total_received: toMoney(received),
      total_returned: toMoney(returned),
      net_payment: toMoney(received - returned),

      closing_balance: toMoney(balance),

      balance_type: balance > 0 ? "due" : balance < 0 ? "advance" : "settled",

      balance_amount: toMoney(Math.abs(balance)),
    };
  });
};

// ==========================================
// GET /api/dashboard/overview
// ==========================================

const getOverview = async (req, res) => {
  try {
    const filters = parseFilters(req);

    if (filters.error) {
      return res.status(400).json({
        success: false,
        message: filters.error,
      });
    }

    const { month, houseId, startDate, endDate } = filters;

    const houseCondition = houseId ? "WHERE id = ?" : "";
    const unitCondition = houseId ? "WHERE house_id = ?" : "";

    const [[houseCount]] = await db.query(
      `SELECT COUNT(*) AS total FROM houses ${houseCondition}`,
      houseId ? [houseId] : [],
    );

    const [[unitCount]] = await db.query(
      `SELECT COUNT(*) AS total
       FROM property_units ${unitCondition}`,
      houseId ? [houseId] : [],
    );

    const [[occupiedCount]] = await db.query(
      `
      SELECT COUNT(DISTINCT pu.id) AS total

      FROM property_units pu

      INNER JOIN tenancies tn
        ON tn.property_unit_id = pu.id
        AND tn.status = 'active'

      WHERE (? IS NULL OR pu.house_id = ?)
      `,
      [houseId, houseId],
    );

    const [[activeCount]] = await db.query(
      `
      SELECT COUNT(*) AS total

      FROM tenancies tn

      INNER JOIN property_units pu
        ON pu.id = tn.property_unit_id

      WHERE tn.status = 'active'
        AND (? IS NULL OR pu.house_id = ?)
      `,
      [houseId, houseId],
    );

    const [[billSummary]] = await db.query(
      `
      SELECT
        COALESCE(SUM(bi.amount), 0) AS total

      FROM monthly_bills mb

      INNER JOIN bill_items bi
        ON bi.monthly_bill_id = mb.id

      INNER JOIN tenancies tn
        ON tn.id = mb.tenancy_id

      INNER JOIN property_units pu
        ON pu.id = tn.property_unit_id

      WHERE mb.billing_month >= ?
        AND mb.billing_month < ?
        AND (? IS NULL OR pu.house_id = ?)
      `,
      [startDate, endDate, houseId, houseId],
    );

    const [[paymentSummary]] = await db.query(
      `
      SELECT
        COALESCE(SUM(
          CASE
            WHEN p.payment_type = 'add'
            THEN p.amount ELSE 0
          END
        ), 0) AS received,

        COALESCE(SUM(
          CASE
            WHEN p.payment_type = 'return'
            THEN p.amount ELSE 0
          END
        ), 0) AS returned,

        COUNT(*) AS payment_count

      FROM payments p

      INNER JOIN tenancies tn
        ON tn.id = p.tenancy_id

      INNER JOIN property_units pu
        ON pu.id = tn.property_unit_id

      WHERE p.is_void = FALSE
        AND p.payment_type IN ('add', 'return')
        AND p.payment_date >= ?
        AND p.payment_date < ?
        AND (? IS NULL OR pu.house_id = ?)
      `,
      [startDate, endDate, houseId, houseId],
    );

    const balances = await getTenancyBalances(houseId, endDate);

    let dueCents = 0;
    let advanceCents = 0;

    let dueTenancies = 0;
    let advanceTenancies = 0;

    for (const row of balances) {
      const cents = toCents(row.closing_balance);

      if (cents > 0) {
        dueCents += cents;
        dueTenancies++;
      } else if (cents < 0) {
        advanceCents += Math.abs(cents);
        advanceTenancies++;
      }
    }

    const receivedCents = toCents(paymentSummary.received);
    const returnedCents = toCents(paymentSummary.returned);

    const totalUnits = Number(unitCount.total);
    const occupiedUnits = Number(occupiedCount.total);

    return res.json({
      success: true,

      data: {
        filters: {
          month,
          house_id: houseId,
        },

        property: {
          total_houses: Number(houseCount.total),
          total_units: totalUnits,
          occupied_units: occupiedUnits,
          vacant_units: Math.max(0, totalUnits - occupiedUnits),
          active_tenancies: Number(activeCount.total),
        },

        financial: {
          month_billed: toMoney(toCents(billSummary.total)),

          month_received: toMoney(receivedCents),
          month_returned: toMoney(returnedCents),

          month_net_collection: toMoney(receivedCents - returnedCents),

          payment_count: Number(paymentSummary.payment_count),

          outstanding_due: toMoney(dueCents),
          tenant_advance: toMoney(advanceCents),

          due_tenancies: dueTenancies,
          advance_tenancies: advanceTenancies,
        },
      },
    });
  } catch (error) {
    return sendError(res, error, "Dashboard overview error:");
  }
};

// ==========================================
// GET /api/dashboard/monthly-trend
// ==========================================

const getMonthlyTrend = async (req, res) => {
  try {
    const filters = parseFilters(req);

    if (filters.error) {
      return res.status(400).json({
        success: false,
        message: filters.error,
      });
    }

    const { month, houseId, endDate } = filters;

    const [year, monthNumber] = month.split("-").map(Number);

    const firstMonth = new Date(Date.UTC(year, monthNumber - 12, 1))
      .toISOString()
      .slice(0, 7);

    const startDate = `${firstMonth}-01`;

    const [billRows] = await db.query(
      `
      SELECT
        DATE_FORMAT(
          mb.billing_month, '%Y-%m'
        ) AS month,

        SUM(bi.amount) AS billed

      FROM monthly_bills mb

      INNER JOIN bill_items bi
        ON bi.monthly_bill_id = mb.id

      INNER JOIN tenancies tn
        ON tn.id = mb.tenancy_id

      INNER JOIN property_units pu
        ON pu.id = tn.property_unit_id

      WHERE mb.billing_month >= ?
        AND mb.billing_month < ?
        AND (? IS NULL OR pu.house_id = ?)

      GROUP BY DATE_FORMAT(
        mb.billing_month, '%Y-%m'
      )
      `,
      [startDate, endDate, houseId, houseId],
    );

    const [paymentRows] = await db.query(
      `
      SELECT
        DATE_FORMAT(
          p.payment_date, '%Y-%m'
        ) AS month,

        SUM(
          CASE
            WHEN p.payment_type = 'add'
            THEN p.amount ELSE 0
          END
        ) AS received,

        SUM(
          CASE
            WHEN p.payment_type = 'return'
            THEN p.amount ELSE 0
          END
        ) AS returned

      FROM payments p

      INNER JOIN tenancies tn
        ON tn.id = p.tenancy_id

      INNER JOIN property_units pu
        ON pu.id = tn.property_unit_id

      WHERE p.is_void = FALSE
        AND p.payment_type IN ('add', 'return')
        AND p.payment_date >= ?
        AND p.payment_date < ?
        AND (? IS NULL OR pu.house_id = ?)

      GROUP BY DATE_FORMAT(
        p.payment_date, '%Y-%m'
      )
      `,
      [startDate, endDate, houseId, houseId],
    );

    const billMap = new Map(billRows.map((row) => [row.month, row]));

    const paymentMap = new Map(paymentRows.map((row) => [row.month, row]));

    const months = [];

    for (let i = 11; i >= 0; i--) {
      const key = new Date(Date.UTC(year, monthNumber - 1 - i, 1))
        .toISOString()
        .slice(0, 7);

      const bill = billMap.get(key);
      const payment = paymentMap.get(key);

      const billed = toCents(bill?.billed);
      const received = toCents(payment?.received);
      const returned = toCents(payment?.returned);

      months.push({
        month: key,
        billed: toMoney(billed),
        received: toMoney(received),
        returned: toMoney(returned),
        net_collection: toMoney(received - returned),
      });
    }

    return res.json({
      success: true,
      data: {
        filters: {
          month,
          house_id: houseId,
        },
        months,
      },
    });
  } catch (error) {
    return sendError(res, error, "Monthly trend error:");
  }
};

// ==========================================
// GET /api/dashboard/outstanding
// ==========================================

const getOutstanding = async (req, res) => {
  try {
    const filters = parseFilters(req);

    if (filters.error) {
      return res.status(400).json({
        success: false,
        message: filters.error,
      });
    }

    const { month, houseId, endDate } = filters;

    const rawLimit = req.query.limit ?? "10";
    const limit = Number(rawLimit);

    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100) {
      return res.status(400).json({
        success: false,
        message: "Limit must be between 1 and 100",
      });
    }

    const balances = await getTenancyBalances(houseId, endDate);

    const outstanding = balances
      .filter((row) => row.closing_balance > 0)
      .sort((a, b) => b.closing_balance - a.closing_balance);

    return res.json({
      success: true,

      data: {
        filters: {
          month,
          house_id: houseId,
          limit,
        },

        total_count: outstanding.length,

        rows: outstanding.slice(0, limit),
      },
    });
  } catch (error) {
    return sendError(res, error, "Outstanding error:");
  }
};

module.exports = {
  getOverview,
  getMonthlyTrend,
  getOutstanding,
};
