export const EVENTS = {
  AUDIO_UPLOADED: 'AUDIO_UPLOADED',
  TRANSCRIPTION_COMPLETED: 'TRANSCRIPTION_COMPLETED',
  DIARIZATION_COMPLETED: 'DIARIZATION_COMPLETED',
  SUMMARY_COMPLETED: 'SUMMARY_COMPLETED',
  DELIVERY_COMPLETED: 'DELIVERY_COMPLETED',
  PIPELINE_FAILED: 'PIPELINE_FAILED',
} as const;

export type EventType = typeof EVENTS[keyof typeof EVENTS];

export interface BaseEventPayload {
  meetingId: string;
  userId: string;
  timestamp: string;
  requestId: string;
}

export interface AudioUploadedPayload extends BaseEventPayload {
  s3Key: string;
  duration: number;
}

export interface TranscriptionCompletedPayload extends BaseEventPayload {
  s3Key: string;
}

export interface DiarizationCompletedPayload extends BaseEventPayload {
  s3Key: string;
}

export interface SummaryCompletedPayload extends BaseEventPayload {
  s3Key: string;
}
