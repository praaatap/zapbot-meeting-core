import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { logger, AppError, registry } from '@echomeet/shared';
import uploadRoutes from './routes/upload.routes.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

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
  res.status(200).json({ status: 'ok', service: 'upload-service' });
});

// Routes
app.use('/upload', uploadRoutes);

// Error Handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  const requestId = req.headers['x-request-id'] || 'unknown';
  
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: err.message,
      code: err.code,
      requestId
    });
  }

  logger.error('Unhandled Error in Upload Service', { 
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
  logger.info(`Upload Service started on port ${PORT}`);
});
