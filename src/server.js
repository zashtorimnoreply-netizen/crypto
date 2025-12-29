const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const compression = require('compression');
const Sentry = require('@sentry/node');
const { ProfilingIntegration } = require('@sentry/profiling-node');
require('dotenv').config();

const db = require('./db');
const { connectRedis, checkConnection: checkRedisConnection, redisClient } = require('./redis');
const errorHandler = require('./middleware/errorHandler');
const logger = require('./utils/logger');
const slack = require('./utils/slack');

const csvRoutes = require('./routes/csv');
const bybitRoutes = require('./routes/bybit');
const pricesRoutes = require('./routes/prices');
const portfoliosRoutes = require('./routes/portfolios');
const simulationsRoutes = require('./routes/simulations');
const reportsRoutes = require('./routes/reports');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Sentry
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    integrations: [
      new Sentry.Integrations.Http({ tracing: true }),
      new Sentry.Integrations.Express({ 
        app,
        request: true, 
        serverName: false 
      }),
      new ProfilingIntegration(),
    ],
  });
  
  logger.info('Sentry initialized', { 
    environment: process.env.NODE_ENV,
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  });
  
  // Sentry request handler must be first
  app.use(Sentry.Handlers.requestHandler());
  app.use(Sentry.Handlers.tracingHandler());
}

app.use(cors());
app.use(compression()); // Enable gzip compression for API responses
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Performance monitoring middleware
const requestStats = {
  totalRequests: 0,
  slowRequests: 0,
  errorRequests: 0,
  requestsByEndpoint: new Map(),
};

app.use((req, res, next) => {
  const startTime = Date.now();
  const endpoint = `${req.method} ${req.path}`;
  
  // Track request start
  requestStats.totalRequests++;
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const statusCode = res.statusCode;
    
    // Track endpoint statistics
    if (!requestStats.requestsByEndpoint.has(endpoint)) {
      requestStats.requestsByEndpoint.set(endpoint, {
        count: 0,
        totalDuration: 0,
        errors: 0,
        durations: [],
      });
    }
    
    const stats = requestStats.requestsByEndpoint.get(endpoint);
    stats.count++;
    stats.totalDuration += duration;
    stats.durations.push(duration);
    
    // Keep only last 100 durations for percentile calculation
    if (stats.durations.length > 100) {
      stats.durations.shift();
    }
    
    if (statusCode >= 400) {
      stats.errors++;
      requestStats.errorRequests++;
    }
    
    // Log slow requests
    const isSlowRequest = duration > 1000; // 1 second threshold
    if (isSlowRequest) {
      requestStats.slowRequests++;
      logger.warn('Slow request detected', {
        method: req.method,
        path: req.path,
        duration: `${duration}ms`,
        statusCode,
      });
      
      // Send Sentry event for very slow requests (>3s)
      if (process.env.SENTRY_DSN && duration > 3000) {
        Sentry.captureMessage(
          `Very slow request: ${req.method} ${req.path} (${duration}ms)`,
          'warning'
        );
      }
    }
    
    // Log request completion
    logger.info('Request completed', {
      method: req.method,
      path: req.path,
      statusCode,
      duration: `${duration}ms`,
    });
  });
  
  next();
});

