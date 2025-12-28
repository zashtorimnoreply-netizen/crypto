# Crypto Portfolio Backend

A Node.js/Express backend API for a crypto portfolio visualizer with PostgreSQL and Redis integration.

## Quick Start

If you already have PostgreSQL and Redis installed:

```bash
# Install dependencies
npm install

# Create database
npm run setup:db

# Run migrations
npm run migrate:up

# Start server
npm start
```

Visit `http://localhost:3000/health` to verify everything is working.

## Tech Stack

- **Node.js** 18+
- **Express.js** - Web framework
- **PostgreSQL** - Primary database
- **Redis** - Caching layer
- **node-pg-migrate** - Database migrations

## Prerequisites

Before you begin, ensure you have the following installed on your local machine:

- **Node.js** (version 18 or higher)
- **npm** (comes with Node.js)
- **PostgreSQL** (version 12 or higher)
- **Redis** (version 6 or higher)

### Installing PostgreSQL Locally

#### macOS (using Homebrew)
```bash
brew install postgresql@15
brew services start postgresql@15
```

#### Ubuntu/Debian
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

#### Windows
Download and install from [PostgreSQL official website](https://www.postgresql.org/download/windows/)

### Installing Redis Locally

#### macOS (using Homebrew)
```bash
brew install redis
brew services start redis
```

#### Ubuntu/Debian
```bash
sudo apt update
sudo apt install redis-server
sudo systemctl start redis-server
sudo systemctl enable redis-server
```

#### Windows
Download and install from [Redis official website](https://redis.io/download) or use WSL2

## Setup Instructions

### 1. Clone the Repository
```bash
git clone <repository-url>
cd crypto-portfolio-backend
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Create the Database

Option 1: Use the setup script (recommended):
```bash
npm run setup:db
```

Option 2: Create manually using psql:
```bash
# Using psql
psql -U postgres

# In psql, run:
CREATE DATABASE crypto_portfolio;
\q
```

Or use this one-liner:
```bash
createdb -U postgres crypto_portfolio
```

### 4. Configure Environment Variables

Copy the example environment file and update values if needed:

```bash
cp .env.example .env
```

Edit `.env` with your database credentials if different from defaults:

```
DATABASE_URL=postgres://postgres:postgres@localhost:5432/crypto_portfolio
REDIS_URL=redis://localhost:6379
NODE_ENV=development
PORT=3000
```

**Environment Variables Explained:**
- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_URL`: Redis connection string
- `NODE_ENV`: Application environment (development, production, test)
- `PORT`: Port the server will run on

### 5. Run Database Migrations

Apply the database schema:

```bash
npm run migrate:up
```

This will create all necessary tables:
- `users` - User accounts
- `portfolios` - User portfolios
- `trades` - Trade records
- `prices` - Historical price data
- `public_reports` - Shareable portfolio reports

To rollback migrations:
```bash
npm run migrate:down
```

### 6. Start the Development Server

```bash
npm start
```

The server will start on `http://localhost:3000`

## Verification

Once the server is running, verify the setup by accessing the health endpoint:

```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "ok",
  "postgres": "connected",
  "redis": "connected"
}
```

## API Endpoints

### Health Check
- **GET** `/health`
  - Returns the status of database connections
  - Response: `{ status: "ok", postgres: "connected", redis: "connected" }`

### CSV Import
- **POST** `/api/portfolios/:portfolio_id/import-csv`
  - Import trades from a CSV file
  - Content-Type: `multipart/form-data`
  - Required field: `file` (CSV file)
  - CSV format: timestamp, symbol, side, qty, price, fee (optional), exchange (optional)

- **GET** `/api/csv-template`
  - Download a CSV template file for importing trades

### Bybit Integration
- **POST** `/api/portfolios/:portfolio_id/sync-bybit`
  - Sync spot trading history from Bybit exchange
  - Content-Type: `application/json`
  - Request Body:
    ```json
    {
      "api_key": "your-bybit-api-key",
      "api_secret": "your-bybit-api-secret"
    }
    ```
  - Response:
    ```json
    {
      "success": true,
      "fetched_count": 150,
      "inserted_count": 145,
      "skipped_count": 5,
      "errors": [],
      "message": "Synced 150 trades from Bybit. 145 new trades added, 5 duplicates skipped."
    }
    ```
  - Features:
    - Fetches all spot trading history from Bybit
    - Handles pagination automatically (fetches all trades even if >100)
    - Detects and skips duplicate trades
    - Normalizes symbols (e.g., BTC/USDT → BTC)
    - Implements exponential backoff for rate limits
    - Does not store API credentials
  - Note: API credentials are only used for the sync request and are not stored

## Database Schema

### Users Table
- `id` (UUID) - Primary key
- `email` (VARCHAR 255) - Unique, not null
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

### Portfolios Table
- `id` (UUID) - Primary key
- `user_id` (UUID) - Foreign key to users
- `name` (VARCHAR 255) - Default: 'My Portfolio'
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

### Trades Table
- `id` (UUID) - Primary key
- `portfolio_id` (UUID) - Foreign key to portfolios
- `timestamp` (TIMESTAMP) - Trade execution time
- `symbol` (VARCHAR 10) - Crypto symbol (e.g., 'BTC', 'ETH')
- `side` (VARCHAR 4) - 'BUY' or 'SELL'
- `quantity` (DECIMAL 18,8) - Amount traded
- `price` (DECIMAL 18,8) - Price per unit
- `fee` (DECIMAL 18,8) - Transaction fee
- `exchange` (VARCHAR 50) - Exchange name
- `source_id` (VARCHAR 255) - External trade ID
- `created_at` (TIMESTAMP)

**Indexes:**
- `(portfolio_id, timestamp)`
- `(symbol, timestamp)`
- `(exchange, source_id)`

### Prices Table
- `id` (UUID) - Primary key
- `symbol` (VARCHAR 10) - Crypto symbol
- `timestamp` (TIMESTAMP) - Price timestamp
- `close` (DECIMAL 18,8) - Closing price
- `created_at` (TIMESTAMP)

**Constraints:**
- Unique: `(symbol, timestamp)`

**Indexes:**
- `(symbol, timestamp DESC)`

### Public Reports Table
- `id` (UUID) - Primary key
- `portfolio_id` (UUID) - Foreign key to portfolios
- `report_uuid` (UUID) - Shareable link identifier
- `created_at` (TIMESTAMP)
- `expires_at` (TIMESTAMP) - Optional expiration
- `metadata` (JSONB) - Portfolio snapshot data

## Project Structure

```
.
├── src/
│   ├── server.js              # Main application entry point
│   ├── db.js                  # PostgreSQL connection and utilities
│   ├── redis.js               # Redis connection and utilities
│   ├── controllers/
│   │   ├── csvController.js   # CSV import logic
│   │   └── bybitController.js # Bybit API integration
│   ├── routes/
│   │   ├── csv.js             # CSV import routes
│   │   └── bybit.js           # Bybit sync routes
│   ├── utils/
│   │   ├── csvTradeValidator.js   # CSV validation utilities
│   │   └── symbolNormalizer.js    # Symbol normalization
│   └── middleware/
│       └── errorHandler.js    # Global error handling middleware
├── migrations/
│   └── 1735405200000_initial-schema.js  # Initial database schema
├── .env                       # Environment variables (not in git)
├── .env.example               # Example environment variables
├── database.json              # Migration configuration
├── package.json               # Node.js dependencies and scripts
└── README.md                  # This file
```

## Development

### Creating New Migrations

To create a new migration:

```bash
npm run migrate:create <migration-name>
```

This will create a new migration file in the `migrations/` directory.

### Running Migrations

Apply all pending migrations:
```bash
npm run migrate:up
```

Rollback the last migration:
```bash
npm run migrate:down
```

## Troubleshooting

### Cannot connect to PostgreSQL
- Ensure PostgreSQL is running: `pg_isready`
- Check your DATABASE_URL in `.env`
- Verify the database exists: `psql -U postgres -l`

### Cannot connect to Redis
- Ensure Redis is running: `redis-cli ping` (should return "PONG")
- Check your REDIS_URL in `.env`
- Verify Redis is listening: `redis-cli info server`

### Migration errors
- Ensure the database exists before running migrations
- Check that the user has proper permissions
- Review migration logs for specific errors

### Port already in use
If port 3000 is already in use, change the PORT in your `.env` file.

## Next Steps

This is the foundational backend setup. Future development should include:
- User authentication and authorization
- API endpoints for CRUD operations
- Data validation middleware
- Rate limiting
- API documentation (Swagger/OpenAPI)
- Unit and integration tests

## License

ISC
