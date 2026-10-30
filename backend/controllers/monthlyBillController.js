const db = require('../config/db');


// =====================================================
// Get all monthly bills
// =====================================================
// =====================================================
// Get all monthly bills
//
// General bill history endpoint.
//
// IMPORTANT:
// Payments are now tenancy-level.
// Therefore this endpoint does NOT try to calculate
// payment/due per individual monthly bill.
//
// Use:
// /monthly-bills/register
//
// for monthly ledger/balance calculations.
// =====================================================

const getMonthlyBills = async (req, res) => {

    try {

        const [bills] = await db.query(
            `
            SELECT

                mb.id,

                mb.tenancy_id,

                DATE_FORMAT(
                    mb.billing_month,
                    '%Y-%m-%d'
                ) AS billing_month,

                CASE
                    WHEN mb.due_date IS NULL
                    THEN NULL

                    ELSE DATE_FORMAT(
                        mb.due_date,
                        '%Y-%m-%d'
                    )
                END AS due_date,

                mb.status,


                /* Tenant */

                tn.tenant_id,

                t.name AS tenant_name,

                t.phone AS tenant_phone,


                /* Property Unit */

                tn.property_unit_id,

                pu.name AS property_unit_name,


                /* House */

                pu.house_id,

                h.name AS house_name,


                /* Bill Total */

                COALESCE(
                    (
                        SELECT
                            SUM(bi.amount)

                        FROM bill_items bi

                        WHERE bi.monthly_bill_id = mb.id
                    ),
                    0
                ) AS total_amount,


                mb.created_at,

                mb.updated_at


            FROM monthly_bills mb


            INNER JOIN tenancies tn
                ON tn.id = mb.tenancy_id


            INNER JOIN tenants t
                ON t.id = tn.tenant_id


            INNER JOIN property_units pu
                ON pu.id = tn.property_unit_id


            INNER JOIN houses h
                ON h.id = pu.house_id


            ORDER BY
                mb.billing_month DESC,
                h.name ASC,
                pu.name ASC,
                t.name ASC
            `
        );


        // ---------------------------------------------
        // Convert DECIMAL to Number
        // ---------------------------------------------

        const data = bills.map((bill) => ({

            ...bill,

            total_amount:
                Number(bill.total_amount)

        }));


        return res.json({

            success: true,

            data

        });


    } catch (error) {

        console.error(
            'Get monthly bills error:',
            error
        );


        return res.status(500).json({

            success: false,

            message:
                'Failed to load monthly bills'

        });

    }

};


// =====================================================
// Get monthly bill by ID
// =====================================================
// =====================================================
// Get monthly bill by ID
//
// Used for:
// - Total amount popup
// - Individual bill preview
// - Individual bill print
//
// Balance rules:
//
// Bill    = Debit
// ADD     = Credit
// RETURN  = Debit
//
// closing_balance > 0 = Due
// closing_balance = 0 = Settled
// closing_balance < 0 = Advance
// =====================================================

