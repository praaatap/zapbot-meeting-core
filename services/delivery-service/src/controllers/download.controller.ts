import { Request, Response } from 'express';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { logger } from '@echomeet/shared';
import Report from '../models/report.model.js';
import { Readable } from 'stream';

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  ...(process.env.S3_ENDPOINT ? { endpoint: process.env.S3_ENDPOINT, forcePathStyle: true } : {})
});

export const downloadReport = async (req: Request, res: Response) => {
  const { id } = req.params;
  const requestId = req.headers['x-request-id'] as string;

  try {
    const report = await Report.findOne({ meetingId: id });
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    const command = new GetObjectCommand({
      Bucket: process.env.S3_REPORTS_BUCKET || 'echomeet-reports',
      Key: report.pdfS3Key,
    });

    const response = await s3Client.send(command);
    
    if (!response.Body) {
      return res.status(404).json({ error: 'PDF file not found in storage' });
    }

    // Update download count (fire and forget)
    Report.updateOne({ meetingId: id }, { $inc: { downloadCount: 1 } }).exec();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="MeetingReport_${id}.pdf"`);
    
    // Pipe S3 body to express response
    if (response.Body instanceof Readable) {
      response.Body.pipe(res);
    } else {
      // In some environments response.Body might be different
      const stream = Readable.from(response.Body as any);
      stream.pipe(res);
    }
  } catch (error) {
    logger.error('Failed to download report', { requestId, meetingId: id, error });
    res.status(500).json({ error: 'Failed to download report' });
  }
};

export const getMeetingStatus = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const report = await Report.findOne({ meetingId: id });
    if (report) {
      return res.status(200).json({ status: 'delivered', report });
    }
    // Check if it exists in earlier stages if we had a global tracking service
    // For now, if no report, we just say 'processing' if we can't find it in failure logs
    res.status(200).json({ status: 'processing or not found' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};
