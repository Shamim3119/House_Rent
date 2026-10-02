const db = require('../config/db');


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
                    AS vacant_units`
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
                ), 0) AS total_due`
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

                ), 0) AS current_month_collected`
        );


        return res.json({
            success: true,

            data: {
                property: {
                    total_houses:
                        Number(propertySummary.total_houses),

                    total_property_units:
                        Number(propertySummary.total_property_units),

                    active_tenancies:
                        Number(propertySummary.active_tenancies),

                    vacant_units:
                        Number(propertySummary.vacant_units)
                },

                financial: {
                    total_billed:
                        Number(financialSummary.total_billed),

                    total_paid:
                        Number(financialSummary.total_paid),

                    total_due:
                        Number(financialSummary.total_due),

                    current_month_billed:
                        Number(currentMonth.current_month_billed),

                    current_month_collected:
                        Number(currentMonth.current_month_collected)
                }
            }
        });


    } catch (error) {

        console.error(error);

        return res.status(500).json({
            success: false,
            message: 'Internal server error'
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
                pu.name ASC`
        );


        const data = rows.map(row => ({
            ...row,

            total_amount:
                Number(row.total_amount),

            paid_amount:
                Number(row.paid_amount),

            due_amount:
                Number(row.due_amount)
        }));


        return res.json({
            success: true,
            data
        });


    } catch (error) {

        console.error(error);

        return res.status(500).json({
            success: false,
            message: 'Internal server error'
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
            [tenantId]
        );


        if (tenants.length === 0) {

            return res.status(404).json({
                success: false,
                message: 'Tenant not found'
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
            [tenantId]
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
            [tenantId]
        );


        const formattedBills = bills.map(bill => ({
            ...bill,

            total_amount:
                Number(bill.total_amount),

            paid_amount:
                Number(bill.paid_amount),

            due_amount:
                Number(bill.due_amount)
        }));


        const totalBilled = formattedBills.reduce(
            (sum, bill) =>
                sum + bill.total_amount,
            0
        );


        const totalPaid = formattedBills.reduce(
            (sum, bill) =>
                sum + bill.paid_amount,
            0
        );


        const totalDue =
            totalBilled - totalPaid;


        return res.json({
            success: true,

            data: {
                tenant: tenants[0],

                summary: {
                    total_billed: totalBilled,
                    total_paid: totalPaid,
                    total_due: totalDue
                },

                tenancies,

                bills: formattedBills
            }
        });


    } catch (error) {

        console.error(error);

        return res.status(500).json({
            success: false,
            message: 'Internal server error'
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

             ORDER BY h.name ASC`
        );


        const data = rows.map(row => ({
            ...row,

            outstanding_bill_count:
                Number(row.outstanding_bill_count),

            total_billed:
                Number(row.total_billed),

            total_paid:
                Number(row.total_paid),

            total_due:
                Number(row.total_due)
        }));


        return res.json({
            success: true,
            data
        });


    } catch (error) {

        console.error(error);

        return res.status(500).json({
            success: false,
            message: 'Internal server error'
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
                message: 'Year and month are required'
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
                message: 'Invalid year'
            });
        }


        if (
            !Number.isInteger(numericMonth) ||
            numericMonth < 1 ||
            numericMonth > 12
        ) {

            return res.status(400).json({
                success: false,
                message: 'Invalid month'
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
            [
                numericYear,
                numericMonth
            ]
        );


        const formattedPayments =
            payments.map(payment => ({
                ...payment,
                amount: Number(payment.amount)
            }));


        const totalCollection =
            formattedPayments.reduce(
                (sum, payment) =>
                    sum + payment.amount,
                0
            );


        return res.json({
            success: true,

            data: {
                year: numericYear,
                month: numericMonth,

                total_collection:
                    totalCollection,

                payment_count:
                    formattedPayments.length,

                payments:
                    formattedPayments
            }
        });


    } catch (error) {

        console.error(error);

        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};


module.exports = {
    getDashboardSummary,
    getOutstandingBills,
    getTenantLedger,
    getHouseOutstanding,
    getMonthlyCollection
};