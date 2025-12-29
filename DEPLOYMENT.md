# Deployment Guide

## Overview

This guide covers deploying the Crypto Portfolio application to various cloud platforms. The application consists of:
- **Backend**: Node.js/Express API (port 3000)
- **Frontend**: React application (served via Nginx on port 80)
- **Database**: PostgreSQL 15
- **Cache**: Redis 7

## Prerequisites

- GitHub account with repository access
- Docker and Docker Compose installed locally (for testing)
- Account on chosen deployment platform

## Environment Variables

### Backend Required Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `DATABASE_URL` | PostgreSQL connection string | - | Yes |
| `REDIS_URL` | Redis connection string | - | Yes |
| `NODE_ENV` | Environment (production/development) | development | Yes |
| `PORT` | Server port | 3000 | No |
| `PRICE_CACHE_TTL` | Price cache TTL in seconds | 900 | No |
| `COINGECKO_API_URL` | CoinGecko API URL | https://api.coingecko.com/api/v3 | No |
| `SENTRY_DSN` | Sentry error tracking DSN | - | No |
| `SLACK_WEBHOOK_URL` | Slack webhook for alerts | - | No |
| `BYBIT_API_KEY` | Bybit API key (user-provided) | - | No |
| `BYBIT_API_SECRET` | Bybit API secret (user-provided) | - | No |

### Frontend Required Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `VITE_API_URL` | Backend API URL | http://localhost:3000 | Yes |
| `VITE_SENTRY_DSN` | Sentry frontend DSN | - | No |

---

## Deployment Options

### Option A: Railway.app (Recommended for MVP)

Railway provides the simplest deployment experience with managed PostgreSQL and Redis.

#### Step 1: Create Railway Project

