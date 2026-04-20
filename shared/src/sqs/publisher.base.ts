import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger.js';
import { sqsMessagesProcessedTotal } from '../utils/metrics.js';

export abstract class BasePublisher<T> {
  protected sqsClient: SQSClient;
  protected abstract queueUrl: string;
  protected abstract queueName: string;

  constructor(region: string = process.env.AWS_REGION || 'us-east-1') {
    const endpoint = process.env.SQS_ENDPOINT; // For LocalStack
    this.sqsClient = new SQSClient({ 
      region,
      ...(endpoint ? { endpoint } : {})
    });
  }

  async publish(payload: T, requestId: string = uuidv4()): Promise<string | undefined> {
    try {
      const messageBody = JSON.stringify({
        ...payload,
        requestId,
        timestamp: new Date().toISOString()
      });

      const command = new SendMessageCommand({
        QueueUrl: this.queueUrl,
        MessageBody: messageBody,
        MessageAttributes: {
          RequestId: {
            DataType: 'String',
            StringValue: requestId
          }
        }
      });

      const response = await this.sqsClient.send(command);
      
      logger.info(`Message published to ${this.queueName}`, {
        requestId,
        messageId: response.MessageId,
        queueName: this.queueName
      });

      sqsMessagesProcessedTotal.inc({ queue: this.queueName, status: 'published' });

      return response.MessageId;
    } catch (error) {
      logger.error(`Failed to publish message to ${this.queueName}`, {
        requestId,
        error: error instanceof Error ? error.message : 'Unknown error',
        payload
      });
      sqsMessagesProcessedTotal.inc({ queue: this.queueName, status: 'publish_failed' });
      throw error;
    }
  }
}
