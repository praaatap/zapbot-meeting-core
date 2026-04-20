import { BaseConsumer, QUEUES, DiarizationCompletedPayload, logger, Meeting, MeetingStatus } from '@echomeet/shared';
import mongoose from 'mongoose';
import Summary from '../models/summary.model.js';
import { processSummary } from '../processors/summary.processor.js';
import { deliveryPublisher } from '../queues/sqs.publisher.js';

// Model for DiarizedTranscript (defined in another service, but we share DB)
const DiarizedTranscriptSchema = new mongoose.Schema({
  meetingId: String,
  segments: [{ speakerId: String, text: String }]
}, { strict: false });

const DiarizedTranscript = mongoose.model('DiarizedTranscript', DiarizedTranscriptSchema, 'diarizedtranscripts');

export class SummaryConsumer extends BaseConsumer<DiarizationCompletedPayload> {
  protected queueUrl = process.env.SUMMARY_QUEUE_URL || '';
  protected queueName = QUEUES.SUMMARY;

  constructor() {
    super();
    if (!this.queueUrl) {
      throw new Error('SUMMARY_QUEUE_URL environment variable is required');
    }
  }

  protected async process(payload: DiarizationCompletedPayload, requestId: string): Promise<void> {
    const { meetingId, userId, s3Key } = payload;
    
    try {
      logger.info('Starting summary job', { requestId, meetingId });

      // 1. Fetch diarized transcript from MongoDB
      const diarizedDoc = await DiarizedTranscript.findOne({ meetingId });
      if (!diarizedDoc) {
        throw new Error(`Diarized transcript not found for meeting ${meetingId}`);
      }

      // 2. Format transcript for GPT
      const formattedTranscript = diarizedDoc.segments
        .map((s: any) => `${s.speakerId}: ${s.text}`)
        .join('\n');

      // 3. Process with GPT-4
      const report = await processSummary(formattedTranscript, requestId);

      // 4. Save summary
      const summaryDoc = new Summary({
        meetingId,
        ...report
      });

      await summaryDoc.save();
      logger.info('Summary saved to MongoDB', { requestId, meetingId, docId: summaryDoc._id });

      // 5. Publish to Delivery Queue
      await deliveryPublisher.publish({
        meetingId,
        userId,
        s3Key,
        timestamp: new Date().toISOString(),
        requestId
      }, requestId);

      logger.info('Published to delivery queue', { requestId, meetingId });
    } catch (error) {
      logger.error('Failed to process summary job', { 
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

export const summaryConsumer = new SummaryConsumer();
