import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import axios from 'axios';
import { logger } from '@echomeet/shared';

const router = Router();
const BOT_SERVICE_URL = process.env.BOT_SERVICE_URL || 'http://bot-service:3006';

router.post('/dispatch', authenticate, async (req, res, next) => {
  try {
    const requestId = req.headers['x-request-id'];
    const userId = (req as any).user.id;

    logger.info('Forwarding bot dispatch request', { requestId, userId });

    const response = await axios.post(`${BOT_SERVICE_URL}/dispatch`, req.body, {
      headers: {
        'x-request-id': requestId,
        'x-user-id': userId
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
