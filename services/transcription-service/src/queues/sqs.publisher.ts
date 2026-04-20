import { BasePublisher, QUEUES, TranscriptionCompletedPayload } from '@echomeet/shared';

export class DiarizationQueuePublisher extends BasePublisher<TranscriptionCompletedPayload> {
  protected queueUrl = process.env.DIARIZATION_QUEUE_URL || '';
  protected queueName = QUEUES.DIARIZATION;

  constructor() {
    super();
    if (!this.queueUrl) {
      throw new Error('DIARIZATION_QUEUE_URL environment variable is required');
    }
  }
}

export const diarizationPublisher = new DiarizationQueuePublisher();
