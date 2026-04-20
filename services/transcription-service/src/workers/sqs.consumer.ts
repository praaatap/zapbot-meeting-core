import { BaseConsumer, QUEUES, AudioUploadedPayload, logger, Meeting, MeetingStatus } from '@echomeet/shared';
import { processTranscription } from '../processors/whisper.processor.js';
import Transcript from '../models/transcript.model.js';
import { diarizationPublisher } from '../queues/sqs.publisher.js';

export class TranscriptionConsumer extends BaseConsumer<AudioUploadedPayload> {
  protected queueUrl = process.env.TRANSCRIPTION_QUEUE_URL || '';
  protected queueName = QUEUES.TRANSCRIPTION;

  constructor() {
    super();
    if (!this.queueUrl) {
      throw new Error('TRANSCRIPTION_QUEUE_URL environment variable is required');
    }
  }

  protected async process(payload: AudioUploadedPayload, requestId: string): Promise<void> {
    const { meetingId, userId, s3Key } = payload;
    
    try {
      logger.info('Starting transcription job', { requestId, meetingId, s3Key });

      // 1. Process with Whisper
      const transcriptionResults = await processTranscription(s3Key, requestId);

      // 2. Save to MongoDB
      const transcript = new Transcript({
        meetingId,
        rawText: transcriptionResults.rawText,
        segments: transcriptionResults.segments,
        processingTimeMs: transcriptionResults.processingTimeMs,
      });

      await transcript.save();
      logger.info('Transcript saved to MongoDB', { requestId, meetingId, transcriptId: transcript._id });

      // 3. Update Meeting status
      await Meeting.findOneAndUpdate(
        { meetingId },
        { status: MeetingStatus.DIARIZING }
      );

      // 3. Publish to Diarization Queue
      await diarizationPublisher.publish({
        meetingId,
        userId,
        s3Key, // Pass original key or transcript ID as needed
        timestamp: new Date().toISOString(),
        requestId
      }, requestId);

      logger.info('Published to diarization queue', { requestId, meetingId });
    } catch (error) {
      logger.error('Failed to process transcription job', { 
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

export const transcriptionConsumer = new TranscriptionConsumer();
