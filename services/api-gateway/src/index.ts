import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { 
  logger, 
  AppError, 
  registry 
} from '@echomeet/shared';
import { requestIdMiddleware, requestLogger } from './middleware/requestLogger.js';
import { globalRateLimiter } from './middleware/rateLimiter.js';
import healthRoutes from './routes/health.routes.js';
import uploadRoutes from './routes/upload.routes.js';
import meetingRoutes from './routes/meeting.routes.js';
import botRoutes from './routes/bot.routes.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Security Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Request Tracking & Logging
app.use(requestIdMiddleware);
app.use(requestLogger);

// Global Rate Limiting
app.use(globalRateLimiter);

// Metrics Endpoint
app.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', registry.contentType);
    res.end(await registry.metrics());
  } catch (err) {
    res.status(500).end(err);
  }
});

// Routes
app.use('/health', healthRoutes);
app.use('/api/v1/upload', uploadRoutes);
app.use('/api/v1/meetings', meetingRoutes);
app.use('/api/v1/bots', botRoutes);

// 404 Handler
app.use((req, res, next) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Error Handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  const requestId = req.headers['x-request-id'];
  
  if (err instanceof AppError) {
    logger.warn(`AppError: ${err.message}`, { requestId, code: err.code });
    return res.status(err.statusCode).json({
      error: err.message,
      code: err.code,
      requestId
    });
  }

  logger.error('Unhandled Error', { 
    requestId, 
    error: err.message, 
    stack: err.stack 
  });

  res.status(500).json({
    error: 'Internal Server Error',
    requestId
  });
});

app.listen(PORT, () => {
  logger.info(`API Gateway started on port ${PORT}`);
});
