import { BasePublisher, QUEUES, SummaryCompletedPayload } from '@echomeet/shared';

export class DeliveryQueuePublisher extends BasePublisher<SummaryCompletedPayload> {
  protected queueUrl = process.env.DELIVERY_QUEUE_URL || '';
  protected queueName = QUEUES.DELIVERY;

  constructor() {
    super();
    if (!this.queueUrl) {
      throw new Error('DELIVERY_QUEUE_URL environment variable is required');
    }
  }
}

export const deliveryPublisher = new DeliveryQueuePublisher();
