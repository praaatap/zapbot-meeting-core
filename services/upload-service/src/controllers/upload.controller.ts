import { Request, Response } from 'express';
import { S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
import { logger, AudioUploadedPayload, Meeting, MeetingStatus } from '@echomeet/shared';
import { transcriptionPublisher } from '../queues/sqs.publisher.js';
import { validateUploadRequest } from '../validators/upload.validator.js';

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  ...(process.env.S3_ENDPOINT ? { endpoint: process.env.S3_ENDPOINT, forcePathStyle: true } : {})
});

const BUCKET_NAME = process.env.S3_BUCKET_NAME || 'echomeet-raw-audio';

export const getPresignedUrl = async (req: Request, res: Response) => {
  const requestId = req.headers['x-request-id'] as string;
  const userId = req.headers['x-user-id'] as string;

  try {
    const validatedData = validateUploadRequest(req.body);
    const meetingId = uuidv4();
    const fileExtension = req.body.fileName?.split('.').pop() || 'mp3';
    const s3Key = `raw-audio/${userId}/${meetingId}.${fileExtension}`;

    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: s3Key,
      ContentType: req.body.contentType || 'audio/mpeg',
      Metadata: {
        userId,
        meetingId,
        title: validatedData.title,
      }
    });

    const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

    // Create Meeting record
    await Meeting.create({
      meetingId,
      userId,
      title: validatedData.title || 'Untitled Meeting',
      status: MeetingStatus.UPLOADING,
      audioS3Key: s3Key,
    });

    logger.info('Generated presigned URL and created Meeting record', { requestId, meetingId, s3Key });

    res.status(200).json({
      meetingId,
      presignedUrl,
      s3Key,
    });
  } catch (error) {
    logger.error('Failed to generate presigned URL', { requestId, error });
    res.status(500).json({ error: 'Failed to generate upload URL' });
  }
};

export const notifyUploadComplete = async (req: Request, res: Response) => {
  const requestId = req.headers['x-request-id'] as string;
  const userId = req.headers['x-user-id'] as string;
  const { meetingId, s3Key, duration } = req.body;

  try {
    if (!meetingId || !s3Key) {
      return res.status(400).json({ error: 'meetingId and s3Key are required' });
    }

    const payload: AudioUploadedPayload = {
      meetingId,
      userId,
      s3Key,
      duration: duration || 0,
      timestamp: new Date().toISOString(),
      requestId
    };

    await transcriptionPublisher.publish(payload, requestId);

    // Update Meeting status
    await Meeting.findOneAndUpdate(
      { meetingId },
      { 
        status: MeetingStatus.TRANSCRIBING,
        duration: duration || 0
      }
    );

    logger.info('Upload completion notified, job published, and status updated', { 
      requestId, 
      meetingId, 
      s3Key 
    });

    res.status(200).json({ status: 'success', meetingId });
  } catch (error) {
    logger.error('Failed to notify upload completion', { requestId, error });
    res.status(500).json({ error: 'Internal server error' });
  }
};
