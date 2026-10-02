const db = require('../config/db');


// =====================================================
// Get all tenancy charges
// =====================================================
const getTenancyCharges = async (req, res) => {
    try {
        const [charges] = await db.query(
            `SELECT
                tc.id,

                tc.tenancy_id,

                tn.tenant_id,
                t.name AS tenant_name,

                tn.property_unit_id,
                pu.name AS property_unit_name,

                pu.house_id,
                h.name AS house_name,

                tc.billing_item_id,
                bi.name AS billing_item_name,

                tc.amount,

                tc.created_at,
                tc.updated_at

             FROM tenancy_charges tc

             INNER JOIN tenancies tn
                ON tn.id = tc.tenancy_id

             INNER JOIN tenants t
                ON t.id = tn.tenant_id

             INNER JOIN property_units pu
                ON pu.id = tn.property_unit_id

             INNER JOIN houses h
                ON h.id = pu.house_id

             INNER JOIN billing_items bi
                ON bi.id = tc.billing_item_id

             ORDER BY tc.id DESC`
        );

        return res.json({
            success: true,
            data: charges
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
// Get tenancy charge by ID
// =====================================================
const getTenancyChargeById = async (req, res) => {
    try {
        const { id } = req.params;

        const [charges] = await db.query(
            `SELECT
                tc.id,

                tc.tenancy_id,

                tn.tenant_id,
                t.name AS tenant_name,

                tn.property_unit_id,
                pu.name AS property_unit_name,

                pu.house_id,
                h.name AS house_name,

                tc.billing_item_id,
                bi.name AS billing_item_name,

                tc.amount,

                tc.created_at,
                tc.updated_at

             FROM tenancy_charges tc

             INNER JOIN tenancies tn
                ON tn.id = tc.tenancy_id

             INNER JOIN tenants t
                ON t.id = tn.tenant_id

             INNER JOIN property_units pu
                ON pu.id = tn.property_unit_id

             INNER JOIN houses h
                ON h.id = pu.house_id

             INNER JOIN billing_items bi
                ON bi.id = tc.billing_item_id

             WHERE tc.id = ?
             LIMIT 1`,
            [id]
        );

        if (charges.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Tenancy charge not found'
            });
        }

        return res.json({
            success: true,
            data: charges[0]
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
// Get charges for one tenancy
// =====================================================
const getChargesByTenancy = async (req, res) => {
    try {
        const { tenancyId } = req.params;

        const [charges] = await db.query(
            `SELECT
                tc.id,
                tc.tenancy_id,

                tc.billing_item_id,
                bi.name AS billing_item_name,

                tc.amount,

                tc.created_at,
                tc.updated_at

             FROM tenancy_charges tc

             INNER JOIN billing_items bi
                ON bi.id = tc.billing_item_id

             WHERE tc.tenancy_id = ?

             ORDER BY bi.name ASC`,
            [tenancyId]
        );

        return res.json({
            success: true,
            data: charges
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
// Create tenancy charge
// =====================================================
const createTenancyCharge = async (req, res) => {
    try {
        const {
            tenancy_id,
            billing_item_id,
            amount
        } = req.body;


        // Validation
        if (!tenancy_id) {
            return res.status(400).json({
                success: false,
                message: 'Tenancy is required'
            });
        }

        if (!billing_item_id) {
            return res.status(400).json({
                success: false,
                message: 'Billing item is required'
            });
        }

        if (
            amount === undefined ||
            amount === null ||
            amount === ''
        ) {
            return res.status(400).json({
                success: false,
                message: 'Amount is required'
            });
        }


        const chargeAmount = Number(amount);

        if (
            !Number.isFinite(chargeAmount) ||
            chargeAmount < 0
        ) {
            return res.status(400).json({
                success: false,
                message: 'Amount must be a valid non-negative number'
            });
        }


        // Check tenancy exists
        const [tenancies] = await db.query(
            `SELECT id, status
             FROM tenancies
             WHERE id = ?
             LIMIT 1`,
            [tenancy_id]
        );

        if (tenancies.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid tenancy'
            });
        }


        // Only active tenancy should receive new charge setup
        if (tenancies[0].status !== 'active') {
            return res.status(409).json({
                success: false,
                message: 'Cannot add charges to an ended tenancy'
            });
        }


        // Check billing item exists
        const [billingItems] = await db.query(
            `SELECT id
             FROM billing_items
             WHERE id = ?
             LIMIT 1`,
            [billing_item_id]
        );

        if (billingItems.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid billing item'
            });
        }


        // Check duplicate charge
        const [existingCharges] = await db.query(
            `SELECT id
             FROM tenancy_charges
             WHERE tenancy_id = ?
             AND billing_item_id = ?
             LIMIT 1`,
            [
                tenancy_id,
                billing_item_id
            ]
        );

        if (existingCharges.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'This billing item is already assigned to this tenancy'
            });
        }


        // Insert
        const [result] = await db.query(
            `INSERT INTO tenancy_charges
                (
                    tenancy_id,
                    billing_item_id,
                    amount
                )
             VALUES (?, ?, ?)`,
            [
                tenancy_id,
                billing_item_id,
                chargeAmount
            ]
        );


        return res.status(201).json({
            success: true,
            message: 'Tenancy charge created successfully',
            data: {
                id: result.insertId,
                tenancy_id,
                billing_item_id,
                amount: chargeAmount
            }
        });

    } catch (error) {
        console.error(error);

        // Duplicate protection from database
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({
                success: false,
                message: 'This billing item is already assigned to this tenancy'
            });
        }

        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};


// =====================================================
// Update tenancy charge
// =====================================================
const updateTenancyCharge = async (req, res) => {
    try {
        const { id } = req.params;

        const {
            billing_item_id,
            amount
        } = req.body;


        if (!billing_item_id) {
            return res.status(400).json({
                success: false,
                message: 'Billing item is required'
            });
        }

        if (
            amount === undefined ||
            amount === null ||
            amount === ''
        ) {
            return res.status(400).json({
                success: false,
                message: 'Amount is required'
            });
        }


        const chargeAmount = Number(amount);

        if (
            !Number.isFinite(chargeAmount) ||
            chargeAmount < 0
        ) {
            return res.status(400).json({
                success: false,
                message: 'Amount must be a valid non-negative number'
            });
        }


        // Check current charge
        const [charges] = await db.query(
            `SELECT
                tc.id,
                tc.tenancy_id,
                tn.status
             FROM tenancy_charges tc

             INNER JOIN tenancies tn
                ON tn.id = tc.tenancy_id

             WHERE tc.id = ?
             LIMIT 1`,
            [id]
        );

        if (charges.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Tenancy charge not found'
            });
        }


        const currentCharge = charges[0];


        if (currentCharge.status !== 'active') {
            return res.status(409).json({
                success: false,
                message: 'Cannot modify charges for an ended tenancy'
            });
        }


        // Check billing item exists
        const [billingItems] = await db.query(
            `SELECT id
             FROM billing_items
             WHERE id = ?
             LIMIT 1`,
            [billing_item_id]
        );

        if (billingItems.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid billing item'
            });
        }


        // Check duplicate
        const [existingCharges] = await db.query(
            `SELECT id
             FROM tenancy_charges
             WHERE tenancy_id = ?
             AND billing_item_id = ?
             AND id <> ?
             LIMIT 1`,
            [
                currentCharge.tenancy_id,
                billing_item_id,
                id
            ]
        );

        if (existingCharges.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'This billing item is already assigned to this tenancy'
            });
        }


        // Update
        await db.query(
            `UPDATE tenancy_charges
             SET
                billing_item_id = ?,
                amount = ?
             WHERE id = ?`,
            [
                billing_item_id,
                chargeAmount,
                id
            ]
        );


        return res.json({
            success: true,
            message: 'Tenancy charge updated successfully'
        });

    } catch (error) {
        console.error(error);

        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({
                success: false,
                message: 'This billing item is already assigned to this tenancy'
            });
        }

        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};


// =====================================================
// Delete tenancy charge
// =====================================================
const deleteTenancyCharge = async (req, res) => {
    try {
        const { id } = req.params;


        const [charges] = await db.query(
            `SELECT
                tc.id,
                tn.status
             FROM tenancy_charges tc

             INNER JOIN tenancies tn
                ON tn.id = tc.tenancy_id

             WHERE tc.id = ?
             LIMIT 1`,
            [id]
        );


        if (charges.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Tenancy charge not found'
            });
        }


        if (charges[0].status !== 'active') {
            return res.status(409).json({
                success: false,
                message: 'Cannot delete charges from an ended tenancy'
            });
        }


        await db.query(
            `DELETE FROM tenancy_charges
             WHERE id = ?`,
            [id]
        );


        return res.json({
            success: true,
            message: 'Tenancy charge deleted successfully'
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
    getTenancyCharges,
    getTenancyChargeById,
    getChargesByTenancy,
    createTenancyCharge,
    updateTenancyCharge,
    deleteTenancyCharge
};