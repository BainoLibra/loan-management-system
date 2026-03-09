const pool = require('../db'); // your DB connection
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const SECRET = 'mysecretkey'; // Move to env later

// REGISTER USER
const register = async (req, res) => {
    try {
        const { name, email, password, role } = req.body;

        // hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // save user
        await pool.execute(
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
        const [rows] = await pool.execute(
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

        // Create Token
        const token = jwt.sign(
            {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            },
            SECRET,
            { expiresIn: '1d' }
        );

        res.json({
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Error logging in' });
    }
};

module.exports = { register, login };