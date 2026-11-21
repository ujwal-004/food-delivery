require('dotenv').config();
const mysql = require('mysql2');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'food_delivery_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Export the raw pool (server.js uses callback getConnection)
module.exports = pool.promise ? pool.promise() : pool;
