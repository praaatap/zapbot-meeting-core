import { BasePublisher, QUEUES, AudioUploadedPayload } from '@echomeet/shared';

export class TranscriptionQueuePublisher extends BasePublisher<AudioUploadedPayload> {
  protected queueUrl = process.env.TRANSCRIPTION_QUEUE_URL || '';
  protected queueName = QUEUES.TRANSCRIPTION;

  constructor() {
    super();
    if (!this.queueUrl) {
      throw new Error('TRANSCRIPTION_QUEUE_URL environment variable is required');
    }
  }
}

export const transcriptionPublisher = new TranscriptionQueuePublisher();