// Health check endpoint with detailed status
app.get('/health', async (req, res, next) => {
  try {
    const healthStatus = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      postgres: 'disconnected',
      redis: 'disconnected',
    };

    // Check Postgres
    try {
      const postgresConnected = await db.checkConnection();
      healthStatus.postgres = postgresConnected ? 'connected' : 'disconnected';
      if (!postgresConnected) {
        healthStatus.status = 'degraded';
        healthStatus.error = 'Database connection failed';
      }
    } catch (error) {
      healthStatus.postgres = 'disconnected';
      healthStatus.status = 'degraded';
      healthStatus.error = error.message;
      logger.error('Health check: Postgres failed', error);
    }

    // Check Redis
    try {
      const redisConnected = await checkRedisConnection();
      healthStatus.redis = redisConnected ? 'connected' : 'disconnected';
      if (!redisConnected) {
        healthStatus.status = 'degraded';
        healthStatus.error = healthStatus.error || 'Redis connection failed';
      }
    } catch (error) {
      healthStatus.redis = 'disconnected';
      healthStatus.status = 'degraded';
      healthStatus.error = healthStatus.error || error.message;
      logger.error('Health check: Redis failed', error);
    }

    const statusCode = healthStatus.status === 'ok' ? 200 : 503;
    
    // Alert on degraded health
    if (healthStatus.status === 'degraded' && process.env.SLACK_WEBHOOK_URL) {
      await slack.critical(
        'System Health Degraded',
        `Health check failed: ${healthStatus.error}`,
        {
          postgres: healthStatus.postgres,
          redis: healthStatus.redis,
          uptime: `${Math.floor(healthStatus.uptime)}s`,
        }
      );
    }
    
    res.status(statusCode).json(healthStatus);
  } catch (error) {
    logger.error('Health check failed', error);
    next(error);
  }
});

// Price feed health check
app.get('/health/prices', async (req, res, next) => {
  try {
    const priceHealth = {
      status: 'healthy',
      lastUpdate: new Date().toISOString(),
      symbols: {},
    };

    const symbols = ['BTC', 'ETH', 'SOL', 'USDT', 'USDC'];
    
    for (const symbol of symbols) {
      try {
        const cached = await redisClient.get(`price:${symbol}`);
        
        if (!cached) {
          priceHealth.symbols[symbol] = {
            status: 'no_data',
            message: 'No cached price data',
          };
          priceHealth.status = 'degraded';
          continue;
        }

        const { price, timestamp } = JSON.parse(cached);
        const ageMs = Date.now() - new Date(timestamp).getTime();
        const ageMins = Math.floor(ageMs / 60000);

        priceHealth.symbols[symbol] = {
          lastPrice: price,
          updatedAt: timestamp,
          age: `${ageMins}m`,
          status: ageMins > 30 ? 'stale' : 'current',
        };

        if (ageMins > 30) {
          priceHealth.status = 'degraded';
        }
      } catch (error) {
        priceHealth.symbols[symbol] = {
          status: 'error',
          error: error.message,
        };
        priceHealth.status = 'degraded';
      }
    }

    const statusCode = priceHealth.status === 'healthy' ? 200 : 503;
    
    // Alert on stale prices
    if (priceHealth.status === 'degraded' && process.env.SLACK_WEBHOOK_URL) {
      const staleSymbols = Object.entries(priceHealth.symbols)
        .filter(([_, data]) => data.status === 'stale')
        .map(([symbol]) => symbol);
      
      if (staleSymbols.length > 0) {
        await slack.warning(
          'Price Feed Degraded',
          `Stale price data detected for symbols: ${staleSymbols.join(', ')}`,
          {
            staleness: 'Data older than 30 minutes',
          }
        );
      }
    }
    
    res.status(statusCode).json(priceHealth);
  } catch (error) {
    logger.error('Price health check failed', error);
    next(error);
  }
});

// Cache metrics endpoint
app.get('/metrics/cache', async (req, res, next) => {
  try {
    const priceService = require('./services/priceService');
    const equityCurveService = require('./services/equityCurveService');
    const dcaSimulatorService = require('./services/dcaSimulatorService');

    const metrics = {
      timestamp: new Date().toISOString(),
      priceCache: priceService.getPriceCacheStats(),
      equityCurveCache: equityCurveService.getCacheStats(),
      simulatorCache: dcaSimulatorService.getSimCacheStats(),
    };

    res.json(metrics);
  } catch (error) {
    logger.error('Failed to get cache metrics', error);
    next(error);
  }
});

