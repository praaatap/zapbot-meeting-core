import { Router } from 'express';
import { getPresignedUrl, notifyUploadComplete } from '../controllers/upload.controller.js';

const router = Router();

// Route to get a presigned URL for S3 upload
router.post('/presigned-url', getPresignedUrl);

// Route to notify that the upload is complete and trigger processing
router.post('/complete', notifyUploadComplete);

export default router;
