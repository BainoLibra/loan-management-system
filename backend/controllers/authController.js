const db = require('../config/db'); // your DB connection
const bcrypt = require('bcrypt');

// REGISTER USER
const register = async (req, res) => {
    try {
        const { name, email, password, role } = req.body;

        // hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // save user
        await db.query(
            'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
            [name, email, hashedPassword, role]
        );

        res.json({ message: 'User registered successfully' });

    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Error registering user' });
    }
};

// LOGIN USER
const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // find user
        const [rows] = await db.query(
            'SELECT * FROM users WHERE email = ?',
            [email]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        const user = rows[0];

        // compare password
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        res.json({
            message: 'Login successful',
            user: {
                id: user.id,
                role: user.role
            }
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Error logging in' });
    }
};

module.exports = { register, login };