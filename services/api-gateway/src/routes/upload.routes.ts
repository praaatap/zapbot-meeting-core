import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { uploadRateLimiter } from '../middleware/rateLimiter.js';
import axios from 'axios';
import { logger } from '@echomeet/shared';

const router = Router();
const UPLOAD_SERVICE_URL = process.env.UPLOAD_SERVICE_URL || 'http://upload-service:3001';

router.post('/presigned-url', authenticate, uploadRateLimiter, async (req, res, next) => {
  try {
    const requestId = req.headers['x-request-id'];
    logger.info('Forwarding presigned-url request to upload-service', { requestId });

    const response = await axios.post(`${UPLOAD_SERVICE_URL}/upload/presigned-url`, req.body, {
      headers: {
        ...req.headers,
        'x-user-id': (req as any).user.id,
      }
    });

    res.status(response.status).json(response.data);
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    next(error);
  }
});

router.post('/complete', authenticate, async (req, res, next) => {
  try {
    const requestId = req.headers['x-request-id'];
    logger.info('Forwarding upload complete notification to upload-service', { requestId });

    const response = await axios.post(`${UPLOAD_SERVICE_URL}/upload/complete`, req.body, {
      headers: {
        ...req.headers,
        'x-user-id': (req as any).user.id,
      }
    });

    res.status(response.status).json(response.data);
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    next(error);
  }
});

export default router;
