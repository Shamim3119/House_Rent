const db = require('../config/db');


// Get all houses
const getHouses = async (req, res) => {
    try {

        const [houses] = await db.query(
            `SELECT id, name, address, created_at, updated_at
             FROM houses
             ORDER BY id DESC`
        );

        return res.json({
            success: true,
            data: houses
        });

    } catch (error) {

        console.error(error);

        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};


// Create house
const createHouse = async (req, res) => {
    try {

        const { name, address } = req.body;

        if (!name) {
            return res.status(400).json({
                success: false,
                message: 'House name is required'
            });
        }

        const [result] = await db.query(
            `INSERT INTO houses
                (name, address)
             VALUES (?, ?)`,
            [name, address || null]
        );

        return res.status(201).json({
            success: true,
            message: 'House created successfully',
            data: {
                id: result.insertId,
                name,
                address
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

const getHouseById = async (req, res) => {
    try {
        const { id } = req.params;

        const [houses] = await db.query(
            `SELECT id, name, address, created_at, updated_at
             FROM houses
             WHERE id = ?
             LIMIT 1`,
            [id]
        );

        if (houses.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'House not found'
            });
        }

        return res.json({
            success: true,
            data: houses[0]
        });

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

const updateHouse = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, address } = req.body;

        if (!name) {
            return res.status(400).json({
                success: false,
                message: 'House name is required'
            });
        }

        const [result] = await db.query(
            `UPDATE houses
             SET name = ?, address = ?
             WHERE id = ?`,
            [name, address || null, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'House not found'
            });
        }

        return res.json({
            success: true,
            message: 'House updated successfully'
        });

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};


const deleteHouse = async (req, res) => {
    try {
        const { id } = req.params;

        const [result] = await db.query(
            `DELETE FROM houses
             WHERE id = ?`,
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'House not found'
            });
        }

        return res.json({
            success: true,
            message: 'House deleted successfully'
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
    getHouses,
    getHouseById,
    createHouse,
    updateHouse,
    deleteHouse
};