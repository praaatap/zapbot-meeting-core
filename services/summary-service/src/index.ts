import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';
import { logger, registry } from '@echomeet/shared';
import { summaryConsumer } from './workers/sqs.consumer.js';

const app = express();
const PORT = process.env.PORT || 3004;

// Metrics Endpoint
app.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', registry.contentType);
    res.end(await registry.metrics());
  } catch (err) {
    res.status(500).end(err);
  }
});

// Health Check
app.get('/health', (req, res) => {
  const mongoStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  res.status(200).json({ 
    status: 'ok', 
    service: 'summary-service',
    mongo: mongoStatus
  });
});

const start = async () => {
  try {
    // 1. Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/echomeet';
    await mongoose.connect(mongoUri);
    logger.info('Connected to MongoDB');

    // 2. Start SQS Consumer
    summaryConsumer.start();
    logger.info('Summary Consumer started');

    // 3. Start HTTP server for health/metrics
    app.listen(PORT, () => {
      logger.info(`Summary Service HTTP server started on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start Summary Service', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received. Shutting down gracefully.');
  await summaryConsumer.stop();
  await mongoose.connection.close();
  process.exit(0);
});

start();
