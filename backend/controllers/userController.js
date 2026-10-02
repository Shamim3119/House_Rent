const db = require('../config/db');
const bcrypt = require('bcrypt');

const createUser = async (req, res) => {
    try {
        const { name, username, password } = req.body;

        // Basic validation
        if (!name || !username || !password) {
            return res.status(400).json({
                success: false,
                message: 'Name, username and password are required'
            });
        }

        // Check existing username
        const [existingUsers] = await db.query(
            'SELECT id FROM users WHERE username = ?',
            [username]
        );

        if (existingUsers.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'Username already exists'
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 12);

        // Insert user
        const [result] = await db.query(
            `INSERT INTO users
                (name, username, password)
             VALUES (?, ?, ?)`,
            [name, username, hashedPassword]
        );

        return res.status(201).json({
            success: true,
            message: 'User created successfully',
            user: {
                id: result.insertId,
                name,
                username
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
    createUser
};