const getMonthlyBillById = async (req, res) => {

    try {

        const { id } = req.params;


        // -------------------------------------------------
        // Validate ID
        // -------------------------------------------------

        const monthlyBillId = Number(id);

        if (
            !Number.isInteger(monthlyBillId) ||
            monthlyBillId <= 0
        ) {
            return res.status(400).json({
                success: false,
                message: 'Valid monthly bill ID is required'
            });
        }


        // -------------------------------------------------
        // Get bill header
        //
        // DATE_FORMAT is intentional.
        // It prevents MySQL DATE values such as 2026-04-01
        // becoming:
        //
        // 2026-03-31T18:00:00.000Z
        //
        // in the JSON response.
        // -------------------------------------------------

        const [bills] = await db.query(
            `
            SELECT

                mb.id AS monthly_bill_id,

                mb.tenancy_id,

                DATE_FORMAT(
                    mb.billing_month,
                    '%Y-%m-%d'
                ) AS billing_month,

                CASE
                    WHEN mb.due_date IS NULL
                    THEN NULL

                    ELSE DATE_FORMAT(
                        mb.due_date,
                        '%Y-%m-%d'
                    )
                END AS due_date,

                mb.status,


                /* Tenant */

                tn.tenant_id,

                t.name AS tenant_name,

                t.address AS tenant_address,

                t.phone AS tenant_phone,

                t.nid AS tenant_nid,


                /* Property Unit */

                tn.property_unit_id,

                pu.name AS property_unit_name,


                /* House */

                pu.house_id,

                h.name AS house_name,

                h.address AS house_address


            FROM monthly_bills mb


            INNER JOIN tenancies tn
                ON tn.id = mb.tenancy_id


            INNER JOIN tenants t
                ON t.id = tn.tenant_id


            INNER JOIN property_units pu
                ON pu.id = tn.property_unit_id


            INNER JOIN houses h
                ON h.id = pu.house_id


            WHERE mb.id = ?

            LIMIT 1
            `,
            [monthlyBillId]
        );


        if (bills.length === 0) {

            return res.status(404).json({
                success: false,
                message: 'Monthly bill not found'
            });

        }


        const bill = bills[0];


        // -------------------------------------------------
        // Determine month boundaries
        //
        // Example:
        //
        // billing_month = 2026-04-01
        // next_month    = 2026-05-01
        // -------------------------------------------------

        const [monthRows] = await db.query(
            `
            SELECT
                DATE_FORMAT(
                    billing_month,
                    '%Y-%m-01'
                ) AS selected_month,

                DATE_FORMAT(
                    DATE_ADD(
                        billing_month,
                        INTERVAL 1 MONTH
                    ),
                    '%Y-%m-01'
                ) AS next_month

            FROM monthly_bills

            WHERE id = ?

            LIMIT 1
            `,
            [monthlyBillId]
        );


        const selectedMonth =
            monthRows[0].selected_month;

        const nextMonth =
            monthRows[0].next_month;


        // -------------------------------------------------
        // Get bill item snapshot
        //
        // IMPORTANT:
        // We use bill_items, not current tenancy_charges.
        //
        // This preserves the actual charges that were used
        // when this monthly bill was generated.
        // -------------------------------------------------

        const [items] = await db.query(
            `
            SELECT

                bi.id,

                bi.billing_item_id,

                billing.name AS name,

                bi.amount

            FROM bill_items bi

            INNER JOIN billing_items billing
                ON billing.id = bi.billing_item_id

            WHERE bi.monthly_bill_id = ?

            ORDER BY bi.id ASC
            `,
            [monthlyBillId]
        );


        // -------------------------------------------------
        // Current bill total
        // -------------------------------------------------

        const totalAmount = items.reduce(
            (sum, item) =>
                sum + Number(item.amount),
            0
        );


        // -------------------------------------------------
        // Previous balance
        //
        // Previous Bills
        // -
        // Previous Net Payments
        //
        // Positive = Due
        // Negative = Advance
        // -------------------------------------------------

        const [previousRows] = await db.query(
            `
            SELECT

                (
                    COALESCE(
                        (
                            SELECT
                                SUM(bi.amount)

                            FROM monthly_bills mb

                            INNER JOIN bill_items bi
                                ON bi.monthly_bill_id = mb.id

                            WHERE mb.tenancy_id = ?

                              AND mb.billing_month < ?
                        ),
                        0
                    )

                    -

                    COALESCE(
                        (
                            SELECT
                                SUM(
                                    CASE

                                        WHEN p.payment_type = 'add'
                                        THEN p.amount

                                        WHEN p.payment_type = 'return'
                                        THEN -p.amount

                                        ELSE 0

                                    END
                                )

                            FROM payments p

                            WHERE p.tenancy_id = ?

                              AND p.is_void = FALSE

                              AND p.payment_date < ?
                        ),
                        0
                    )
                ) AS previous_balance
            `,
            [
                bill.tenancy_id,
                selectedMonth,

                bill.tenancy_id,
                selectedMonth
            ]
        );


        const previousBalance =
            Number(previousRows[0].previous_balance);


        // -------------------------------------------------
        // Current month payment activity
        //
        // ADD    = positive payment
        // RETURN = negative payment
        //
        // Example:
        //
        // ADD       80,000
        // RETURN     5,000
        // ----------------
        // NET       75,000
        // -------------------------------------------------

        const [paymentRows] = await db.query(
            `
            SELECT

                COALESCE(
                    SUM(
                        CASE

                            WHEN payment_type = 'add'
                            THEN amount

                            WHEN payment_type = 'return'
                            THEN -amount

                            ELSE 0

                        END
                    ),
                    0
                ) AS month_payment

            FROM payments

            WHERE tenancy_id = ?

              AND is_void = FALSE

              AND payment_date >= ?

              AND payment_date < ?
            `,
            [
                bill.tenancy_id,
                selectedMonth,
                nextMonth
            ]
        );


        const monthPayment =
            Number(paymentRows[0].month_payment);


        // -------------------------------------------------
        // Closing balance
        //
        // Previous Balance
        // +
        // Current Bill
        // -
        // Current Month Net Payment
        // -------------------------------------------------

        const closingBalance =
            previousBalance
            + totalAmount
            - monthPayment;


        // -------------------------------------------------
        // Due / Advance / Settled
        // -------------------------------------------------

        let balanceType = 'settled';

        let balanceAmount = 0;


        if (closingBalance > 0) {

            balanceType = 'due';

            balanceAmount = closingBalance;

        } else if (closingBalance < 0) {

            balanceType = 'advance';

            balanceAmount =
                Math.abs(closingBalance);

        }


        // -------------------------------------------------
        // Convert bill item amounts to numbers
        // -------------------------------------------------

        const formattedItems = items.map(
            (item) => ({
                id: item.id,
                billing_item_id:
                    item.billing_item_id,
                name:
                    item.name,
                amount:
                    Number(item.amount)
            })
        );


        // -------------------------------------------------
        // Response
        // -------------------------------------------------

        return res.json({

            success: true,

            data: {

                monthly_bill_id:
                    bill.monthly_bill_id,

                tenancy_id:
                    bill.tenancy_id,

                billing_month:
                    bill.billing_month,

                due_date:
                    bill.due_date,


                tenant: {

                    id:
                        bill.tenant_id,

                    name:
                        bill.tenant_name,

                    address:
                        bill.tenant_address,

                    phone:
                        bill.tenant_phone,

                    nid:
                        bill.tenant_nid

                },


                house: {

                    id:
                        bill.house_id,

                    name:
                        bill.house_name,

                    address:
                        bill.house_address

                },


                property_unit: {

                    id:
                        bill.property_unit_id,

                    name:
                        bill.property_unit_name

                },


                items:
                    formattedItems,


                total_amount:
                    totalAmount,

                previous_balance:
                    previousBalance,

                month_payment:
                    monthPayment,

                closing_balance:
                    closingBalance,

                balance_type:
                    balanceType,

                balance_amount:
                    balanceAmount

            }

        });


    } catch (error) {

        console.error(
            'Monthly bill details error:',
            error
        );


        return res.status(500).json({

            success: false,

            message:
                'Failed to load monthly bill details'

        });

    }

};


    // =====================================================
    // Generate monthly bill
    // =====================================================
    const generateMonthlyBill = async (req, res) => {

        let connection;

        try {

            const {
                tenancy_id,
                billing_month,
                due_date
            } = req.body;


            // ---------------------------------------------
            // Basic validation
            // ---------------------------------------------
            if (!tenancy_id) {
                return res.status(400).json({
                    success: false,
                    message: 'Tenancy is required'
                });
            }


            if (!billing_month) {
                return res.status(400).json({
                    success: false,
                    message: 'Billing month is required'
                });
            }


            // We store first day of month
            // Example input: 2026-10
            const monthPattern = /^\d{4}-(0[1-9]|1[0-2])$/;

            if (!monthPattern.test(billing_month)) {
                return res.status(400).json({
                    success: false,
                    message: 'Billing month must be in YYYY-MM format'
                });
            }


            const billingMonthDate = `${billing_month}-01`;


            // ---------------------------------------------
            // Get dedicated connection
            // ---------------------------------------------
            connection = await db.getConnection();


            // ---------------------------------------------
            // Start transaction
            // ---------------------------------------------
            await connection.beginTransaction();


            // ---------------------------------------------
            // Check tenancy
            // ---------------------------------------------
            const [tenancies] = await connection.query(
                `SELECT
                    id,
                    tenant_id,
                    property_unit_id,
                    start_date,
                    end_date,
                    status

                FROM tenancies

                WHERE id = ?
                LIMIT 1`,
                [tenancy_id]
            );


            if (tenancies.length === 0) {
                await connection.rollback();

                return res.status(400).json({
                    success: false,
                    message: 'Invalid tenancy'
                });
            }


            const tenancy = tenancies[0];


            // ---------------------------------------------
            // Check billing month falls within tenancy
            // ---------------------------------------------
            const [dateCheck] = await connection.query(
                `SELECT
                    CASE
                        WHEN ? < DATE_FORMAT(start_date, '%Y-%m-01')
                        THEN 0

                        WHEN end_date IS NOT NULL
                            AND ? > DATE_FORMAT(end_date, '%Y-%m-01')
                        THEN 0

                        ELSE 1
                    END AS valid_month

                FROM tenancies
                WHERE id = ?`,
                [
                    billingMonthDate,
                    billingMonthDate,
                    tenancy_id
                ]
            );


            if (
                dateCheck.length === 0 ||
                Number(dateCheck[0].valid_month) !== 1
            ) {
                await connection.rollback();

                return res.status(400).json({
                    success: false,
                    message: 'Billing month is outside the tenancy period'
                });
            }


            // ---------------------------------------------
            // Check duplicate monthly bill
            // ---------------------------------------------
            const [existingBills] = await connection.query(
                `SELECT id
                FROM monthly_bills
                WHERE tenancy_id = ?
                AND billing_month = ?
                LIMIT 1`,
                [
                    tenancy_id,
                    billingMonthDate
                ]
            );


            if (existingBills.length > 0) {
                await connection.rollback();

                return res.status(409).json({
                    success: false,
                    message: 'Bill already exists for this tenancy and month'
                });
            }


            // ---------------------------------------------
            // Get configured tenancy charges
            // ---------------------------------------------
            const [charges] = await connection.query(
                `SELECT
                    billing_item_id,
                    amount

                FROM tenancy_charges

                WHERE tenancy_id = ?

                ORDER BY id ASC`,
                [tenancy_id]
            );


            if (charges.length === 0) {
                await connection.rollback();

                return res.status(400).json({
                    success: false,
                    message: 'No charges are configured for this tenancy'
                });
            }


            // ---------------------------------------------
            // Create monthly bill
            // ---------------------------------------------
            const [billResult] = await connection.query(
                `INSERT INTO monthly_bills
                    (
                        tenancy_id,
                        billing_month,
                        due_date,
                        status
                    )
                VALUES (?, ?, ?, 'unpaid')`,
                [
                    tenancy_id,
                    billingMonthDate,
                    due_date || null
                ]
            );


            const monthlyBillId = billResult.insertId;


            // ---------------------------------------------
            // Copy tenancy charges into bill items
            // ---------------------------------------------
            for (const charge of charges) {

                await connection.query(
                    `INSERT INTO bill_items
                        (
                            monthly_bill_id,
                            billing_item_id,
                            amount
                        )
                    VALUES (?, ?, ?)`,
                    [
                        monthlyBillId,
                        charge.billing_item_id,
                        charge.amount
                    ]
                );
            }


            // ---------------------------------------------
            // Commit everything
            // ---------------------------------------------
            await connection.commit();


            return res.status(201).json({
                success: true,
                message: 'Monthly bill generated successfully',

                data: {
                    id: monthlyBillId,
                    tenancy_id,
                    billing_month: billingMonthDate,
                    due_date: due_date || null,
                    status: 'unpaid',
                    items: charges
                }
            });


        } catch (error) {

            console.error(error);


            if (connection) {
                try {
                    await connection.rollback();
                } catch (rollbackError) {
                    console.error('Rollback error:', rollbackError);
                }
            }


            if (error.code === 'ER_DUP_ENTRY') {
                return res.status(409).json({
                    success: false,
                    message: 'Bill already exists for this tenancy and month'
                });
            }


            return res.status(500).json({
                success: false,
                message: 'Internal server error'
            });


        } finally {

            // Return connection to pool
            if (connection) {
                connection.release();
            }
        }
    };

    // =====================================================
    // Generate monthly bills for all eligible tenancies
    //
    // POST /api/monthly-bills/generate-month
    //
    // Body:
    // {
    //     "year": 2026,
    //     "month": 5,
    //     "due_date": "2026-05-05"
    // }
    //
    // Rules:
    // - tenancy must exist during selected month
    // - existing bill = skipped
    // - no tenancy charges = skipped
    // - charges are copied into bill_items as snapshot
    // =====================================================

    const generateMonthlyBillsForMonth = async (req, res) => {

        let connection;

        try {

            const year = Number(req.body.year);
            const month = Number(req.body.month);

            const dueDate =
                req.body.due_date || null;


            // -------------------------------------------------
            // Validate year
            // -------------------------------------------------

            if (
                !Number.isInteger(year) ||
                year < 2000 ||
                year > 2100
            ) {

                return res.status(400).json({
                    success: false,
                    message: 'Valid year is required'
                });

            }


            // -------------------------------------------------
            // Validate month
            // -------------------------------------------------

            if (
                !Number.isInteger(month) ||
                month < 1 ||
                month > 12
            ) {

                return res.status(400).json({
                    success: false,
                    message: 'Valid month is required'
                });

            }


            // -------------------------------------------------
            // Selected month
            // -------------------------------------------------

            const monthString =
                String(month).padStart(2, '0');

            const billingMonthDate =
                `${year}-${monthString}-01`;


            // -------------------------------------------------
            // Default due date = 5th of selected month
            // -------------------------------------------------

            const finalDueDate =
                dueDate ||
                `${year}-${monthString}-05`;


            // -------------------------------------------------
            // Get dedicated connection
            // -------------------------------------------------

            connection = await db.getConnection();


            // -------------------------------------------------
            // Find tenancies that existed during selected month
            //
            // Example:
            // tenancy starts 2026-01-15
            // May 2026 => eligible
            //
            // tenancy ended 2026-04-30
            // May 2026 => not eligible
            //
            // We intentionally use dates, not only status,
            // because an ended tenancy can still require a
            // historical bill for a month in which it existed.
            // -------------------------------------------------

            const [tenancies] = await connection.query(
                `
                    SELECT

                        tn.id AS tenancy_id,

                        tn.tenant_id,

                        tn.property_unit_id,

                        tn.start_date,

                        tn.end_date,

                        tn.status,

                        t.name AS tenant_name,

                        pu.name AS property_unit_name,

                        h.name AS house_name

                    FROM tenancies tn

                    INNER JOIN tenants t
                        ON t.id = tn.tenant_id

                    INNER JOIN property_units pu
                        ON pu.id = tn.property_unit_id

                    INNER JOIN houses h
                        ON h.id = pu.house_id

                    WHERE

                        DATE_FORMAT(
                            tn.start_date,
                            '%Y-%m-01'
                        ) <= ?

                        AND (

                            tn.end_date IS NULL

                            OR

                            DATE_FORMAT(
                                tn.end_date,
                                '%Y-%m-01'
                            ) >= ?

                        )

                    ORDER BY
                        h.name ASC,
                        pu.name ASC,
                        t.name ASC
                `,
                [
                    billingMonthDate,
                    billingMonthDate
                ]
            );


            // -------------------------------------------------
            // Result counters
            // -------------------------------------------------

            const results = [];

            let generated = 0;
            let skipped = 0;
            let failed = 0;


            // -------------------------------------------------
            // Process each tenancy separately
            //
            // Each tenancy gets its own transaction.
            //
            // This means:
            // one bad tenancy does NOT roll back bills already
            // generated successfully for other tenants.
            // -------------------------------------------------

            for (const tenancy of tenancies) {

                try {

                    await connection.beginTransaction();


                    // -----------------------------------------
                    // Check existing bill
                    // -----------------------------------------

                    const [existingBills] =
                        await connection.query(
                            `
                                SELECT id

                                FROM monthly_bills

                                WHERE tenancy_id = ?
                                AND billing_month = ?

                                LIMIT 1
                            `,
                            [
                                tenancy.tenancy_id,
                                billingMonthDate
                            ]
                        );


                    if (existingBills.length > 0) {

                        await connection.rollback();

                        skipped++;

                        results.push({

                            tenancy_id:
                                tenancy.tenancy_id,

                            tenant_name:
                                tenancy.tenant_name,

                            house_name:
                                tenancy.house_name,

                            property_unit_name:
                                tenancy.property_unit_name,

                            status:
                                'skipped',

                            reason:
                                'Bill already exists'

                        });

                        continue;

                    }


                    // -----------------------------------------
                    // Get tenancy charges
                    // -----------------------------------------

                    const [charges] =
                        await connection.query(
                            `
                                SELECT

                                    tc.billing_item_id,

                                    tc.amount,

                                    bi.name AS billing_item_name

                                FROM tenancy_charges tc

                                INNER JOIN billing_items bi
                                    ON bi.id =
                                    tc.billing_item_id

                                WHERE tc.tenancy_id = ?

                                ORDER BY tc.id ASC
                            `,
                            [
                                tenancy.tenancy_id
                            ]
                        );


                    if (charges.length === 0) {

                        await connection.rollback();

                        skipped++;

                        results.push({

                            tenancy_id:
                                tenancy.tenancy_id,

                            tenant_name:
                                tenancy.tenant_name,

                            house_name:
                                tenancy.house_name,

                            property_unit_name:
                                tenancy.property_unit_name,

                            status:
                                'skipped',

                            reason:
                                'No charges configured'

                        });

                        continue;

                    }


                    // -----------------------------------------
                    // Create monthly bill
                    // -----------------------------------------

                    const [billResult] =
                        await connection.query(
                            `
                                INSERT INTO monthly_bills
                                (
                                    tenancy_id,
                                    billing_month,
                                    due_date,
                                    status
                                )
                                VALUES (?, ?, ?, 'unpaid')
                            `,
                            [
                                tenancy.tenancy_id,
                                billingMonthDate,
                                finalDueDate
                            ]
                        );


                    const monthlyBillId =
                        billResult.insertId;


                    // -----------------------------------------
                    // Snapshot tenancy charges
                    // -----------------------------------------

                    for (const charge of charges) {

                        await connection.query(
                            `
                                INSERT INTO bill_items
                                (
                                    monthly_bill_id,
                                    billing_item_id,
                                    amount
                                )
                                VALUES (?, ?, ?)
                            `,
                            [
                                monthlyBillId,
                                charge.billing_item_id,
                                charge.amount
                            ]
                        );

                    }


                    // -----------------------------------------
                    // Commit this tenancy
                    // -----------------------------------------

                    await connection.commit();

                    generated++;


                    results.push({

                        tenancy_id:
                            tenancy.tenancy_id,

                        monthly_bill_id:
                            monthlyBillId,

                        tenant_name:
                            tenancy.tenant_name,

                        house_name:
                            tenancy.house_name,

                        property_unit_name:
                            tenancy.property_unit_name,

                        status:
                            'generated'

                    });


                } catch (tenancyError) {

                    try {

                        await connection.rollback();

                    } catch (rollbackError) {

                        console.error(
                            'Monthly bill tenancy rollback error:',
                            rollbackError
                        );

                    }


                    console.error(
                        'Generate tenancy monthly bill error:',
                        tenancy.tenancy_id,
                        tenancyError
                    );


                    // Duplicate caused by another request/process
                    // is effectively a skip, not a failed bill.

                    if (
                        tenancyError.code ===
                        'ER_DUP_ENTRY'
                    ) {

                        skipped++;

                        results.push({

                            tenancy_id:
                                tenancy.tenancy_id,

                            tenant_name:
                                tenancy.tenant_name,

                            house_name:
                                tenancy.house_name,

                            property_unit_name:
                                tenancy.property_unit_name,

                            status:
                                'skipped',

                            reason:
                                'Bill already exists'

                        });

                        continue;

                    }


                    failed++;

                    results.push({

                        tenancy_id:
                            tenancy.tenancy_id,

                        tenant_name:
                            tenancy.tenant_name,

                        house_name:
                            tenancy.house_name,

                        property_unit_name:
                            tenancy.property_unit_name,

                        status:
                            'failed',

                        reason:
                            'Failed to generate bill'

                    });

                }

            }


            // -------------------------------------------------
            // Response
            // -------------------------------------------------

            return res.status(201).json({

                success: true,

                message:
                    'Monthly bill generation completed',

                data: {

                    year,

                    month,

                    billing_month:
                        billingMonthDate,

                    due_date:
                        finalDueDate,

                    eligible:
                        tenancies.length,

                    generated,

                    skipped,

                    failed,

                    results

                }

            });


        } catch (error) {

            console.error(
                'Generate monthly bills for month error:',
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    'Failed to generate monthly bills'

            });


        } finally {

            if (connection) {
                connection.release();
            }

        }

    };


    

    // =====================================================
    // Update bill due date
    // =====================================================
    const updateMonthlyBill = async (req, res) => {
        try {

            const { id } = req.params;
            const { due_date } = req.body;


            const [bills] = await db.query(
                `SELECT id
                FROM monthly_bills
                WHERE id = ?
                LIMIT 1`,
                [id]
            );


            if (bills.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Monthly bill not found'
                });
            }


            await db.query(
                `UPDATE monthly_bills
                SET due_date = ?
                WHERE id = ?`,
                [
                    due_date || null,
                    id
                ]
            );


            return res.json({
                success: true,
                message: 'Monthly bill updated successfully'
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
    // Delete monthly bill
    //
    // Safety rule:
    //
    // A bill can be deleted only when there are NO
    // non-void tenancy payments from the bill month onward.
    //
    // Reason:
    // Payments belong to the tenancy ledger, not directly
    // to an individual monthly bill.
    //
    // Deleting a historical bill after later payments exist
    // could silently change the tenant's running balance.
    // =====================================================

    const deleteMonthlyBill = async (req, res) => {

        let connection;

        try {

            const { id } = req.params;

            const monthlyBillId = Number(id);


            // -------------------------------------------------
            // Validate ID
            // -------------------------------------------------

            if (
                !Number.isInteger(monthlyBillId) ||
                monthlyBillId <= 0
            ) {
                return res.status(400).json({
                    success: false,
                    message: 'Valid monthly bill ID is required'
                });
            }


            // -------------------------------------------------
            // Get dedicated connection
            // -------------------------------------------------

            connection = await db.getConnection();

            await connection.beginTransaction();


            // -------------------------------------------------
            // Get bill
            // -------------------------------------------------

            const [bills] = await connection.query(
                `
                SELECT

                    id,

                    tenancy_id,

                    DATE_FORMAT(
                        billing_month,
                        '%Y-%m-01'
                    ) AS billing_month

                FROM monthly_bills

                WHERE id = ?

                LIMIT 1

                FOR UPDATE
                `,
                [monthlyBillId]
            );


            if (bills.length === 0) {

                await connection.rollback();

                return res.status(404).json({
                    success: false,
                    message: 'Monthly bill not found'
                });
            }


            const bill = bills[0];


            // -------------------------------------------------
            // Check financial activity
            //
            // Payments belong to tenancy, not monthly bill.
            //
            // If there is a non-void payment from this
            // bill month onward, deleting this bill could
            // corrupt/rewrite the historical ledger balance.
            // -------------------------------------------------

            const [payments] = await connection.query(
                `
                SELECT id

                FROM payments

                WHERE tenancy_id = ?

                AND is_void = FALSE

                AND payment_date >= ?

                LIMIT 1
                `,
                [
                    bill.tenancy_id,
                    bill.billing_month
                ]
            );


            if (payments.length > 0) {

                await connection.rollback();

                return res.status(409).json({
                    success: false,
                    message:
                        'Cannot delete this bill because payment activity exists for this tenancy from this billing month onward'
                });
            }


            // -------------------------------------------------
            // Protect bills that have adjustment history
            // -------------------------------------------------

            const [adjustments] = await connection.query(
                `
                SELECT id
                FROM monthly_bill_adjustments
                WHERE monthly_bill_id = ?
                LIMIT 1
                `,
                [monthlyBillId]
            );

            if (adjustments.length > 0) {

                await connection.rollback();

                return res.status(409).json({
                    success: false,
                    message:
                        'This monthly bill has adjustment history and cannot be deleted.'
                });

            }


            // -------------------------------------------------
            // Delete bill items
            // -------------------------------------------------

            await connection.query(
                `
                DELETE FROM bill_items

                WHERE monthly_bill_id = ?
                `,
                [monthlyBillId]
            );


            // -------------------------------------------------
            // Delete monthly bill
            // -------------------------------------------------

            await connection.query(
                `
                DELETE FROM monthly_bills

                WHERE id = ?
                `,
                [monthlyBillId]
            );


            // -------------------------------------------------
            // Commit
            // -------------------------------------------------

            await connection.commit();


            return res.json({
                success: true,
                message: 'Monthly bill deleted successfully'
            });


        } catch (error) {

            console.error(
                'Delete monthly bill error:',
                error
            );


            if (connection) {

                try {

                    await connection.rollback();

                } catch (rollbackError) {

                    console.error(
                        'Rollback error:',
                        rollbackError
                    );

                }

            }


            return res.status(500).json({
                success: false,
                message: 'Failed to delete monthly bill'
            });


        } finally {

            if (connection) {
                connection.release();
            }

        }

    };

    // =====================================================
    // Monthly Bill Register
    //
    // GET /api/monthly-bills/register?year=2026&month=10
    //
    // Balance rules:
    //
    // Bill    = Debit
    // ADD     = Credit
    // RETURN  = Debit
    //
    // closing_balance > 0  = Due
    // closing_balance = 0  = Settled
    // closing_balance < 0  = Advance
    // =====================================================

    const getMonthlyBillRegister = async (req, res) => {

        try {

            // -------------------------------------------------
            // Get year and month from query string
            // -------------------------------------------------

            const year = Number(req.query.year);
            const month = Number(req.query.month);


            // -------------------------------------------------
            // Validate year
            // -------------------------------------------------

            if (
                !Number.isInteger(year) ||
                year < 2000 ||
                year > 2100
            ) {
                return res.status(400).json({
                    success: false,
                    message: 'Valid year is required'
                });
            }


            // -------------------------------------------------
            // Validate month
            // -------------------------------------------------

            if (
                !Number.isInteger(month) ||
                month < 1 ||
                month > 12
            ) {
                return res.status(400).json({
                    success: false,
                    message: 'Valid month is required'
                });
            }


            // -------------------------------------------------
            // Selected month
            //
            // Example:
            // year  = 2026
            // month = 10
            //
            // selectedMonth = 2026-10-01
            // -------------------------------------------------

            const selectedMonth =
                `${year}-${String(month).padStart(2, '0')}-01`;


            // -------------------------------------------------
            // First day of next month
            //
            // Example:
            // selectedMonth = 2026-10-01
            // nextMonthDate = 2026-11-01
            //
            // This lets us safely use:
            //
            // payment_date >= selectedMonth
            // payment_date <  nextMonthDate
            // -------------------------------------------------

            const nextMonthObject = new Date(
                Date.UTC(year, month, 1)
            );

            const nextYear =
                nextMonthObject.getUTCFullYear();

            const nextMonthNumber =
                String(
                    nextMonthObject.getUTCMonth() + 1
                ).padStart(2, '0');

            const nextMonthDate =
                `${nextYear}-${nextMonthNumber}-01`;


            // -------------------------------------------------
            // Get monthly bill register
            // -------------------------------------------------

            const [rows] = await db.query(
                `
                SELECT

                    mb.id AS monthly_bill_id,

                    mb.tenancy_id,

                    DATE_FORMAT(
                        mb.billing_month,
                        '%Y-%m-%d'
                    ) AS billing_month,

                    CASE
                        WHEN mb.due_date IS NULL
                        THEN NULL

                        ELSE DATE_FORMAT(
                            mb.due_date,
                            '%Y-%m-%d'
                        )
                    END AS due_date,


                    /* Tenant */

                    tn.tenant_id,

                    t.name AS tenant_name,

                    t.phone AS tenant_phone,


                    /* Property Unit */

                    tn.property_unit_id,

                    pu.name AS property_unit_name,


                    /* House */

                    pu.house_id,

                    h.name AS house_name,


                    /* =========================================
                    CURRENT MONTH BILL TOTAL
                    ========================================= */

                    COALESCE(
                        (
                            SELECT
                                SUM(bi.amount)

                            FROM bill_items bi

                            WHERE bi.monthly_bill_id = mb.id
                        ),
                        0
                    ) AS total_amount,


                    /* =========================================
                    CURRENT MONTH NET PAYMENT

                    ADD:
                        money received from tenant

                    RETURN:
                        money returned to tenant

                    Example:

                        ADD       25,000
                        RETURN     5,000
                                    ------
                        Net       20,000
                    ========================================= */

                    COALESCE(
                        (
                            SELECT
                                SUM(
                                    CASE

                                        WHEN p.payment_type = 'add'
                                        THEN p.amount

                                        WHEN p.payment_type = 'return'
                                        THEN -p.amount

                                        ELSE 0

                                    END
                                )

                            FROM payments p

                            WHERE p.tenancy_id = mb.tenancy_id

                            AND p.is_void = FALSE

                            AND p.payment_date >= ?

                            AND p.payment_date < ?
                        ),
                        0
                    ) AS month_payment,


                    /* =========================================
                    PREVIOUS BALANCE

                    Everything before selected month.

                    Formula:

                    Previous Bills
                    -
                    Previous Net Payments

                    Positive = Previous Due
                    Negative = Previous Advance
                    ========================================= */

                    (
                        COALESCE(
                            (
                                SELECT
                                    SUM(bi2.amount)

                                FROM monthly_bills mb2

                                INNER JOIN bill_items bi2
                                    ON bi2.monthly_bill_id = mb2.id

                                WHERE mb2.tenancy_id =
                                    mb.tenancy_id

                                AND mb2.billing_month < ?
                            ),
                            0
                        )

                        -

                        COALESCE(
                            (
                                SELECT
                                    SUM(
                                        CASE

                                            WHEN p2.payment_type = 'add'
                                            THEN p2.amount

                                            WHEN p2.payment_type = 'return'
                                            THEN -p2.amount

                                            ELSE 0

                                        END
                                    )

                                FROM payments p2

                                WHERE p2.tenancy_id =
                                    mb.tenancy_id

                                AND p2.is_void = FALSE

                                AND p2.payment_date < ?
                            ),
                            0
                        )

                    ) AS previous_balance,


                    /* =========================================
                    CLOSING BALANCE

                    Everything through selected month.

                    Formula:

                    All Bills
                    -
                    All Net Payments

                    Positive = Due
                    Zero     = Settled
                    Negative = Advance
                    ========================================= */

                    (
                        COALESCE(
                            (
                                SELECT
                                    SUM(bi3.amount)

                                FROM monthly_bills mb3

                                INNER JOIN bill_items bi3
                                    ON bi3.monthly_bill_id = mb3.id

                                WHERE mb3.tenancy_id =
                                    mb.tenancy_id

                                AND mb3.billing_month <= ?
                            ),
                            0
                        )

                        -

                        COALESCE(
                            (
                                SELECT
                                    SUM(
                                        CASE

                                            WHEN p3.payment_type = 'add'
                                            THEN p3.amount

                                            WHEN p3.payment_type = 'return'
                                            THEN -p3.amount

                                            ELSE 0

                                        END
                                    )

                                FROM payments p3

                                WHERE p3.tenancy_id =
                                    mb.tenancy_id

                                AND p3.is_void = FALSE

                                AND p3.payment_date < ?
                            ),
                            0
                        )

                    ) AS closing_balance


                FROM monthly_bills mb


                INNER JOIN tenancies tn
                    ON tn.id = mb.tenancy_id


                INNER JOIN tenants t
                    ON t.id = tn.tenant_id


                INNER JOIN property_units pu
                    ON pu.id = tn.property_unit_id


                INNER JOIN houses h
                    ON h.id = pu.house_id


                WHERE mb.billing_month = ?


                ORDER BY

                    h.name ASC,

                    pu.name ASC,

                    t.name ASC
                `,
                [

                    // month_payment
                    selectedMonth,
                    nextMonthDate,

                    // previous bill balance
                    selectedMonth,

                    // previous payments
                    selectedMonth,

                    // bills through selected month
                    selectedMonth,

                    // payments through selected month
                    nextMonthDate,

                    // selected monthly bills
                    selectedMonth
                ]
            );


            // -------------------------------------------------
            // Convert MySQL DECIMAL strings to JavaScript numbers
            // and determine Due / Advance / Settled
            // -------------------------------------------------

            const data = rows.map((row) => {

                const totalAmount =
                    Number(row.total_amount);

                const monthPayment =
                    Number(row.month_payment);

                const previousBalance =
                    Number(row.previous_balance);

                const closingBalance =
                    Number(row.closing_balance);


                // ---------------------------------------------
                // Balance display
                // ---------------------------------------------

                let balanceType = 'settled';

                let balanceAmount = 0;


                if (closingBalance > 0) {

                    balanceType = 'due';

                    balanceAmount =
                        closingBalance;

                } else if (closingBalance < 0) {

                    balanceType = 'advance';

                    balanceAmount =
                        Math.abs(closingBalance);

                }


                // ---------------------------------------------
                // Return clean API row
                // ---------------------------------------------

                return {

                    monthly_bill_id:
                        row.monthly_bill_id,

                    tenancy_id:
                        row.tenancy_id,

                    billing_month:
                        row.billing_month,

                    due_date:
                        row.due_date,


                    tenant_id:
                        row.tenant_id,

                    tenant_name:
                        row.tenant_name,

                    tenant_phone:
                        row.tenant_phone,


                    property_unit_id:
                        row.property_unit_id,

                    property_unit_name:
                        row.property_unit_name,


                    house_id:
                        row.house_id,

                    house_name:
                        row.house_name,


                    total_amount:
                        totalAmount,

                    month_payment:
                        monthPayment,

                    previous_balance:
                        previousBalance,

                    closing_balance:
                        closingBalance,

                    balance_type:
                        balanceType,

                    balance_amount:
                        balanceAmount
                };

            });


            // -------------------------------------------------
            // Response
            // -------------------------------------------------

            return res.json({

                success: true,

                filters: {
                    year,
                    month
                },

                data
            });


        } catch (error) {

            console.error(
                'Monthly bill register error:',
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    'Failed to load monthly bill register'

            });

        }

    };



    // =====================================================
    // Adjust Monthly Bill
    //
    // PUT /api/monthly-bills/:id/adjust
    //
    // Body:
    // {
    //     "reason": "Service charge correction",
    //     "items": [
    //         {
    //             "billing_item_id": 1,
    //             "amount": 18000
    //         },
    //         {
    //             "billing_item_id": 4,
    //             "amount": 975
    //         },
    //         {
    //             "billing_item_id": 5,
    //             "amount": 4500
    //         }
    //     ]
    // }
    //
    // IMPORTANT:
    //
    // - Updates bill_items snapshot only.
    // - Does NOT update tenancy_charges.
    // - Records changed amounts in monthly_bill_adjustments.
    // - Blocks adjustment if non-void payment activity exists
    //   from this bill month onward.
    // =====================================================

    const adjustMonthlyBill = async (req, res) => {

        let connection;

        try {

            const monthlyBillId =
                Number(req.params.id);

            const {
                reason,
                items
            } = req.body;


            // -------------------------------------------------
            // Validate monthly bill ID
            // -------------------------------------------------

            if (
                !Number.isInteger(monthlyBillId) ||
                monthlyBillId <= 0
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        'Valid monthly bill ID is required'
                });

            }


            // -------------------------------------------------
            // Validate reason
            // -------------------------------------------------

            if (
                !reason ||
                typeof reason !== 'string' ||
                reason.trim().length === 0
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        'Adjustment reason is required'
                });

            }


            if (reason.trim().length > 255) {

                return res.status(400).json({
                    success: false,
                    message:
                        'Adjustment reason cannot exceed 255 characters'
                });

            }


            // -------------------------------------------------
            // Validate items
            // -------------------------------------------------

            if (
                !Array.isArray(items) ||
                items.length === 0
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        'At least one bill item is required'
                });

            }


            // -------------------------------------------------
            // Validate each submitted item
            // -------------------------------------------------

            const submittedItems = [];

            const billingItemIds = new Set();


            for (const item of items) {

                const billingItemId =
                    Number(item.billing_item_id);

                const amount =
                    Number(item.amount);


                if (
                    !Number.isInteger(billingItemId) ||
                    billingItemId <= 0
                ) {

                    return res.status(400).json({
                        success: false,
                        message:
                            'Every billing item must have a valid billing_item_id'
                    });

                }


                if (
                    !Number.isFinite(amount) ||
                    amount < 0
                ) {

                    return res.status(400).json({
                        success: false,
                        message:
                            'Every bill item amount must be zero or greater'
                    });

                }


                // Do not allow duplicate billing items
                // in the same request.

                if (
                    billingItemIds.has(
                        billingItemId
                    )
                ) {

                    return res.status(400).json({
                        success: false,
                        message:
                            'Duplicate billing items are not allowed'
                    });

                }


                billingItemIds.add(
                    billingItemId
                );


                submittedItems.push({

                    billing_item_id:
                        billingItemId,

                    amount

                });

            }


            // -------------------------------------------------
            // Get dedicated connection
            // -------------------------------------------------

            connection =
                await db.getConnection();


            await connection.beginTransaction();


            // -------------------------------------------------
            // Lock monthly bill
            // -------------------------------------------------

            const [bills] =
                await connection.query(
                    `
                        SELECT

                            id,

                            tenancy_id,

                            DATE_FORMAT(
                                billing_month,
                                '%Y-%m-01'
                            ) AS billing_month

                        FROM monthly_bills

                        WHERE id = ?

                        LIMIT 1

                        FOR UPDATE
                    `,
                    [
                        monthlyBillId
                    ]
                );


            if (bills.length === 0) {

                await connection.rollback();

                return res.status(404).json({
                    success: false,
                    message:
                        'Monthly bill not found'
                });

            }


            const bill =
                bills[0];


            // -------------------------------------------------
            // Payment safety check
            //
            // Payments are tenancy-level.
            //
            // If payment activity exists from this month
            // onward, changing this bill would rewrite the
            // historical running balance.
            // -------------------------------------------------

            const [payments] =
                await connection.query(
                    `
                        SELECT id

                        FROM payments

                        WHERE tenancy_id = ?

                        AND is_void = FALSE

                        AND payment_date >= ?

                        LIMIT 1
                    `,
                    [
                        bill.tenancy_id,
                        bill.billing_month
                    ]
                );


            if (payments.length > 0) {

                await connection.rollback();

                return res.status(409).json({
                    success: false,
                    message:
                        'Cannot adjust this bill because payment activity exists for this tenancy from this billing month onward'
                });

            }


            // -------------------------------------------------
            // Get current bill items
            // -------------------------------------------------

            const [currentItems] =
                await connection.query(
                    `
                        SELECT

                            id,

                            billing_item_id,

                            amount

                        FROM bill_items

                        WHERE monthly_bill_id = ?

                        ORDER BY id ASC

                        FOR UPDATE
                    `,
                    [
                        monthlyBillId
                    ]
                );


            if (currentItems.length === 0) {

                await connection.rollback();

                return res.status(400).json({
                    success: false,
                    message:
                        'This monthly bill has no bill items'
                });

            }


            // -------------------------------------------------
            // IMPORTANT:
            //
            // For first version of Adjust, the frontend must
            // submit the SAME billing items that already exist.
            //
            // We allow amount changes only.
            //
            // Adding/removing billing items can be implemented
            // separately later.
            // -------------------------------------------------

            if (
                submittedItems.length !==
                currentItems.length
            ) {

                await connection.rollback();

                return res.status(400).json({
                    success: false,
                    message:
                        'The submitted billing items do not match the existing monthly bill'
                });

            }


            const currentItemMap =
                new Map();


            for (const item of currentItems) {

                currentItemMap.set(
                    Number(item.billing_item_id),
                    item
                );

            }


            for (
                const submittedItem
                of submittedItems
            ) {

                if (
                    !currentItemMap.has(
                        submittedItem.billing_item_id
                    )
                ) {

                    await connection.rollback();

                    return res.status(400).json({
                        success: false,
                        message:
                            'The submitted billing items do not match the existing monthly bill'
                    });

                }

            }


            // -------------------------------------------------
            // Apply changes
            // -------------------------------------------------

            const changes = [];


            for (
                const submittedItem
                of submittedItems
            ) {

                const currentItem =
                    currentItemMap.get(
                        submittedItem.billing_item_id
                    );


                const oldAmount =
                    Number(currentItem.amount);

                const newAmount =
                    Number(submittedItem.amount);


                // ---------------------------------------------
                // No change
                // ---------------------------------------------

                if (oldAmount === newAmount) {
                    continue;
                }


                // ---------------------------------------------
                // Record adjustment history FIRST
                // ---------------------------------------------

                await connection.query(
                    `
                        INSERT INTO monthly_bill_adjustments
                        (
                            monthly_bill_id,
                            billing_item_id,
                            old_amount,
                            new_amount,
                            reason
                        )
                        VALUES (?, ?, ?, ?, ?)
                    `,
                    [
                        monthlyBillId,
                        submittedItem.billing_item_id,
                        oldAmount,
                        newAmount,
                        reason.trim()
                    ]
                );


                // ---------------------------------------------
                // Update bill snapshot
                // ---------------------------------------------

                await connection.query(
                    `
                        UPDATE bill_items

                        SET amount = ?

                        WHERE id = ?
                    `,
                    [
                        newAmount,
                        currentItem.id
                    ]
                );


                changes.push({

                    billing_item_id:
                        submittedItem.billing_item_id,

                    old_amount:
                        oldAmount,

                    new_amount:
                        newAmount

                });

            }


            // -------------------------------------------------
            // Nothing actually changed
            // -------------------------------------------------

            if (changes.length === 0) {

                await connection.rollback();

                return res.status(400).json({
                    success: false,
                    message:
                        'No bill item amounts were changed'
                });

            }


            // -------------------------------------------------
            // Calculate new bill total
            // -------------------------------------------------

            const [totalRows] =
                await connection.query(
                    `
                        SELECT

                            COALESCE(
                                SUM(amount),
                                0
                            ) AS total_amount

                        FROM bill_items

                        WHERE monthly_bill_id = ?
                    `,
                    [
                        monthlyBillId
                    ]
                );


            const newTotal =
                Number(
                    totalRows[0].total_amount
                );


            // -------------------------------------------------
            // Commit
            // -------------------------------------------------

            await connection.commit();


            return res.json({

                success: true,

                message:
                    'Monthly bill adjusted successfully',

                data: {

                    monthly_bill_id:
                        monthlyBillId,

                    tenancy_id:
                        bill.tenancy_id,

                    billing_month:
                        bill.billing_month,

                    reason:
                        reason.trim(),

                    changes,

                    total_amount:
                        newTotal

                }

            });


        } catch (error) {

            console.error(
                'Adjust monthly bill error:',
                error
            );


            if (connection) {

                try {

                    await connection.rollback();

                } catch (rollbackError) {

                    console.error(
                        'Adjustment rollback error:',
                        rollbackError
                    );

                }

            }


            return res.status(500).json({

                success: false,

                message:
                    'Failed to adjust monthly bill'

            });


        } finally {

            if (connection) {
                connection.release();
            }

        }

    };


    // =====================================================
    // Get Monthly Bill Adjustment History
    //
    // GET /api/monthly-bills/:id/adjustments
    // =====================================================

    const getMonthlyBillAdjustments = async (req, res) => {

        try {

            const monthlyBillId =
                Number(req.params.id);


            // -------------------------------------------------
            // Validate ID
            // -------------------------------------------------

            if (
                !Number.isInteger(monthlyBillId) ||
                monthlyBillId <= 0
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        'Valid monthly bill ID is required'
                });

            }


            // -------------------------------------------------
            // Check monthly bill exists
            // -------------------------------------------------

            const [bills] = await db.query(
                `
                    SELECT id

                    FROM monthly_bills

                    WHERE id = ?

                    LIMIT 1
                `,
                [
                    monthlyBillId
                ]
            );


            if (bills.length === 0) {

                return res.status(404).json({
                    success: false,
                    message:
                        'Monthly bill not found'
                });

            }


            // -------------------------------------------------
            // Load adjustment history
            // -------------------------------------------------

            const [adjustments] = await db.query(
                `
                    SELECT

                        mba.id,

                        mba.monthly_bill_id,

                        mba.billing_item_id,

                        bi.name AS billing_item_name,

                        mba.old_amount,

                        mba.new_amount,

                        mba.reason,

                        mba.created_at

                    FROM monthly_bill_adjustments mba

                    INNER JOIN billing_items bi
                        ON bi.id = mba.billing_item_id

                    WHERE mba.monthly_bill_id = ?

                    ORDER BY
                        mba.created_at DESC,
                        mba.id DESC
                `,
                [
                    monthlyBillId
                ]
            );


            // -------------------------------------------------
            // Convert DECIMAL strings to numbers
            // -------------------------------------------------

            const data = adjustments.map(
                (item) => ({

                    id:
                        item.id,

                    monthly_bill_id:
                        item.monthly_bill_id,

                    billing_item_id:
                        item.billing_item_id,

                    billing_item_name:
                        item.billing_item_name,

                    old_amount:
                        Number(item.old_amount),

                    new_amount:
                        Number(item.new_amount),

                    reason:
                        item.reason,

                    created_at:
                        item.created_at,

                })
            );


            return res.json({

                success: true,

                data

            });


        } catch (error) {

            console.error(
                'Get monthly bill adjustments error:',
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    'Failed to load monthly bill adjustment history'

            });

        }

    };

module.exports = {
    getMonthlyBills,
    getMonthlyBillById,
    getMonthlyBillRegister,
    generateMonthlyBill,
    generateMonthlyBillsForMonth,

    adjustMonthlyBill,
    getMonthlyBillAdjustments,

    updateMonthlyBill,
    deleteMonthlyBill,

};