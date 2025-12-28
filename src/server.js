const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

const db = require('./db');
const { connectRedis, checkConnection: checkRedisConnection } = require('./redis');
const errorHandler = require('./middleware/errorHandler');

const csvRoutes = require('./routes/csv');
const bybitRoutes = require('./routes/bybit');
const pricesRoutes = require('./routes/prices');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/health', async (req, res, next) => {
  try {
    const postgresConnected = await db.checkConnection();
    const redisConnected = await checkRedisConnection();

    const status = postgresConnected && redisConnected ? 'ok' : 'degraded';
    const statusCode = status === 'ok' ? 200 : 503;

    res.status(statusCode).json({
      status,
      postgres: postgresConnected ? 'connected' : 'disconnected',
      redis: redisConnected ? 'connected' : 'disconnected',
    });
  } catch (error) {
    next(error);
  }
});

app.use('/api', csvRoutes);
app.use('/api', bybitRoutes);
app.use('/api', pricesRoutes);

app.use(errorHandler);

const startServer = async () => {
  try {
    await connectRedis();
    
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
      console.log(`Health check available at http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

module.exports = app;