// Performance metrics endpoint
app.get('/metrics/performance', async (req, res, next) => {
  try {
    const endpoints = {};
    
    // Calculate percentiles for each endpoint
    for (const [endpoint, stats] of requestStats.requestsByEndpoint.entries()) {
      if (stats.count === 0) continue;
      
      const sortedDurations = [...stats.durations].sort((a, b) => a - b);
      const p50Index = Math.floor(sortedDurations.length * 0.5);
      const p95Index = Math.floor(sortedDurations.length * 0.95);
      const p99Index = Math.floor(sortedDurations.length * 0.99);
      
      endpoints[endpoint] = {
        count: stats.count,
        avg_response_time: `${Math.round(stats.totalDuration / stats.count)}ms`,
        p50_response_time: `${sortedDurations[p50Index] || 0}ms`,
        p95_response_time: `${sortedDurations[p95Index] || 0}ms`,
        p99_response_time: `${sortedDurations[p99Index] || 0}ms`,
        error_count: stats.errors,
        error_rate: `${((stats.errors / stats.count) * 100).toFixed(2)}%`,
      };
    }

    const metrics = {
      timestamp: new Date().toISOString(),
      uptime: `${Math.floor(process.uptime())}s`,
      totalRequests: requestStats.totalRequests,
      slowRequests: requestStats.slowRequests,
      errorRequests: requestStats.errorRequests,
      errorRate: requestStats.totalRequests > 0 
        ? `${((requestStats.errorRequests / requestStats.totalRequests) * 100).toFixed(2)}%`
        : '0%',
      endpoints,
    };

    res.json(metrics);
  } catch (error) {
    logger.error('Failed to get performance metrics', error);
    next(error);
  }
});

app.use('/api', csvRoutes);
app.use('/api', bybitRoutes);
app.use('/api', pricesRoutes);
app.use('/api', portfoliosRoutes);
app.use('/api', simulationsRoutes);
app.use('/api', reportsRoutes);

// Sentry error handler must be before other error handlers
if (process.env.SENTRY_DSN) {
  app.use(Sentry.Handlers.errorHandler());
}

app.use(errorHandler);

// Global error handlers
process.on('unhandledRejection', (reason, promise) => {
  const error = new Error(`Unhandled Rejection: ${reason}`);
  logger.fatal('Unhandled promise rejection', error, {
    promise: promise.toString(),
  });
  
  if (process.env.SENTRY_DSN) {
    Sentry.captureException(error);
  }
  
  if (process.env.SLACK_WEBHOOK_URL) {
    slack.critical(
      'Unhandled Promise Rejection',
      error.message,
      { stack: error.stack }
    );
  }
});

process.on('uncaughtException', (error) => {
  logger.fatal('Uncaught exception', error);
  
  if (process.env.SENTRY_DSN) {
    Sentry.captureException(error);
  }
  
  if (process.env.SLACK_WEBHOOK_URL) {
    slack.critical(
      'Uncaught Exception',
      error.message,
      { stack: error.stack }
    );
  }
  
  // Give time for logging and alerts before exiting
  setTimeout(() => {
    process.exit(1);
  }, 1000);
});

const startServer = async () => {
  try {
    await connectRedis();
    
    app.listen(PORT, () => {
      logger.info('Server started', {
        port: PORT,
        environment: process.env.NODE_ENV || 'development',
        nodeVersion: process.version,
      });
      console.log(`Server is running on port ${PORT}`);
      console.log(`Health check available at http://localhost:${PORT}/health`);
      console.log(`Metrics available at http://localhost:${PORT}/metrics/performance`);
      console.log(`Cache stats available at http://localhost:${PORT}/metrics/cache`);
      console.log(`Price health available at http://localhost:${PORT}/health/prices`);
    });
  } catch (error) {
    logger.fatal('Failed to start server', error);
    
    if (process.env.SENTRY_DSN) {
      Sentry.captureException(error);
    }
    
    if (process.env.SLACK_WEBHOOK_URL) {
      await slack.critical(
        'Server Startup Failed',
        error.message,
        { stack: error.stack }
      );
    }
    
    process.exit(1);
  }
};

startServer();

module.exports = app;
