# Local Development Setup with Railway Databases

This guide explains how to set up the complete development environment using Docker Compose for backend and frontend, connected to Railway-managed PostgreSQL and Redis databases.

## Table of Contents
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Environment Configuration](#environment-configuration)
- [Database Setup](#database-setup)
- [Running the Application](#running-the-application)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)
- [Development Workflow](#development-workflow)

## Prerequisites

Before you begin, ensure you have the following installed:

- **Docker Desktop** (v20.10+)
  - [macOS](https://docs.docker.com/desktop/install/mac-install/)
  - [Windows](https://docs.docker.com/desktop/install/windows-install/)
  - [Linux](https://docs.docker.com/desktop/install/linux-install/)
- **Docker Compose** (v2.0+) - Included with Docker Desktop
- **PostgreSQL Client** (optional, for database inspection)
  ```bash
  # macOS
  brew install postgresql
  
  # Ubuntu/Debian
  sudo apt-get install postgresql-client
  ```
- **Redis CLI** (optional, for cache inspection)
  ```bash
  # macOS
  brew install redis
  
  # Ubuntu/Debian
  sudo apt-get install redis-tools
  ```

## Quick Start

Follow these steps to get the application running locally:

```bash
# 1. Clone the repository (if not already done)
git clone <repository-url>
cd crypto-portfolio

# 2. Environment files are already configured with Railway credentials
# Verify they exist:
ls .env frontend/.env

# 3. Start all services with Docker Compose
docker-compose up --build

# 4. In a new terminal, run database migrations
docker-compose exec backend npm run migrate:up

# 5. Open the application
# Frontend: http://localhost:3001
# Backend Health: http://localhost:3000/health
```

## Environment Configuration

### Backend Environment (.env)

The `.env` file at the project root contains Railway database credentials:

```bash
# Railway PostgreSQL
DATABASE_URL=postgresql://postgres:bKGJHDBeptVfpXIJpNrXMuoatJoJyits@interchange.proxy.rlwy.net:44326/railway

# Railway Redis
REDIS_URL=redis://default:qMwJXsitecclWoeYuzXhQpHGJepuFIVe@interchange.proxy.rlwy.net:12112

# Server
NODE_ENV=development
PORT=3000

# Price Service Configuration
PRICE_CACHE_TTL=900
COINGECKO_API_URL=https://api.coingecko.com/api/v3
```

**Important:** The `.env` file is included in `.gitignore` to prevent accidental commits of credentials.

### Frontend Environment (frontend/.env)

The `frontend/.env` file configures the API endpoint:

```bash
# API Configuration
VITE_API_URL=http://localhost:3000

# Environment
VITE_ENV=development
```

### Railway Database Credentials

**PostgreSQL:**
- **Host:** interchange.proxy.rlwy.net
- **Port:** 44326
- **Database:** railway
- **User:** postgres
- **Password:** bKGJHDBeptVfpXIJpNrXMuoatJoJyits
- **Connection URL:** `postgresql://postgres:bKGJHDBeptVfpXIJpNrXMuoatJoJyits@interchange.proxy.rlwy.net:44326/railway`

**Redis:**
- **Host:** interchange.proxy.rlwy.net
- **Port:** 12112
- **User:** default
- **Password:** qMwJXsitecclWoeYuzXhQpHGJepuFIVe
- **Connection URL:** `redis://default:qMwJXsitecclWoeYuzXhQpHGJepuFIVe@interchange.proxy.rlwy.net:12112`

## Database Setup

### Test PostgreSQL Connection

Before starting the containers, verify Railway PostgreSQL is accessible:

```bash
psql postgresql://postgres:bKGJHDBeptVfpXIJpNrXMuoatJoJyits@interchange.proxy.rlwy.net:44326/railway

# Inside psql:
\dt              # List all tables
SELECT version(); # Show PostgreSQL version
\q               # Quit
```

**Expected Output:** Successful connection to PostgreSQL 15.x

### Test Redis Connection

Verify Railway Redis is accessible:

```bash
redis-cli -h interchange.proxy.rlwy.net -p 12112 -a qMwJXsitecclWoeYuzXhQpHGJepuFIVe

# Inside redis-cli:
PING            # Should return: PONG
INFO server     # Show Redis info
QUIT            # Exit
```

**Expected Output:** `PONG` response

### Run Database Migrations

After starting the containers, execute migrations:

```bash
# Run all pending migrations
docker-compose exec backend npm run migrate:up

# View migration status
docker-compose exec backend npm run migrate:status

# Rollback last migration (if needed)
docker-compose exec backend npm run migrate:down
```

**Expected Output:**
```
Migration 001-initial-schema.js completed
Migration 002-add-indexes.js completed
Migration 003-add-public-reports.js completed
```

## Running the Application

### Start All Services

```bash
# Build and start all services in foreground
docker-compose up --build

# Or start in background (detached mode)
docker-compose up -d --build

# View logs (if running in detached mode)
docker-compose logs -f

# View logs for specific service
docker-compose logs -f backend
docker-compose logs -f frontend
```

### Verify Services are Running

```bash
# Check service status
docker-compose ps

# Should show:
# NAME                    STATUS
# crypto-backend          Up (healthy)
# crypto-frontend         Up (healthy)
```

### Access the Application

- **Frontend:** http://localhost:3001
- **Backend API:** http://localhost:3000/api
- **Health Check:** http://localhost:3000/health
- **Performance Metrics:** http://localhost:3000/metrics/performance
- **Cache Metrics:** http://localhost:3000/metrics/cache

### Health Check Response

```bash
curl http://localhost:3000/health
```

**Expected Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-12-29T14:30:00Z",
  "postgres": "connected",
  "redis": "connected",
  "uptime": 45.23
}
```

## Testing

### Test CSV Import

Create a test CSV file (`test.csv`):

```csv
timestamp,symbol,side,qty,price,fee,exchange
2024-01-01T10:00:00Z,BTC,BUY,0.5,42000,10,CSV
2024-01-15T14:30:00Z,ETH,BUY,5,2500,25,CSV
2024-02-01T11:00:00Z,SOL,BUY,100,50,5,CSV
```

Upload via API:

```bash
curl -X POST http://localhost:3000/api/portfolios/test-123/import-csv \
  -F "file=@test.csv"
```

**Expected Response:**
```json
{
  "success": true,
  "inserted_count": 3,
  "message": "CSV import successful"
}
```

Verify data in database:

```bash
psql postgresql://postgres:bKGJHDBeptVfpXIJpNrXMuoatJoJyits@interchange.proxy.rlwy.net:44326/railway

# In psql:
SELECT * FROM trades WHERE portfolio_id = 'test-123';
```

### Test DCA Simulator

```bash
curl -X POST http://localhost:3000/api/simulations/dca \
  -H "Content-Type: application/json" \
  -d '{
    "asset": "BTC",
    "startDate": "2024-01-01",
    "endDate": "2024-12-31",
    "amount": 500,
    "interval": "weekly"
  }'
```

**Expected Response:** JSON with DCA results (final value, CAGR, etc.)

### Test Preset Portfolios

```bash
curl http://localhost:3000/api/simulations/presets
```

**Expected Response:** Array of preset configurations (BTC 100%, BTC/ETH 70/30, etc.)

### Verify Redis Caching

```bash
redis-cli -h interchange.proxy.rlwy.net -p 12112 -a qMwJXsitecclWoeYuzXhQpHGJepuFIVe

# List all cached keys
KEYS *

# Check if BTC price is cached
GET price:BTC

# Should return JSON with price data
```

## Troubleshooting

### Common Issues and Solutions

#### 1. Cannot Connect to PostgreSQL

**Error:** `ECONNREFUSED` or `Connection timeout`

**Solutions:**
- Verify Railway PostgreSQL service is running
- Check DATABASE_URL in `.env` is correct
- Ensure no firewall blocking port 44326
- Test connection manually: `psql <DATABASE_URL>`

#### 2. Cannot Connect to Redis

**Error:** `ECONNREFUSED` or `Redis connection failed`

**Solutions:**
- Verify Railway Redis service is running
- Check REDIS_URL in `.env` is correct
- Ensure no firewall blocking port 12112
- Test connection manually: `redis-cli -h interchange.proxy.rlwy.net -p 12112 -a <password>`

#### 3. Port Already in Use

**Error:** `Bind for 0.0.0.0:3000 failed: port is already allocated`

**Solutions:**
```bash
# Find process using port 3000
lsof -ti:3000

# Kill the process
lsof -ti:3000 | xargs kill -9

# Or change port in docker-compose.yml
ports:
  - "3001:3000"  # Use 3001 instead
```

#### 4. Frontend Shows Blank Page

**Error:** Blank page with console errors

**Solutions:**
- Check browser console for errors (F12)
- Verify VITE_API_URL in `frontend/.env`
- Ensure backend is healthy: `curl http://localhost:3000/health`
- Check nginx logs: `docker-compose logs frontend`

#### 5. Migrations Fail

**Error:** `Migration failed: permission denied`

**Solutions:**
```bash
# Ensure PostgreSQL has proper permissions
# Connect to database
psql <DATABASE_URL>

# Grant permissions
GRANT ALL PRIVILEGES ON DATABASE railway TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres;
```

#### 6. Container Won't Start

**Error:** `Container exited with code 1`

**Solutions:**
```bash
# Check logs for specific error
docker-compose logs backend
docker-compose logs frontend

# Rebuild without cache
docker-compose down
docker-compose build --no-cache
docker-compose up
```

#### 7. Health Check Failing

**Error:** `Container unhealthy`

**Solutions:**
```bash
# Check backend health endpoint
curl http://localhost:3000/health

# If postgres/redis disconnected:
# - Verify Railway services are running
# - Check .env credentials
# - Test manual connections (see Database Setup section)
```

### Debug Commands

```bash
# View all logs
docker-compose logs

# Follow logs in real-time
docker-compose logs -f

# View logs for specific service
docker-compose logs backend
docker-compose logs frontend

# Execute command inside container
docker-compose exec backend sh
docker-compose exec frontend sh

# Inspect container
docker inspect <container-id>

# View environment variables
docker-compose exec backend env
```

### Cleanup Commands

```bash
# Stop all containers (keep data)
docker-compose stop

# Stop and remove containers (keep data)
docker-compose down

# Stop, remove everything including volumes (DELETE DATA)
docker-compose down -v

# Rebuild everything from scratch
docker-compose down -v
docker-compose build --no-cache
docker-compose up --build
```

## Development Workflow

### Hot Reload

**Backend:**
- Source code is mounted as volume (`./src:/app/src`)
- Changes require container restart:
  ```bash
  docker-compose restart backend
  ```

**Frontend:**
- Source code is mounted during build
- Changes require rebuild:
  ```bash
  docker-compose up --build frontend
  ```

### Making Code Changes

1. **Edit files** in your local editor
2. **Backend changes:**
   ```bash
   docker-compose restart backend
   ```
3. **Frontend changes:**
   ```bash
   docker-compose up --build -d frontend
   ```

### Running Tests

```bash
# Run E2E tests
docker-compose exec backend npm run test:e2e

# Run specific test file
docker-compose exec backend node tests/run-e2e-tests.js
```

### Database Management

```bash
# Create new migration
docker-compose exec backend npm run migrate:create <migration-name>

# Run migrations
docker-compose exec backend npm run migrate:up

# Rollback migration
docker-compose exec backend npm run migrate:down

# Seed test price data
docker-compose exec backend npm run seed:prices
```

### Monitoring

**View Performance Metrics:**
```bash
curl http://localhost:3000/metrics/performance
```

**View Cache Statistics:**
```bash
curl http://localhost:3000/metrics/cache
```

**Check Price Feed Health:**
```bash
curl http://localhost:3000/health/prices
```

## Architecture Overview

### Docker Compose Services

```
┌─────────────────────────────────────────────────────────────┐
│                     Docker Compose                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐           ┌──────────────┐              │
│  │   Backend    │◄─────────►│   Frontend   │              │
│  │   (Node.js)  │           │  (React+Nginx)│              │
│  │   Port 3000  │           │   Port 3001   │              │
│  └──────┬───────┘           └───────────────┘              │
│         │                                                   │
│         │ Connects to Railway (external)                   │
│         │                                                   │
└─────────┼───────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│                   Railway Platform                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐           ┌──────────────┐              │
│  │ PostgreSQL   │           │    Redis     │              │
│  │   Port       │           │   Port       │              │
│  │   44326      │           │   12112      │              │
│  └──────────────┘           └──────────────┘              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Request Flow

1. User opens http://localhost:3001
2. Nginx serves React app
3. React app makes API call to `/api/portfolios`
4. Nginx proxies request to `backend:3000/api/portfolios`
5. Backend queries Railway PostgreSQL
6. Backend caches result in Railway Redis
7. Response sent back to frontend

## Next Steps

After successful setup:

1. **Explore the UI:** Open http://localhost:3001
2. **Import trades:** Use CSV upload or Bybit API sync
3. **View portfolios:** Check performance metrics and allocations
4. **Run simulations:** Test DCA strategies and preset portfolios
5. **Monitor health:** Check `/health` and `/metrics` endpoints

## Additional Resources

- [API Documentation](./SIMULATIONS_API_DOCS.md)
- [Deployment Guide](./DEPLOYMENT.md)
- [Disaster Recovery](./DISASTER_RECOVERY.md)
- [Frontend Setup](./FRONTEND_SETUP.md)
- [Bybit API Usage](./BYBIT_API_USAGE.md)

## Support

If you encounter issues not covered in this guide:

1. Check the [Troubleshooting](#troubleshooting) section
2. Review Docker logs: `docker-compose logs`
3. Verify Railway services are running
4. Check GitHub issues for known problems
5. Create a new issue with detailed error logs

---

**Last Updated:** December 29, 2024  
**Version:** 1.0.0
