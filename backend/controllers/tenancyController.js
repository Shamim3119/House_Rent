const db = require('../config/db');


// =====================================================
// Get all tenancies
// =====================================================
const getTenancies = async (req, res) => {
    try {
        const [tenancies] = await db.query(
            `SELECT
                tn.id,

                tn.tenant_id,
                t.name AS tenant_name,
                t.phone AS tenant_phone,

                tn.property_unit_id,
                pu.name AS property_unit_name,

                pu.property_type_id,
                pt.name AS property_type_name,

                pu.house_id,
                h.name AS house_name,
                h.address AS house_address,

                tn.start_date,
                tn.end_date,
                tn.advance_amount,
                tn.status,

                tn.created_at,
                tn.updated_at

             FROM tenancies tn

             INNER JOIN tenants t
                ON t.id = tn.tenant_id

             INNER JOIN property_units pu
                ON pu.id = tn.property_unit_id

             INNER JOIN property_types pt
                ON pt.id = pu.property_type_id

             INNER JOIN houses h
                ON h.id = pu.house_id

             ORDER BY tn.id DESC`
        );

        return res.json({
            success: true,
            data: tenancies
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
// Get tenancy by ID
// =====================================================
const getTenancyById = async (req, res) => {
    try {
        const { id } = req.params;

        const [tenancies] = await db.query(
            `SELECT
                tn.id,

                tn.tenant_id,
                t.name AS tenant_name,
                t.address AS tenant_address,
                t.phone AS tenant_phone,
                t.nid AS tenant_nid,

                tn.property_unit_id,
                pu.name AS property_unit_name,

                pu.property_type_id,
                pt.name AS property_type_name,

                pu.house_id,
                h.name AS house_name,
                h.address AS house_address,

                tn.start_date,
                tn.end_date,
                tn.advance_amount,
                tn.status,

                tn.created_at,
                tn.updated_at

             FROM tenancies tn

             INNER JOIN tenants t
                ON t.id = tn.tenant_id

             INNER JOIN property_units pu
                ON pu.id = tn.property_unit_id

             INNER JOIN property_types pt
                ON pt.id = pu.property_type_id

             INNER JOIN houses h
                ON h.id = pu.house_id

             WHERE tn.id = ?
             LIMIT 1`,
            [id]
        );

        if (tenancies.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Tenancy not found'
            });
        }

        return res.json({
            success: true,
            data: tenancies[0]
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
// Create tenancy
// =====================================================
const createTenancy = async (req, res) => {
    try {
        const {
            tenant_id,
            property_unit_id,
            start_date,
            advance_amount
        } = req.body;


        // Required fields
        if (!tenant_id) {
            return res.status(400).json({
                success: false,
                message: 'Tenant is required'
            });
        }

        if (!property_unit_id) {
            return res.status(400).json({
                success: false,
                message: 'Property unit is required'
            });
        }

        if (!start_date) {
            return res.status(400).json({
                success: false,
                message: 'Start date is required'
            });
        }


        // Validate advance amount
        const advance = advance_amount ?? 0;

        if (Number(advance) < 0) {
            return res.status(400).json({
                success: false,
                message: 'Advance amount cannot be negative'
            });
        }


        // Check tenant exists
        const [tenants] = await db.query(
            `SELECT id, name
             FROM tenants
             WHERE id = ?
             LIMIT 1`,
            [tenant_id]
        );

        if (tenants.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid tenant'
            });
        }


        // Check property unit exists
        const [propertyUnits] = await db.query(
            `SELECT
                pu.id,
                pu.name,
                h.name AS house_name
             FROM property_units pu
             INNER JOIN houses h
                ON h.id = pu.house_id
             WHERE pu.id = ?
             LIMIT 1`,
            [property_unit_id]
        );

        if (propertyUnits.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid property unit'
            });
        }


        // Check property unit is not already occupied
        const [activeTenancies] = await db.query(
            `SELECT
                tn.id,
                t.name AS tenant_name
             FROM tenancies tn
             INNER JOIN tenants t
                ON t.id = tn.tenant_id
             WHERE tn.property_unit_id = ?
             AND tn.status = 'active'
             LIMIT 1`,
            [property_unit_id]
        );

        if (activeTenancies.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'Property unit is already occupied'
            });
        }


        // Create tenancy
        const [result] = await db.query(
            `INSERT INTO tenancies
                (
                    tenant_id,
                    property_unit_id,
                    start_date,
                    advance_amount,
                    status
                )
             VALUES (?, ?, ?, ?, 'active')`,
            [
                tenant_id,
                property_unit_id,
                start_date,
                advance
            ]
        );


        return res.status(201).json({
            success: true,
            message: 'Tenancy created successfully',
            data: {
                id: result.insertId,
                tenant_id,
                property_unit_id,
                start_date,
                advance_amount: advance,
                status: 'active'
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
// Update tenancy
// =====================================================
const updateTenancy = async (req, res) => {
    try {
        const { id } = req.params;

        const {
            tenant_id,
            property_unit_id,
            start_date,
            advance_amount
        } = req.body;


        if (!tenant_id) {
            return res.status(400).json({
                success: false,
                message: 'Tenant is required'
            });
        }

        if (!property_unit_id) {
            return res.status(400).json({
                success: false,
                message: 'Property unit is required'
            });
        }

        if (!start_date) {
            return res.status(400).json({
                success: false,
                message: 'Start date is required'
            });
        }

        const advance = advance_amount ?? 0;

        if (Number(advance) < 0) {
            return res.status(400).json({
                success: false,
                message: 'Advance amount cannot be negative'
            });
        }


        // Check tenancy exists
        const [currentTenancies] = await db.query(
            `SELECT id, status
             FROM tenancies
             WHERE id = ?
             LIMIT 1`,
            [id]
        );

        if (currentTenancies.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Tenancy not found'
            });
        }


        // Check tenant exists
        const [tenants] = await db.query(
            `SELECT id
             FROM tenants
             WHERE id = ?
             LIMIT 1`,
            [tenant_id]
        );

        if (tenants.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid tenant'
            });
        }


        // Check property unit exists
        const [propertyUnits] = await db.query(
            `SELECT id
             FROM property_units
             WHERE id = ?
             LIMIT 1`,
            [property_unit_id]
        );

        if (propertyUnits.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid property unit'
            });
        }


        // If tenancy is active, make sure another active
        // tenancy does not already occupy this unit
        if (currentTenancies[0].status === 'active') {

            const [activeTenancies] = await db.query(
                `SELECT id
                 FROM tenancies
                 WHERE property_unit_id = ?
                 AND status = 'active'
                 AND id <> ?
                 LIMIT 1`,
                [property_unit_id, id]
            );

            if (activeTenancies.length > 0) {
                return res.status(409).json({
                    success: false,
                    message: 'Property unit is already occupied'
                });
            }
        }


        await db.query(
            `UPDATE tenancies
             SET
                tenant_id = ?,
                property_unit_id = ?,
                start_date = ?,
                advance_amount = ?
             WHERE id = ?`,
            [
                tenant_id,
                property_unit_id,
                start_date,
                advance,
                id
            ]
        );


        return res.json({
            success: true,
            message: 'Tenancy updated successfully'
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
// End tenancy
// =====================================================
const endTenancy = async (req, res) => {
    try {
        const { id } = req.params;
        const { end_date } = req.body;


        if (!end_date) {
            return res.status(400).json({
                success: false,
                message: 'End date is required'
            });
        }


        const [tenancies] = await db.query(
            `SELECT
                id,
                start_date,
                status
             FROM tenancies
             WHERE id = ?
             LIMIT 1`,
            [id]
        );

        if (tenancies.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Tenancy not found'
            });
        }


        const tenancy = tenancies[0];


        if (tenancy.status === 'ended') {
            return res.status(409).json({
                success: false,
                message: 'Tenancy has already ended'
            });
        }


        // Database CHECK also protects this,
        // but return a friendly API message
        const startDate = new Date(tenancy.start_date);
        const endDate = new Date(end_date);

        if (endDate < startDate) {
            return res.status(400).json({
                success: false,
                message: 'End date cannot be before start date'
            });
        }


        await db.query(
            `UPDATE tenancies
             SET
                end_date = ?,
                status = 'ended'
             WHERE id = ?`,
            [end_date, id]
        );


        return res.json({
            success: true,
            message: 'Tenancy ended successfully'
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
// Delete tenancy
// =====================================================
const deleteTenancy = async (req, res) => {
    try {
        const { id } = req.params;


        const [tenancies] = await db.query(
            `SELECT id, status
             FROM tenancies
             WHERE id = ?
             LIMIT 1`,
            [id]
        );

        if (tenancies.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Tenancy not found'
            });
        }


        // Active tenancy should be ended, not deleted
        if (tenancies[0].status === 'active') {
            return res.status(409).json({
                success: false,
                message: 'Active tenancy cannot be deleted. End the tenancy first.'
            });
        }


        await db.query(
            `DELETE FROM tenancies
             WHERE id = ?`,
            [id]
        );


        return res.json({
            success: true,
            message: 'Tenancy deleted successfully'
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
    getTenancies,
    getTenancyById,
    createTenancy,
    updateTenancy,
    endTenancy,
    deleteTenancy
};