const db = require("../config/db");

/* =========================================================
   GET ALL PAYMENTS
========================================================= */

const getPayments = async (req, res) => {
  try {
    const [rows] = await db.query(`
            SELECT
                p.id,
                p.tenancy_id,
                p.payment_type,
                p.amount,
                p.payment_date,
                p.reference_no,
                p.note,
                p.is_void,
                p.voided_at,
                p.void_reason,
                p.created_at,
                p.updated_at,

                t.tenant_id,
                t.property_unit_id,
                t.status AS tenancy_status,

                tn.name AS tenant_name,
                tn.phone AS tenant_phone,

                pu.name AS property_unit_name,

                h.id AS house_id,
                h.name AS house_name

            FROM payments p

            INNER JOIN tenancies t
                ON t.id = p.tenancy_id

            INNER JOIN tenants tn
                ON tn.id = t.tenant_id

            INNER JOIN property_units pu
                ON pu.id = t.property_unit_id

            INNER JOIN houses h
                ON h.id = pu.house_id

            ORDER BY
                p.payment_date DESC,
                p.id DESC
        `);

    return res.json({
      success: true,
      data: rows,
    });
  } catch (error) {
    console.error("Get payments error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load payments.",
    });
  }
};

/* =========================================================
   GET PAYMENTS BY TENANCY
========================================================= */

const getPaymentsByTenancy = async (req, res) => {
  try {
    const tenancyId = Number(req.params.tenancyId);

    if (!Number.isInteger(tenancyId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid tenancy ID.",
      });
    }

    const [rows] = await db.query(
      `
            SELECT
                id,
                tenancy_id,
                payment_type,
                amount,
                payment_date,
                reference_no,
                note,
                is_void,
                voided_at,
                void_reason,
                created_at,
                updated_at

            FROM payments

            WHERE tenancy_id = ?

            ORDER BY
                payment_date ASC,
                id ASC
        `,
      [tenancyId],
    );

    return res.json({
      success: true,
      data: rows,
    });
  } catch (error) {
    console.error("Get tenancy payments error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load tenancy payments.",
    });
  }
};

/* =========================================================
   GET SINGLE PAYMENT
========================================================= */

const getPaymentById = async (req, res) => {
  try {
    const paymentId = Number(req.params.id);

    if (!Number.isInteger(paymentId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment ID.",
      });
    }

    const [rows] = await db.query(
      `
            SELECT
                p.*,

                t.tenant_id,
                t.property_unit_id,

                tn.name AS tenant_name,
                tn.phone AS tenant_phone,

                pu.name AS property_unit_name,

                h.id AS house_id,
                h.name AS house_name

            FROM payments p

            INNER JOIN tenancies t
                ON t.id = p.tenancy_id

            INNER JOIN tenants tn
                ON tn.id = t.tenant_id

            INNER JOIN property_units pu
                ON pu.id = t.property_unit_id

            INNER JOIN houses h
                ON h.id = pu.house_id

            WHERE p.id = ?

            LIMIT 1
        `,
      [paymentId],
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Payment not found.",
      });
    }

    return res.json({
      success: true,
      data: rows[0],
    });
  } catch (error) {
    console.error("Get payment error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load payment.",
    });
  }
};

/* =========================================================
   CREATE PAYMENT
========================================================= */

