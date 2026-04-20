import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import axios from 'axios';
import { logger, Meeting } from '@echomeet/shared';

const router = Router();
const DELIVERY_SERVICE_URL = process.env.DELIVERY_SERVICE_URL || 'http://delivery-service:3005';

router.get('/:id', authenticate, async (req, res, next) => {
  const { id } = req.params;
  const requestId = req.headers['x-request-id'];
  const userId = (req as any).user.id;

  try {
    logger.info(`Fetching meeting status for ${id}`, { requestId });

    const meeting = await Meeting.findOne({ meetingId: id, userId });
    
    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    res.status(200).json(meeting);
  } catch (error) {
    logger.error('Failed to fetch meeting status', { requestId, meetingId: id, error });
    next(error);
  }
});

router.get('/:id/download', authenticate, async (req, res, next) => {
  try {
    const requestId = req.headers['x-request-id'];
    logger.info(`Forwarding download request for ${req.params.id}`, { requestId });

    const response = await axios.get(`${DELIVERY_SERVICE_URL}/meetings/${req.params.id}/download`, {
      headers: {
        ...req.headers,
        'x-user-id': (req as any).user.id,
      },
      responseType: 'stream'
    });

    res.setHeader('Content-Type', response.headers['content-type']);
    response.data.pipe(res);
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    next(error);
  }
});

export default router;
