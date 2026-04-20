import { BaseConsumer, QUEUES, SummaryCompletedPayload, logger, Meeting, MeetingStatus } from '@echomeet/shared';
import mongoose from 'mongoose';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { generateMeetingPdf } from '../processors/pdf.processor.js';
import { sendMeetingReportEmail } from '../processors/email.processor.js';
import Report from '../models/report.model.js';

// Schema for Summary (shared DB)
const SummarySchema = new mongoose.Schema({
  meetingId: String,
  summary: String,
  actionItems: Array,
  decisions: Array,
  keyTopics: Array
}, { strict: false });

const Summary = mongoose.model('Summary', SummarySchema, 'summaries');

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  ...(process.env.S3_ENDPOINT ? { endpoint: process.env.S3_ENDPOINT, forcePathStyle: true } : {})
});

export class DeliveryConsumer extends BaseConsumer<SummaryCompletedPayload> {
  protected queueUrl = process.env.DELIVERY_QUEUE_URL || '';
  protected queueName = QUEUES.DELIVERY;

  constructor() {
    super();
    if (!this.queueUrl) {
      throw new Error('DELIVERY_QUEUE_URL environment variable is required');
    }
  }

  protected async process(payload: SummaryCompletedPayload, requestId: string): Promise<void> {
    const { meetingId, userId } = payload;
    
    try {
      logger.info('Starting delivery job', { requestId, meetingId });

      // 1. Fetch Summary data from MongoDB
      const summaryDoc = await Summary.findOne({ meetingId });
      if (!summaryDoc) {
        throw new Error(`Summary not found for meeting ${meetingId}`);
      }

      // 2. Generate PDF
      const pdfBuffer = await generateMeetingPdf({
        title: `Meeting ${meetingId}`,
        meetingId,
        summary: summaryDoc.summary,
        actionItems: summaryDoc.actionItems,
        decisions: summaryDoc.decisions,
        keyTopics: summaryDoc.keyTopics
      }, requestId);

      // 3. Upload PDF to S3
      const pdfS3Key = `reports/${userId}/${meetingId}.pdf`;
      const uploadCommand = new PutObjectCommand({
        Bucket: process.env.S3_REPORTS_BUCKET || 'echomeet-reports',
        Key: pdfS3Key,
        Body: pdfBuffer,
        ContentType: 'application/pdf'
      });
      await s3Client.send(uploadCommand);
      logger.info('PDF uploaded to S3', { requestId, pdfS3Key });

      // 4. Send Email (using a placeholder email for now, in real app fetch from User service)
      const userEmail = process.env.TEST_RECIPIENT_EMAIL || 'user@example.com';
      await sendMeetingReportEmail(userEmail, pdfBuffer, meetingId, requestId);

      // 5. Save Report record
      const reportDoc = new Report({
        meetingId,
        pdfS3Key,
        emailSentTo: userEmail,
      });
      await reportDoc.save();
      
      // 6. Update Meeting status to DELIVERED
      await Meeting.findOneAndUpdate(
        { meetingId },
        { status: MeetingStatus.DELIVERED }
      );

      logger.info('Delivery completed successfully and status updated', { requestId, reportId: reportDoc._id });
    } catch (error) {
      logger.error('Failed to process delivery job', { 
        requestId, 
        meetingId, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });

      // Update Meeting status to FAILED
      await Meeting.findOneAndUpdate(
        { meetingId },
        { 
          status: MeetingStatus.FAILED,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      ).catch(e => logger.error('Failed to update failure status', { meetingId, error: e }));

      throw error;
    }
  }
}

export const deliveryConsumer = new DeliveryConsumer();
