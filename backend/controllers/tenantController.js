const db = require('../config/db');


// Get all tenants
const getTenants = async (req, res) => {
    try {
        const [tenants] = await db.query(
            `SELECT
                id,
                name,
                address,
                phone,
                nid,
                created_at,
                updated_at
             FROM tenants
             ORDER BY id DESC`
        );

        return res.json({
            success: true,
            data: tenants
        });

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};


// Get tenant by ID
const getTenantById = async (req, res) => {
    try {
        const { id } = req.params;

        const [tenants] = await db.query(
            `SELECT
                id,
                name,
                address,
                phone,
                nid,
                created_at,
                updated_at
             FROM tenants
             WHERE id = ?
             LIMIT 1`,
            [id]
        );

        if (tenants.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Tenant not found'
            });
        }

        return res.json({
            success: true,
            data: tenants[0]
        });

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};


// Create tenant
const createTenant = async (req, res) => {
    try {
        const {
            name,
            address,
            phone,
            nid
        } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Tenant name is required'
            });
        }

        const cleanName = name.trim();
        const cleanAddress = address ? address.trim() : null;
        const cleanPhone = phone ? phone.trim() : null;
        const cleanNid = nid ? nid.trim() : null;

        const [result] = await db.query(
            `INSERT INTO tenants
                (name, address, phone, nid)
             VALUES (?, ?, ?, ?)`,
            [
                cleanName,
                cleanAddress,
                cleanPhone,
                cleanNid
            ]
        );

        return res.status(201).json({
            success: true,
            message: 'Tenant created successfully',
            data: {
                id: result.insertId,
                name: cleanName,
                address: cleanAddress,
                phone: cleanPhone,
                nid: cleanNid
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


// Update tenant
const updateTenant = async (req, res) => {
    try {
        const { id } = req.params;

        const {
            name,
            address,
            phone,
            nid
        } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Tenant name is required'
            });
        }

        const cleanName = name.trim();
        const cleanAddress = address ? address.trim() : null;
        const cleanPhone = phone ? phone.trim() : null;
        const cleanNid = nid ? nid.trim() : null;

        const [result] = await db.query(
            `UPDATE tenants
             SET
                name = ?,
                address = ?,
                phone = ?,
                nid = ?
             WHERE id = ?`,
            [
                cleanName,
                cleanAddress,
                cleanPhone,
                cleanNid,
                id
            ]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Tenant not found'
            });
        }

        return res.json({
            success: true,
            message: 'Tenant updated successfully'
        });

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};


// Delete tenant
const deleteTenant = async (req, res) => {
    try {
        const { id } = req.params;

        // Check tenant exists
        const [tenants] = await db.query(
            `SELECT id
             FROM tenants
             WHERE id = ?
             LIMIT 1`,
            [id]
        );

        if (tenants.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Tenant not found'
            });
        }

        // Do not delete tenant if tenancy history exists
        const [tenancies] = await db.query(
            `SELECT id
             FROM tenancies
             WHERE tenant_id = ?
             LIMIT 1`,
            [id]
        );

        if (tenancies.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'Cannot delete tenant because tenancy history exists'
            });
        }

        await db.query(
            `DELETE FROM tenants
             WHERE id = ?`,
            [id]
        );

        return res.json({
            success: true,
            message: 'Tenant deleted successfully'
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
    getTenants,
    getTenantById,
    createTenant,
    updateTenant,
    deleteTenant
};