import { BasePublisher, QUEUES, DiarizationCompletedPayload } from '@echomeet/shared';

export class SummaryQueuePublisher extends BasePublisher<DiarizationCompletedPayload> {
  protected queueUrl = process.env.SUMMARY_QUEUE_URL || '';
  protected queueName = QUEUES.SUMMARY;

  constructor() {
    super();
    if (!this.queueUrl) {
      throw new Error('SUMMARY_QUEUE_URL environment variable is required');
    }
  }
}

export const summaryPublisher = new SummaryQueuePublisher();
