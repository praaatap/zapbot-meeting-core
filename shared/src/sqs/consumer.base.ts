import { 
  SQSClient, 
  ReceiveMessageCommand, 
  DeleteMessageCommand, 
  Message 
} from '@aws-sdk/client-sqs';
import { logger } from '../utils/logger.js';
import { sqsMessagesProcessedTotal, activeJobsGauge } from '../utils/metrics.js';

export abstract class BaseConsumer<T> {
  protected sqsClient: SQSClient;
  protected abstract queueUrl: string;
  protected abstract queueName: string;
  protected isRunning: boolean = false;

  constructor(region: string = process.env.AWS_REGION || 'us-east-1') {
    const endpoint = process.env.SQS_ENDPOINT;
    this.sqsClient = new SQSClient({ 
      region,
      ...(endpoint ? { endpoint } : {})
    });
  }

  async start(): Promise<void> {
    this.isRunning = true;
    logger.info(`Starting consumer for ${this.queueName}`);
    
    while (this.isRunning) {
      try {
        const command = new ReceiveMessageCommand({
          QueueUrl: this.queueUrl,
          MaxNumberOfMessages: 1,
          WaitTimeSeconds: 20, // Long polling
          AttributeNames: ['All'],
          MessageAttributeNames: ['All']
        });

        const response = await this.sqsClient.send(command);

        if (response.Messages && response.Messages.length > 0) {
          for (const message of response.Messages) {
            await this.handleMessage(message);
          }
        }
      } catch (error) {
        logger.error(`Error polling queue ${this.queueName}`, {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        // Wait a bit before retrying to avoid tight loop on persistent errors
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
  }

  async stop(): Promise<void> {
    this.isRunning = false;
    logger.info(`Stopping consumer for ${this.queueName}`);
  }

  private async handleMessage(message: Message): Promise<void> {
    const requestId = message.MessageAttributes?.RequestId?.StringValue || 'unknown';
    
    try {
      if (!message.Body) {
        throw new Error('Message body is empty');
      }

      const payload = JSON.parse(message.Body) as T;
      
      activeJobsGauge.inc({ queue: this.queueName });
      logger.info(`Processing message from ${this.queueName}`, { requestId });

      await this.process(payload, requestId);

      await this.deleteMessage(message.ReceiptHandle!);
      
      logger.info(`Successfully processed message from ${this.queueName}`, { requestId });
      sqsMessagesProcessedTotal.inc({ queue: this.queueName, status: 'success' });
    } catch (error) {
      logger.error(`Failed to process message from ${this.queueName}`, {
        requestId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      sqsMessagesProcessedTotal.inc({ queue: this.queueName, status: 'failed' });
      // Note: Message will be retried by SQS because we don't delete it
    } finally {
      activeJobsGauge.dec({ queue: this.queueName });
    }
  }

  private async deleteMessage(receiptHandle: string): Promise<void> {
    const command = new DeleteMessageCommand({
      QueueUrl: this.queueUrl,
      ReceiptHandle: receiptHandle
    });
    await this.sqsClient.send(command);
  }

  protected abstract process(payload: T, requestId: string): Promise<void>;
}
