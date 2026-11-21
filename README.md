# FoodHub — Food Delivery App

A browser-based food ordering app with a Node.js/Express API and MySQL database. Customers can browse restaurants, search menus, create an account, add menu items to a cart, place an order and view their own order history.

## Features

- Restaurant catalogue with ratings, delivery estimates and delivery fees
- Restaurant-specific menus and food search
- Registration and login with bcrypt password hashing
- JWT-protected checkout and order history
- Server-side price and delivery-fee calculation
- Transactional order creation (an order and its line items are committed together)
- Parameterized SQL queries and input validation

## Tech stack

- Frontend: HTML, CSS and vanilla JavaScript
- Backend: Node.js, Express 4
- Database: MySQL with mysql2
- Authentication: bcryptjs and JSON Web Tokens

## Requirements

- Node.js 18 or later and npm
- MySQL 8 or compatible MySQL server
- Python 3 (or another static HTTP server) to serve the frontend locally

## Run locally

### 1. Create the database

From the project root, import the included schema and sample restaurants/menu items:

```bash
mysql -u root -p < database.sql
```

The script creates the `food_delivery_db` database and inserts sample data. It can be run once on a fresh database.

### 2. Configure the backend

Copy the example environment file:

**Windows PowerShell**
```powershell
Copy-Item .env.example .env
```

**macOS / Linux**
```bash
cp .env.example .env
```

Set `DB_USER` and `DB_PASSWORD` to your local MySQL account. Replace `JWT_SECRET` with a private random value of at least 32 characters. A value can be generated using Node.js:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Do not commit your local `.env` file or share its secrets.

### 3. Install and start the API

```bash
npm install
npm run dev
```

The API listens on [http://localhost:5000](http://localhost:5000) by default. Check [http://localhost:5000/api/health](http://localhost:5000/api/health) for the server/database health response. Use `npm start` for a normal (non-Nodemon) start.

### 4. Serve the frontend

Open a second terminal in the project root:

**Windows**
```powershell
py -m http.server 5500
```

**macOS / Linux**
```bash
python3 -m http.server 5500
```

Open [http://localhost:5500/index.html](http://localhost:5500/index.html). The API allows this local origin by default. For another frontend host/port, add its exact origin to `CORS_ORIGINS` in `.env` (comma-separated).

## Environment variables

| Variable | Default | Purpose |
|---|---|---|
| `DB_HOST` | `localhost` | MySQL server host |
| `DB_PORT` | `3306` | MySQL server port |
| `DB_USER` | `root` | MySQL username |
| `DB_PASSWORD` | empty | MySQL password |
| `DB_NAME` | `food_delivery_db` | Database name |
| `SERVER_PORT` | `5000` | API listening port |
| `JWT_SECRET` | required | Private JWT signing secret (minimum 32 characters) |
| `CORS_ORIGINS` | local ports 5500 and 3000 | Comma-separated allowed frontend origins |

## API

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/health` | API and database health |
| POST | `/api/auth/register` | Create an account |
| POST | `/api/auth/login` | Sign in and receive a JWT |
| GET | `/api/restaurants` | List restaurants |
| GET | `/api/food/restaurant/:id` | List available menu items for a restaurant |
| GET | `/api/food/search/:query` | Search available menu items |
| POST | `/api/orders` | Place an authenticated order |
| GET | `/api/orders/user/:id` | Read the signed-in user's orders |

Protected endpoints require:

```
Authorization: Bearer <token>
```

Example order request:

```json
{
  "restaurant_id": 1,
  "items": [
    { "id": 1, "quantity": 2 },
    { "id": 3, "quantity": 1 }
  ],
  "delivery_address": "Your delivery address",
  "phone": "9999999999"
}
```

The server ignores client-supplied prices, totals and user IDs. It verifies menu availability and restaurant ownership, calculates the subtotal and delivery fee from database values, then stores the order and line items in one transaction.

## Project layout

```
food-delivery/
├── config/
│   └── database.js
├── database.sql
├── index.html
├── script.js
├── server.js
├── style.css
├── package.json
└── .env.example
```

## Security and limitations

- Passwords are stored as bcrypt hashes; plaintext passwords are never stored.
- SQL statements use parameters. Order totals and user ownership are determined on the server.
- JWTs expire after 24 hours. The current browser UI stores the token in localStorage; this is convenient for a learning project but can be exposed by an XSS vulnerability.
- The CORS allow-list is intended for local development. Configure exact origins and HTTPS before deployment.
- For production, add HTTPS, security headers, rate limiting, stronger account recovery/session management, input/output sanitization in the frontend and monitoring. Review privacy, payment and delivery workflows before accepting real customer orders.

No hosted payment gateway or real delivery integration is included; the sample project records orders in MySQL.
