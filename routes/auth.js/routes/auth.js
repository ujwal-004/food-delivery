const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'food-delivery-secret-key';

// Validate email format
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Register
router.post('/register', async (req, res) => {
  try {
    const { name, email, phone, password, address } = req.body;

    if (!name || !email || !phone || !password) {
      return res.status(400).json({ error: 'Missing required fields: name, email, phone, password' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    if (!isValidEmail(normalizedEmail)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    if (password.length > 255) {
      return res.status(400).json({ error: 'Password too long' });
    }

    const pool = db;
    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [normalizedEmail]);

    if (existing.length > 0) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await pool.query(
      'INSERT INTO users (name, email, phone, password, address) VALUES (?, ?, ?, ?, ?)',
      [name, normalizedEmail, phone, hashedPassword, address || '']
    );

    const user = { id: result.insertId, name, email: normalizedEmail };
    const token = jwt.sign({ userId: result.insertId, email: normalizedEmail }, JWT_SECRET, { expiresIn: '24h' });

    res.status(201).json({ user, token });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const pool = db;
    const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [normalizedEmail]);

    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = users[0];
    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const userData = { id: user.id, name: user.name, email: user.email };
    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '24h' });

    res.json({ user: userData, token });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

module.exports = router;
