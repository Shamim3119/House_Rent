const db = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const login = async (req, res) => {
    try {
        const { username, password } = req.body;

        // 1. Validate input
        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: 'Username and password are required'
            });
        }

        // 2. Find user
        const [users] = await db.query(
            `SELECT id, name, username, password, is_active
             FROM users
             WHERE username = ?
             LIMIT 1`,
            [username]
        );

        if (users.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Invalid username or password'
            });
        }

        const user = users[0];

        // 3. Check active status
        if (!user.is_active) {
            return res.status(403).json({
                success: false,
                message: 'User account is inactive'
            });
        }

        // 4. Compare entered password with bcrypt hash
        const passwordMatched = await bcrypt.compare(
            password,
            user.password
        );

        if (!passwordMatched) {
            return res.status(401).json({
                success: false,
                message: 'Invalid username or password'
            });
        }

        // 5. Create JWT
        const token = jwt.sign(
            {
                userId: user.id,
                username: user.username
            },
            process.env.JWT_SECRET,
            {
                expiresIn: process.env.JWT_EXPIRES_IN
            }
        );

        // 6. Return successful login
        return res.json({
            success: true,
            message: 'Login successful',
            token: token,
            user: {
                id: user.id,
                name: user.name,
                username: user.username
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

const getMe = async (req, res) => {
    try {
        const [users] = await db.query(
            `SELECT id, name, username, is_active, created_at
             FROM users
             WHERE id = ?
             LIMIT 1`,
            [req.user.userId]
        );

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        return res.json({
            success: true,
            user: users[0]
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
    login,
    getMe
};