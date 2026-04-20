export const QUEUES = {
  TRANSCRIPTION: 'echomeet-transcription-queue',
  DIARIZATION: 'echomeet-diarization-queue',
  SUMMARY: 'echomeet-summary-queue',
  DELIVERY: 'echomeet-delivery-queue',
  DEAD_LETTER: 'echomeet-dead-letter-queue',
} as const;

export type QueueName = typeof QUEUES[keyof typeof QUEUES];
