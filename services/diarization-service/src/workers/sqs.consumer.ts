import { BaseConsumer, QUEUES, TranscriptionCompletedPayload, logger, Meeting, MeetingStatus } from '@echomeet/shared';
import mongoose from 'mongoose';
import DiarizedTranscript from '../models/diarized.model.ts';
import { processDiarization } from '../processors/diarize.processor.js';
import { summaryPublisher } from '../queues/sqs.publisher.js';

// Define a simple interface for the transcript fetched from transcription-service DB
// In a real monorepo, we'd share the Transcription model or use a repo pattern
const TranscriptSchema = new mongoose.Schema({
  meetingId: String,
  segments: [{ start: Number, end: Number, text: String }]
}, { strict: false });

const RawTranscript = mongoose.model('RawTranscript', TranscriptSchema, 'transcripts');

export class DiarizationConsumer extends BaseConsumer<TranscriptionCompletedPayload> {
  protected queueUrl = process.env.DIARIZATION_QUEUE_URL || '';
  protected queueName = QUEUES.DIARIZATION;

  constructor() {
    super();
    if (!this.queueUrl) {
      throw new Error('DIARIZATION_QUEUE_URL environment variable is required');
    }
  }

  protected async process(payload: TranscriptionCompletedPayload, requestId: string): Promise<void> {
    const { meetingId, userId, s3Key } = payload;
    
    try {
      logger.info('Starting diarization job', { requestId, meetingId });

      // 1. Fetch raw transcript from MongoDB
      const transcript = await RawTranscript.findOne({ meetingId });
      if (!transcript) {
        throw new Error(`Raw transcript not found for meeting ${meetingId}`);
      }

      // 2. Process with GPT-4 for speaker labeling
      const diarizedSegments = await processDiarization(transcript.segments as any, requestId);

      // 3. Calculate speaker stats
      const speakersMap = new Map<string, { wordCount: number; duration: number }>();
      
      for (const seg of diarizedSegments) {
        const stats = speakersMap.get(seg.speakerId) || { wordCount: 0, duration: 0 };
        stats.wordCount += seg.text.split(/\s+/).length;
        stats.duration += (seg.end - seg.start);
        speakersMap.set(seg.speakerId, stats);
      }

      const speakers = Array.from(speakersMap.entries()).map(([id, stats]) => ({
        speakerId: id,
        totalWordCount: stats.wordCount,
        totalSpeakingTimeSeconds: stats.duration
      }));

      // 4. Save diarized transcript
      const diarizedDoc = new DiarizedTranscript({
        meetingId,
        speakers,
        segments: diarizedSegments
      });

      await diarizedDoc.save();
      logger.info('Diarized transcript saved to MongoDB', { requestId, meetingId, docId: diarizedDoc._id });

      // 5. Update Meeting status
      await Meeting.findOneAndUpdate(
        { meetingId },
        { status: MeetingStatus.SUMMARIZING }
      );

      // 5. Publish to Summary Queue
      await summaryPublisher.publish({
        meetingId,
        userId,
        s3Key,
        timestamp: new Date().toISOString(),
        requestId
      }, requestId);

      logger.info('Published to summary queue', { requestId, meetingId });
    } catch (error) {
      logger.error('Failed to process diarization job', { 
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

export const diarizationConsumer = new DiarizationConsumer();