1. Go to [railway.app](https://railway.app) and sign up
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your repository

#### Step 2: Add Database Services

1. In your Railway project, click "New" → "Database" → "PostgreSQL"
2. Click "New" → "Database" → "Redis"
3. Wait for both services to be provisioned

#### Step 3: Configure Backend Service

1. Click "New" → "Service" → "Empty Service"
2. Go to "Variables" tab and add:
   - `NODE_ENV=production`
   - `PORT=3000`
   - `PRICE_CACHE_TTL=900`
   - `VITE_API_URL=https://your-frontend-url.up.railway.app` (update after frontend deploy)
3. Go to "Settings" → "Build Command": `npm install`
4. "Start Command": `npm start`
5. Click "Deploy"

#### Step 4: Configure Frontend Service

1. Click "New" → "Service" → "Empty Service"
2. Go to "Variables" tab and add:
   - `VITE_API_URL=https://your-backend-url.up.railway.app`
3. Go to "Settings":
   - "Root Directory": `frontend`
   - "Build Command": `npm install && npm run build`
   - "Start Command": Not needed (Nginx handles it)
4. Create `frontend/railway.json`:
   ```json
   {
     "build": {
       "builder": "NIXPACKS"
     },
     "deploy": {
       "startCommand": "npx serve -s build -l $PORT",
       "healthcheckPath": "/",
       "restartPolicyType": "always"
     }
   }
   ```
5. Click "Deploy"

#### Step 5: Configure Networking

1. In backend service, go to "Settings" → "Networking"
2. Add domain (e.g., `crypto-backend.up.railway.app`)
3. In frontend service, add domain (e.g., `crypto.up.railway.app`)
4. Update `VITE_API_URL` in frontend to match backend domain

#### Step 6: Set Secret Variables

1. Go to backend service → "Variables"
2. Add sensitive variables (marked as "Raw" to hide):
   - `BYBIT_API_KEY`
   - `BYBIT_API_SECRET`
   - `SENTRY_DSN` (if using)
   - `SLACK_WEBHOOK_URL` (if using)

---

### Option B: Vercel (Frontend) + Railway (Backend)

Vercel provides excellent performance for React applications.

#### Backend on Railway

Follow steps 1-6 from Option A (Railway).

#### Frontend on Vercel

1. Go to [vercel.com](https://vercel.com) and sign up
2. Click "Add New..." → "Project"
3. Import your GitHub repository
4. Configure:
   - Framework Preset: Vite
   - Root Directory: `frontend`
   - Build Command: `npm run build`
   - Output Directory: `build`
5. Add environment variable:
   - `VITE_API_URL`: Your Railway backend URL
6. Click "Deploy"
7. Add custom domain in project settings if needed

---

### Option C: Docker Compose on VPS

Full control deployment on a Linux VPS.

#### Prerequisites

- Ubuntu 22.04 LTS server
- Docker and Docker Compose installed
- Domain with DNS pointing to server IP

#### Step 1: Prepare Server

```bash
# SSH into your server
ssh user@your-server-ip

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Add user to docker group
sudo usermod -aG docker $USER
```

#### Step 2: Clone and Configure

```bash
# Clone repository
git clone https://github.com/yourusername/yourrepo.git
cd yourrepo

# Create production environment file
cp .env.production .env
nano .env  # Edit with your values
```

#### Step 3: Set Up Nginx (Reverse Proxy)

```bash
# Install Nginx
sudo apt update
sudo apt install nginx

# Create Nginx configuration
sudo nano /etc/nginx/sites-available/crypto-portfolio
```

```nginx
upstream backend {
    server 127.0.0.1:3000;
}

upstream frontend {
    server 127.0.0.1:3001;
}

server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Frontend
    location / {
        proxy_pass http://frontend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Health check
    location /health {
        proxy_pass http://backend/health;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }

    # Metrics
    location /metrics {
        proxy_pass http://backend/metrics;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/crypto-portfolio /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

#### Step 4: Set Up SSL with Let's Encrypt

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

#### Step 5: Deploy with Docker Compose

```bash
# Create production docker-compose
cat > docker-compose.prod.yml << 'EOF'
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: crypto_portfolio
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    restart: unless-stopped

  backend:
    build:
      context: .
      dockerfile: Dockerfile
    environment:
      DATABASE_URL: postgres://postgres:${POSTGRES_PASSWORD}@postgres:5432/crypto_portfolio
      REDIS_URL: redis://:@redis:6379
      NODE_ENV: production
      PORT: 3000
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    restart: unless-stopped

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    environment:
      VITE_API_URL: https://yourdomain.com
    ports:
      - "3001:80"
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:

networks:
  default:
    name: crypto_portfolio_network
EOF

# Deploy
docker-compose -f docker-compose.prod.yml up -d --build

# Check status
docker-compose -f docker-compose.prod.yml ps
docker-compose -f docker-compose.prod.yml logs -f
```

#### Step 6: Set Up Auto-Update (Optional)

Create a systemd service for automatic updates:

```bash
sudo nano /etc/systemd/system/crypto-portfolio.service
```

```ini
[Unit]
Description=Crypto Portfolio Docker Compose
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
WorkingDirectory=/path/to/yourrepo
ExecStart=/usr/local/bin/docker-compose -f docker-compose.prod.yml up -d --build
ExecStop=/usr/local/bin/docker-compose -f docker-compose.prod.yml down
RemainAfterExit=yes

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable crypto-portfolio.service
sudo systemctl start crypto-portfolio.service
```

---

## Local Development

### Quick Start

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down

# Stop and remove volumes (data loss)
docker-compose down -v
```

### Access Points

| Service | URL | Description |
|---------|-----|-------------|
| Frontend | http://localhost:3001 | React application |
| Backend API | http://localhost:3000 | API server |
| Health Check | http://localhost:3000/health | Health endpoint |
| PostgreSQL | localhost:5432 | Database (postgres/postgres) |
| Redis | localhost:6379 | Cache |

---

## Troubleshooting

### Backend won't start

```bash
# Check backend logs
docker-compose logs backend

# Common issues:
# - Database not ready (wait for postgres health check)
# - Invalid DATABASE_URL format
# - Redis connection failed
```

### Frontend shows "Failed to fetch"

```bash
# Verify VITE_API_URL is correct
echo $VITE_API_URL

# Check backend is accessible from frontend container
docker-compose exec frontend curl http://backend:3000/health
```

### Database connection issues

```bash
# Test database connection
docker-compose exec postgres psql -U postgres -c "SELECT 1"

# Check database logs
docker-compose logs postgres

# Verify DATABASE_URL format:
# postgres://user:password@host:5432/database
```

### SSL certificate issues

```bash
# Check certificate expiry
sudo certbot certificates

# Renew certificates
sudo certbot renew

# Force reload Nginx
sudo nginx -t && sudo systemctl reload nginx
```

---

## Monitoring

### Health Check Endpoints

- `GET /health` - Overall system health
- `GET /health/prices` - Price feed freshness
- `GET /metrics/cache` - Cache statistics
- `GET /metrics/performance` - Performance metrics

### Uptime Monitoring

Configure external monitoring:
1. Uptime Robot: https://uptimerobot.com (free tier: 50 monitors)
2. Set check interval: 5 minutes
3. Alert on: 2 failed checks

Recommended checks:
- `https://yourdomain.com/health`
- `https://yourdomain.com/health/prices`

---

## Scaling Considerations

### Horizontal Scaling (Railway)

1. Go to service settings
2. Increase "Replicas" count
3. Railway handles load balancing

### Vertical Scaling (VPS)

1. Monitor resource usage:
   ```bash
   docker stats
   ```
2. Upgrade server resources (CPU/RAM)
3. Adjust PostgreSQL memory settings

### Database Scaling

- Railway: Upgrade to paid plan for more resources
- VPS: Consider managed RDS (AWS, DigitalOcean)
