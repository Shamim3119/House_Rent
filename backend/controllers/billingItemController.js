const db = require('../config/db');


// Get all billing items
const getBillingItems = async (req, res) => {
    try {
        const [billingItems] = await db.query(
            `SELECT id, name, description, created_at, updated_at
             FROM billing_items
             ORDER BY id DESC`
        );

        return res.json({
            success: true,
            data: billingItems
        });

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};


// Get billing item by ID
const getBillingItemById = async (req, res) => {
    try {
        const { id } = req.params;

        const [billingItems] = await db.query(
            `SELECT id, name, description, created_at, updated_at
             FROM billing_items
             WHERE id = ?
             LIMIT 1`,
            [id]
        );

        if (billingItems.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Billing item not found'
            });
        }

        return res.json({
            success: true,
            data: billingItems[0]
        });

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};


// Create billing item
const createBillingItem = async (req, res) => {
    try {
        const { name, description } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Billing item name is required'
            });
        }

        const cleanName = name.trim();
        const cleanDescription = description
            ? description.trim()
            : null;

        const [result] = await db.query(
            `INSERT INTO billing_items
                (name, description)
             VALUES (?, ?)`,
            [cleanName, cleanDescription]
        );

        return res.status(201).json({
            success: true,
            message: 'Billing item created successfully',
            data: {
                id: result.insertId,
                name: cleanName,
                description: cleanDescription
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


// Update billing item
const updateBillingItem = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Billing item name is required'
            });
        }

        const cleanName = name.trim();
        const cleanDescription = description
            ? description.trim()
            : null;

        const [result] = await db.query(
            `UPDATE billing_items
             SET name = ?,
                 description = ?
             WHERE id = ?`,
            [cleanName, cleanDescription, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Billing item not found'
            });
        }

        return res.json({
            success: true,
            message: 'Billing item updated successfully'
        });

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};


// Delete billing item
const deleteBillingItem = async (req, res) => {
    try {
        const { id } = req.params;

        const [result] = await db.query(
            `DELETE FROM billing_items
             WHERE id = ?`,
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Billing item not found'
            });
        }

        return res.json({
            success: true,
            message: 'Billing item deleted successfully'
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
    getBillingItems,
    getBillingItemById,
    createBillingItem,
    updateBillingItem,
    deleteBillingItem
};