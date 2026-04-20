import { Router } from 'express';
import { downloadReport, getMeetingStatus } from '../controllers/download.controller.js';

const router = Router();

router.get('/meetings/:id', getMeetingStatus);
router.get('/meetings/:id/download', downloadReport);

export default router;
