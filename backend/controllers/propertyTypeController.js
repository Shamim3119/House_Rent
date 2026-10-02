const db = require('../config/db');


// =====================================================
// Get all property types
// =====================================================
const getPropertyTypes = async (req, res) => {
    try {
        const [propertyTypes] = await db.query(
            `SELECT id, name, created_at, updated_at
             FROM property_types
             ORDER BY id DESC`
        );

        return res.json({
            success: true,
            data: propertyTypes
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
// Get property type by ID
// =====================================================
const getPropertyTypeById = async (req, res) => {
    try {
        const { id } = req.params;

        const [propertyTypes] = await db.query(
            `SELECT id, name, created_at, updated_at
             FROM property_types
             WHERE id = ?
             LIMIT 1`,
            [id]
        );

        if (propertyTypes.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Property type not found'
            });
        }

        return res.json({
            success: true,
            data: propertyTypes[0]
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
// Create property type
// =====================================================
const createPropertyType = async (req, res) => {
    try {
        const { name } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Property type name is required'
            });
        }

        const [result] = await db.query(
            `INSERT INTO property_types (name)
             VALUES (?)`,
            [name.trim()]
        );

        return res.status(201).json({
            success: true,
            message: 'Property type created successfully',
            data: {
                id: result.insertId,
                name: name.trim()
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
// Update property type
// =====================================================
const updatePropertyType = async (req, res) => {
    try {
        const { id } = req.params;
        const { name } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Property type name is required'
            });
        }

        const [result] = await db.query(
            `UPDATE property_types
             SET name = ?
             WHERE id = ?`,
            [name.trim(), id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Property type not found'
            });
        }

        return res.json({
            success: true,
            message: 'Property type updated successfully'
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
// Delete property type
// =====================================================
const deletePropertyType = async (req, res) => {
    try {
        const { id } = req.params;

        const [result] = await db.query(
            `DELETE FROM property_types
             WHERE id = ?`,
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Property type not found'
            });
        }

        return res.json({
            success: true,
            message: 'Property type deleted successfully'
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
    getPropertyTypes,
    getPropertyTypeById,
    createPropertyType,
    updatePropertyType,
    deletePropertyType
};