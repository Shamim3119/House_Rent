const db = require('../config/db');


// =====================================================
// Get all property units
// =====================================================
const getPropertyUnits = async (req, res) => {
    try {
        const [propertyUnits] = await db.query(
            `SELECT
                pu.id,
                pu.name,

                pu.property_type_id,
                pt.name AS property_type_name,

                pu.house_id,
                h.name AS house_name,
                h.address AS house_address,

                pu.created_at,
                pu.updated_at

             FROM property_units pu

             INNER JOIN property_types pt
                ON pt.id = pu.property_type_id

             INNER JOIN houses h
                ON h.id = pu.house_id

             ORDER BY pu.id DESC`
        );

        return res.json({
            success: true,
            data: propertyUnits
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
// Get property unit by ID
// =====================================================
const getPropertyUnitById = async (req, res) => {
    try {
        const { id } = req.params;

        const [propertyUnits] = await db.query(
            `SELECT
                pu.id,
                pu.name,

                pu.property_type_id,
                pt.name AS property_type_name,

                pu.house_id,
                h.name AS house_name,
                h.address AS house_address,

                pu.created_at,
                pu.updated_at

             FROM property_units pu

             INNER JOIN property_types pt
                ON pt.id = pu.property_type_id

             INNER JOIN houses h
                ON h.id = pu.house_id

             WHERE pu.id = ?
             LIMIT 1`,
            [id]
        );

        if (propertyUnits.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Property unit not found'
            });
        }

        return res.json({
            success: true,
            data: propertyUnits[0]
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
// Create property unit
// =====================================================
const createPropertyUnit = async (req, res) => {
    try {
        const {
            name,
            property_type_id,
            house_id
        } = req.body;


        // Validate required fields
        if (!name || !name.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Property unit name is required'
            });
        }

        if (!property_type_id) {
            return res.status(400).json({
                success: false,
                message: 'Property type is required'
            });
        }

        if (!house_id) {
            return res.status(400).json({
                success: false,
                message: 'House is required'
            });
        }


        // Check property type exists
        const [propertyTypes] = await db.query(
            `SELECT id
             FROM property_types
             WHERE id = ?
             LIMIT 1`,
            [property_type_id]
        );

        if (propertyTypes.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid property type'
            });
        }


        // Check house exists
        const [houses] = await db.query(
            `SELECT id
             FROM houses
             WHERE id = ?
             LIMIT 1`,
            [house_id]
        );

        if (houses.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid house'
            });
        }


        // Check duplicate unit name inside same house
        const [existingUnits] = await db.query(
            `SELECT id
             FROM property_units
             WHERE house_id = ?
             AND name = ?
             LIMIT 1`,
            [house_id, name.trim()]
        );

        if (existingUnits.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'This property unit already exists in this house'
            });
        }


        // Insert
        const [result] = await db.query(
            `INSERT INTO property_units
                (name, property_type_id, house_id)
             VALUES (?, ?, ?)`,
            [
                name.trim(),
                property_type_id,
                house_id
            ]
        );


        return res.status(201).json({
            success: true,
            message: 'Property unit created successfully',
            data: {
                id: result.insertId,
                name: name.trim(),
                property_type_id,
                house_id
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
// Update property unit
// =====================================================
const updatePropertyUnit = async (req, res) => {
    try {
        const { id } = req.params;

        const {
            name,
            property_type_id,
            house_id
        } = req.body;


        // Validate
        if (!name || !name.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Property unit name is required'
            });
        }

        if (!property_type_id) {
            return res.status(400).json({
                success: false,
                message: 'Property type is required'
            });
        }

        if (!house_id) {
            return res.status(400).json({
                success: false,
                message: 'House is required'
            });
        }


        // Check property unit exists
        const [propertyUnits] = await db.query(
            `SELECT id
             FROM property_units
             WHERE id = ?
             LIMIT 1`,
            [id]
        );

        if (propertyUnits.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Property unit not found'
            });
        }


        // Check property type exists
        const [propertyTypes] = await db.query(
            `SELECT id
             FROM property_types
             WHERE id = ?
             LIMIT 1`,
            [property_type_id]
        );

        if (propertyTypes.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid property type'
            });
        }


        // Check house exists
        const [houses] = await db.query(
            `SELECT id
             FROM houses
             WHERE id = ?
             LIMIT 1`,
            [house_id]
        );

        if (houses.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid house'
            });
        }


        // Check duplicate name in same house
        // Exclude current property unit
        const [existingUnits] = await db.query(
            `SELECT id
             FROM property_units
             WHERE house_id = ?
             AND name = ?
             AND id <> ?
             LIMIT 1`,
            [
                house_id,
                name.trim(),
                id
            ]
        );

        if (existingUnits.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'This property unit already exists in this house'
            });
        }


        // Update
        await db.query(
            `UPDATE property_units
             SET
                name = ?,
                property_type_id = ?,
                house_id = ?
             WHERE id = ?`,
            [
                name.trim(),
                property_type_id,
                house_id,
                id
            ]
        );


        return res.json({
            success: true,
            message: 'Property unit updated successfully'
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
// Delete property unit
// =====================================================
const deletePropertyUnit = async (req, res) => {
    try {
        const { id } = req.params;


        // Check property unit exists
        const [propertyUnits] = await db.query(
            `SELECT id
             FROM property_units
             WHERE id = ?
             LIMIT 1`,
            [id]
        );

        if (propertyUnits.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Property unit not found'
            });
        }


        // Check whether tenancy history exists
        const [tenancies] = await db.query(
            `SELECT id
             FROM tenancies
             WHERE property_unit_id = ?
             LIMIT 1`,
            [id]
        );

        if (tenancies.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'Cannot delete property unit because tenancy history exists'
            });
        }


        // Delete
        await db.query(
            `DELETE FROM property_units
             WHERE id = ?`,
            [id]
        );


        return res.json({
            success: true,
            message: 'Property unit deleted successfully'
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
    getPropertyUnits,
    getPropertyUnitById,
    createPropertyUnit,
    updatePropertyUnit,
    deletePropertyUnit
};