const createPayment = async (req, res) => {
  try {
    const {
      tenancy_id,
      payment_type = "add",
      amount,
      payment_date,
      reference_no,
      note,
    } = req.body;

    /* ---------------------------------------------
           TENANCY
        --------------------------------------------- */

    const tenancyId = Number(tenancy_id);

    if (!Number.isInteger(tenancyId)) {
      return res.status(400).json({
        success: false,
        message: "Valid tenancy is required.",
      });
    }

    /* ---------------------------------------------
           TYPE
        --------------------------------------------- */

    if (payment_type !== "add" && payment_type !== "return") {
      return res.status(400).json({
        success: false,
        message: "Payment type must be add or return.",
      });
    }

    /* ---------------------------------------------
           AMOUNT
        --------------------------------------------- */

    const paymentAmount = Number(amount);

    if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Payment amount must be greater than zero.",
      });
    }

    /* ---------------------------------------------
           DATE
        --------------------------------------------- */

    if (!payment_date) {
      return res.status(400).json({
        success: false,
        message: "Payment date is required.",
      });
    }

    const [dateCheck] = await db.query(
      `
            SELECT
                CASE
                    WHEN ? > NOW() THEN 1
                    ELSE 0
                END AS is_future
        `,
      [payment_date],
    );

    if (dateCheck[0].is_future) {
      return res.status(400).json({
        success: false,
        message:
          "Payment date cannot be greater than the current date and time.",
      });
    }

    /* ---------------------------------------------
           CHECK TENANCY
        --------------------------------------------- */

    const [tenancies] = await db.query(
      `
            SELECT
                id,
                status,
                start_date,
                end_date
            FROM tenancies
            WHERE id = ?
            LIMIT 1
        `,
      [tenancyId],
    );

    if (tenancies.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Tenancy not found.",
      });
    }

    const [tenancyDateCheck] = await db.query(
      `
            SELECT
                CASE
                    WHEN DATE(?) < DATE(?) THEN 1
                    ELSE 0
                END AS before_start
        `,
      [payment_date, tenancies[0].start_date],
    );

    if (tenancyDateCheck[0].before_start) {
      return res.status(400).json({
        success: false,
        message: "Payment date cannot be earlier than the tenancy start date.",
      });
    }

    /*
     * Notice:
     *
     * We DO NOT prevent an ADD payment greater than
     * the current due.
     *
     * Extra money becomes advance/credit.
     */

    /* ---------------------------------------------
           INSERT
        --------------------------------------------- */

    const [result] = await db.query(
      `
            INSERT INTO payments (
                tenancy_id,
                payment_type,
                amount,
                payment_date,
                reference_no,
                note
            )
            VALUES (?, ?, ?, ?, ?, ?)
        `,
      [
        tenancyId,
        payment_type,
        paymentAmount,
        payment_date,
        reference_no?.trim() || null,
        note?.trim() || null,
      ],
    );

    return res.status(201).json({
      success: true,
      message:
        payment_type === "add"
          ? "Payment added successfully."
          : "Return added successfully.",
      data: {
        id: result.insertId,
      },
    });
  } catch (error) {
    console.error("Create payment error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to save payment.",
    });
  }
};

/* =========================================================
   VOID PAYMENT

   Financial records are not deleted.
========================================================= */

