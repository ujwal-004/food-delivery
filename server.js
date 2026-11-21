require('dotenv').config();

const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./config/database');

const app = express();
const PORT = Number(process.env.SERVER_PORT || process.env.PORT || 5000);
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET || JWT_SECRET.length < 32) {
  console.error('JWT_SECRET is required and must contain at least 32 characters. Set it in your local .env file.');
  process.exit(1);
}

const allowedOrigins = new Set(
  (process.env.CORS_ORIGINS || 'http://localhost:5500,http://127.0.0.1:5500,http://localhost:3000,http://127.0.0.1:3000')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
);

app.use(cors({
  origin(origin, callback) {
    // Requests without an Origin header include local command-line health checks.
    if (!origin || origin === 'null' || allowedOrigins.has(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Origin is not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '64kb' }));
app.use(express.urlencoded({ extended: true, limit: '64kb' }));

function asyncHandler(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

function createToken(user) {
  return jwt.sign(
    { sub: String(user.id), email: user.email },
    JWT_SECRET,
    { expiresIn: '24h', issuer: 'food-delivery-api' }
  );
}

function authenticate(req, res, next) {
  const header = req.get('authorization') || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Authentication required. Please sign in again.' });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET, { issuer: 'food-delivery-api' });
    const userId = Number(payload.sub);
    if (!Number.isSafeInteger(userId) || userId <= 0) {
      return res.status(401).json({ error: 'Invalid authentication token.' });
    }
    req.auth = { userId };
    return next();
  } catch {
    return res.status(401).json({ error: 'Your session has expired. Please sign in again.' });
  }
}

function isValidEmail(email) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

app.get('/api/health', asyncHandler(async (req, res) => {
  await db.query('SELECT 1');
  res.json({ status: 'ok', database: 'connected', port: PORT });
}));

// Registration stores only a bcrypt password hash.
app.post('/api/auth/register', asyncHandler(async (req, res) => {
  const { name, email, phone, password, address } = req.body || {};
  const cleanName = typeof name === 'string' ? name.trim() : '';
  const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
  const cleanPhone = typeof phone === 'string' ? phone.trim() : '';

  if (!cleanName || cleanName.length > 100 || !isValidEmail(cleanEmail)
      || !cleanPhone || cleanPhone.length > 15
      || typeof password !== 'string' || password.length < 8 || Buffer.byteLength(password, 'utf8') > 72) {
    return res.status(400).json({
      error: 'Enter a valid name, email, phone number and password (8–72 characters).'
    });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  try {
    const [result] = await db.execute(
      'INSERT INTO users (name, email, phone, password, address) VALUES (?, ?, ?, ?, ?)',
      [cleanName, cleanEmail, cleanPhone, passwordHash,
        typeof address === 'string' ? address.trim().slice(0, 255) : '']
    );
    const user = { id: result.insertId, name: cleanName, email: cleanEmail };
    return res.status(201).json({ user, token: createToken(user) });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }
    throw error;
  }
}));

app.post('/api/auth/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body || {};
  const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
  if (!isValidEmail(cleanEmail) || typeof password !== 'string' || !password) {
    return res.status(400).json({ error: 'A valid email and password are required.' });
  }

  const [rows] = await db.execute(
    'SELECT id, name, email, password FROM users WHERE email = ? LIMIT 1',
    [cleanEmail]
  );
  if (!rows.length || !(await bcrypt.compare(password, rows[0].password))) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  const user = { id: rows[0].id, name: rows[0].name, email: rows[0].email };
  return res.json({ user, token: createToken(user) });
}));

app.get('/api/restaurants', asyncHandler(async (req, res) => {
  const [rows] = await db.execute(
    'SELECT id, name, description, rating, delivery_time, delivery_fee, image, address, phone FROM restaurants ORDER BY id'
  );
  res.json(rows);
}));

app.get('/api/food/restaurant/:id', asyncHandler(async (req, res) => {
  const restaurantId = Number(req.params.id);
  if (!Number.isSafeInteger(restaurantId) || restaurantId <= 0) {
    return res.status(400).json({ error: 'Invalid restaurant ID.' });
  }
  const [rows] = await db.execute(
    'SELECT f.id, f.restaurant_id, f.name, f.description, f.price, f.image, f.category, f.available, r.delivery_fee FROM food_items f INNER JOIN restaurants r ON r.id = f.restaurant_id WHERE f.restaurant_id = ? AND f.available = 1 ORDER BY f.id',
    [restaurantId]
  );
  res.json(rows);
}));

app.get('/api/food/search/:query', asyncHandler(async (req, res) => {
  const query = String(req.params.query || '').trim();
  if (!query || query.length > 100) {
    return res.status(400).json({ error: 'Search text must be between 1 and 100 characters.' });
  }
  const term = `%${query}%`;
  const [rows] = await db.execute(
    'SELECT f.id, f.restaurant_id, f.name, f.description, f.price, f.image, f.category, f.available, r.delivery_fee FROM food_items f INNER JOIN restaurants r ON r.id = f.restaurant_id WHERE f.available = 1 AND (f.name LIKE ? OR f.description LIKE ?) ORDER BY f.name',
    [term, term]
  );
  res.json(rows);
}));

app.post('/api/orders', authenticate, asyncHandler(async (req, res) => {
  const { restaurant_id: restaurantIdInput, items, delivery_address: addressInput, phone: phoneInput } = req.body || {};
  const restaurantId = Number(restaurantIdInput);
  const address = typeof addressInput === 'string' ? addressInput.trim() : '';
  const phone = typeof phoneInput === 'string' ? phoneInput.trim() : '';

  if (!Number.isSafeInteger(restaurantId) || restaurantId <= 0
      || !Array.isArray(items) || items.length < 1 || items.length > 50
      || !address || address.length > 255 || !phone || phone.length > 15) {
    return res.status(400).json({ error: 'Provide a restaurant, 1–50 items, a delivery address and a valid phone number.' });
  }

  // Consolidate repeated food IDs and validate quantities before querying the database.
  const quantities = new Map();
  for (const item of items) {
    const id = Number(item && item.id);
    const quantity = Number(item && item.quantity);
    if (!Number.isSafeInteger(id) || id <= 0 || !Number.isSafeInteger(quantity) || quantity < 1 || quantity > 50) {
      return res.status(400).json({ error: 'Each order item needs a valid food ID and quantity between 1 and 50.' });
    }
    quantities.set(id, (quantities.get(id) || 0) + quantity);
    if (quantities.get(id) > 50) {
      return res.status(400).json({ error: 'The maximum quantity for one menu item is 50.' });
    }
  }

  const foodIds = [...quantities.keys()];
  const placeholders = foodIds.map(() => '?').join(',');
  const [restaurants] = await db.execute(
    'SELECT id, delivery_fee FROM restaurants WHERE id = ? LIMIT 1',
    [restaurantId]
  );
  if (!restaurants.length) {
    return res.status(404).json({ error: 'Restaurant not found.' });
  }

  const [foodRows] = await db.execute(
    `SELECT id, restaurant_id, price FROM food_items WHERE id IN (${placeholders}) AND available = 1`,
    foodIds
  );
  if (foodRows.length !== foodIds.length || foodRows.some((row) => Number(row.restaurant_id) !== restaurantId)) {
    return res.status(400).json({ error: 'One or more items are unavailable or do not belong to this restaurant.' });
  }

  // Calculate amounts exclusively from database prices (integer cents avoid floating-point drift).
  const foodById = new Map(foodRows.map((row) => [Number(row.id), row]));
  let subtotalCents = 0;
  for (const [id, quantity] of quantities) {
    const priceCents = Math.round(Number(foodById.get(id).price) * 100);
    subtotalCents += priceCents * quantity;
  }
  const deliveryFeeCents = Math.round(Number(restaurants[0].delivery_fee || 0) * 100);
  const totalAmount = ((subtotalCents + deliveryFeeCents) / 100).toFixed(2);

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [orderResult] = await connection.execute(
      'INSERT INTO orders (user_id, restaurant_id, total_amount, delivery_address, phone) VALUES (?, ?, ?, ?, ?)',
      [req.auth.userId, restaurantId, totalAmount, address, phone]
    );

    for (const [id, quantity] of quantities) {
      const row = foodById.get(id);
      await connection.execute(
        'INSERT INTO order_items (order_id, food_id, quantity, price) VALUES (?, ?, ?, ?)',
        [orderResult.insertId, id, quantity, row.price]
      );
    }

    await connection.commit();
    return res.status(201).json({ order_id: orderResult.insertId, total_amount: totalAmount });
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}));

app.get('/api/orders/user/:id', authenticate, asyncHandler(async (req, res) => {
  const requestedUserId = Number(req.params.id);
  if (!Number.isSafeInteger(requestedUserId) || requestedUserId !== req.auth.userId) {
    return res.status(403).json({ error: 'You can only view your own orders.' });
  }
  const [rows] = await db.execute(
    'SELECT o.id, o.status, o.total_amount, o.delivery_address, o.created_at, r.name AS restaurant_name FROM orders o INNER JOIN restaurants r ON r.id = o.restaurant_id WHERE o.user_id = ? ORDER BY o.created_at DESC',
    [req.auth.userId]
  );
  res.json(rows);
}));

app.use((req, res) => res.status(404).json({ error: 'API endpoint not found.' }));

app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  if (error && error.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Request body contains invalid JSON.' });
  }
  if (error && error.message === 'Origin is not allowed by CORS') {
    return res.status(403).json({ error: 'This frontend origin is not allowed.' });
  }
  // Avoid logging request bodies, credentials, hashes or tokens.
  console.error('API request failed:', error && error.code ? error.code : 'internal_error');
  return res.status(500).json({ error: 'An unexpected server error occurred.' });
});

if (require.main === module) {
  app.listen(PORT, async () => {
    console.log(`Food Delivery API listening on http://localhost:${PORT}`);
    try {
      await db.query('SELECT 1');
      console.log('MySQL connection ready.');
    } catch {
      console.error('MySQL is not reachable. Check the DB_* settings and import database.sql.');
    }
  });
}

module.exports = app;