const voidPayment = async (req, res) => {
  const paymentId = Number(req.params.id);
  const voidReason = req.body?.void_reason;
  const userId = Number(req.user?.userId);

  if (!Number.isSafeInteger(paymentId) || paymentId <= 0) {
    return res.status(400).json({
      success: false,
      message: "Invalid payment ID.",
    });
  }

  if (
    typeof voidReason !== "string" ||
    !voidReason.trim() ||
    voidReason.trim().length > 255
  ) {
    return res.status(400).json({
      success: false,
      message: "Void reason must be between 1 and 255 characters.",
    });
  }

  if (!Number.isSafeInteger(userId) || userId <= 0) {
    return res.status(401).json({
      success: false,
      message: "Valid administrator authentication is required.",
    });
  }

  let connection;

  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    const [users] = await connection.query(
      `
            SELECT id
            FROM users
            WHERE id = ?
              AND is_active = 1
            LIMIT 1
        `,
      [userId],
    );

    if (!users.length) {
      await connection.rollback();
      return res.status(403).json({
        success: false,
        message: "Administrator account is not active or does not exist.",
      });
    }

    const [payments] = await connection.query(
      `
            SELECT id, is_void
            FROM payments
            WHERE id = ?
            FOR UPDATE
        `,
      [paymentId],
    );

    if (!payments.length) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: "Payment not found.",
      });
    }

    if (payments[0].is_void) {
      await connection.rollback();
      return res.status(409).json({
        success: false,
        message: "Payment is already void.",
      });
    }

    await connection.query(
      `
            UPDATE payments
            SET
                is_void = 1,
                voided_at = NOW(),
                void_reason = ?,
                voided_by = ?
            WHERE id = ?
              AND is_void = 0
        `,
      [voidReason.trim(), userId, paymentId],
    );

    await connection.commit();

    return res.json({
      success: true,
      message: "Payment voided successfully.",
      data: {
        payment_id: paymentId,
        voided_by: userId,
      },
    });
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }

    console.error("Void payment error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to void payment.",
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

/* =========================================================
   TENANCY LEDGER SUMMARY

   Balance:
       bills
       + returns
       - add payments

   Positive = Due
   Negative = Advance
========================================================= */

const getTenancyBalance = async (req, res) => {
  try {
    const tenancyId = Number(req.params.tenancyId);

    if (!Number.isInteger(tenancyId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid tenancy ID.",
      });
    }

    /* ---------------------------------------------
           CHECK TENANCY
        --------------------------------------------- */

    const [tenancies] = await db.query(
      `
            SELECT
                t.id,
                t.status,

                tn.name AS tenant_name,

                pu.name AS property_unit_name,

                h.name AS house_name

            FROM tenancies t

            INNER JOIN tenants tn
                ON tn.id = t.tenant_id

            INNER JOIN property_units pu
                ON pu.id = t.property_unit_id

            INNER JOIN houses h
                ON h.id = pu.house_id

            WHERE t.id = ?

            LIMIT 1
        `,
      [tenancyId],
    );

    if (tenancies.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Tenancy not found.",
      });
    }

    /* ---------------------------------------------
           TOTAL BILLS

           We calculate from bill_items so the amount is
           based on the historical bill snapshot.
        --------------------------------------------- */

    const [billRows] = await db.query(
      `
            SELECT
                COALESCE(
                    SUM(bi.amount),
                    0
                ) AS total_billed

            FROM monthly_bills mb

            INNER JOIN bill_items bi
                ON bi.monthly_bill_id = mb.id

            WHERE mb.tenancy_id = ?
        `,
      [tenancyId],
    );

    /* ---------------------------------------------
           PAYMENT TOTALS

           VOID transactions do not count.
        --------------------------------------------- */

    const [paymentRows] = await db.query(
      `
            SELECT

                COALESCE(
                    SUM(
                        CASE
                            WHEN payment_type = 'add'
                            THEN amount
                            ELSE 0
                        END
                    ),
                    0
                ) AS total_added,

                COALESCE(
                    SUM(
                        CASE
                            WHEN payment_type = 'return'
                            THEN amount
                            ELSE 0
                        END
                    ),
                    0
                ) AS total_returned

            FROM payments

            WHERE tenancy_id = ?
              AND is_void = FALSE
        `,
      [tenancyId],
    );

    const totalBilled = Number(billRows[0].total_billed);

    const totalAdded = Number(paymentRows[0].total_added);

    const totalReturned = Number(paymentRows[0].total_returned);

    const balance = totalBilled + totalReturned - totalAdded;

    let balanceType = "settled";
    let displayAmount = 0;

    if (balance > 0) {
      balanceType = "due";
      displayAmount = balance;
    } else if (balance < 0) {
      balanceType = "advance";
      displayAmount = Math.abs(balance);
    }

    return res.json({
      success: true,

      data: {
        tenancy: tenancies[0],

        total_billed: totalBilled,

        total_added: totalAdded,

        total_returned: totalReturned,

        net_payment: totalAdded - totalReturned,

        balance,

        balance_type: balanceType,

        display_amount: displayAmount,
      },
    });
  } catch (error) {
    console.error("Get tenancy balance error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to calculate tenancy balance.",
    });
  }
};

const getVoidHistory = async (req, res) => {
  try {
    const [rows] = await db.query(`
            SELECT
                p.id,
                p.tenancy_id,
                p.payment_type,
                p.amount,
                p.payment_date,
                p.reference_no,
                p.note,
                p.voided_at,
                p.void_reason,
                p.voided_by,

                u.name AS voided_by_name,

                tn.name AS tenant_name,
                pu.name AS property_unit_name,
                h.id AS house_id,
                h.name AS house_name

            FROM payments p

            INNER JOIN tenancies t
                ON t.id = p.tenancy_id

            INNER JOIN tenants tn
                ON tn.id = t.tenant_id

            INNER JOIN property_units pu
                ON pu.id = t.property_unit_id

            INNER JOIN houses h
                ON h.id = pu.house_id

            LEFT JOIN users u
                ON u.id = p.voided_by

            WHERE p.is_void = 1

            ORDER BY
                p.voided_at DESC,
                p.id DESC
        `);

    return res.json({
      success: true,
      count: rows.length,
      data: rows,
    });
  } catch (error) {
    console.error("Get void history error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load void history.",
    });
  }
};

module.exports = {
  getPayments,
  getPaymentsByTenancy,
  getPaymentById,
  createPayment,
  voidPayment,
  getTenancyBalance,
  getVoidHistory,
};
