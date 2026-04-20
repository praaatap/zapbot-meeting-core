import { Registry, collectDefaultMetrics, Counter, Histogram, Gauge } from 'prom-client';

export const registry = new Registry();

collectDefaultMetrics({ register: registry });

// Define common metrics
export const uploadsTotal = new Counter({
  name: 'echomeet_uploads_total',
  help: 'Total number of audio uploads',
  labelNames: ['status'],
  registers: [registry],
});

export const transcriptionDuration = new Histogram({
  name: 'echomeet_transcription_duration_seconds',
  help: 'Duration of transcription process in seconds',
  buckets: [1, 5, 10, 30, 60, 120, 300, 600],
  registers: [registry],
});

export const whisperApiCallsTotal = new Counter({
  name: 'echomeet_whisper_api_calls_total',
  help: 'Total number of OpenAI Whisper API calls',
  labelNames: ['status'],
  registers: [registry],
});

export const openaiTokensUsedTotal = new Counter({
  name: 'echomeet_openai_tokens_used_total',
  help: 'Total OpenAI tokens used',
  labelNames: ['service', 'model'],
  registers: [registry],
});

export const sqsMessagesProcessedTotal = new Counter({
  name: 'echomeet_sqs_messages_processed_total',
  help: 'Total number of SQS messages processed',
  labelNames: ['queue', 'status'],
  registers: [registry],
});

export const pipelineE2EDuration = new Histogram({
  name: 'echomeet_pipeline_e2e_duration_seconds',
  help: 'End-to-end duration of the meeting pipeline',
  buckets: [10, 30, 60, 120, 300, 600, 1200],
  registers: [registry],
});

export const activeJobsGauge = new Gauge({
  name: 'echomeet_active_jobs_gauge',
  help: 'Number of active jobs per queue',
  labelNames: ['queue'],
  registers: [registry],
});

export const pdfGenerationDuration = new Histogram({
  name: 'echomeet_pdf_generation_duration_seconds',
  help: 'Duration of PDF generation in seconds',
  registers: [registry],
});

export const emailSentTotal = new Counter({
  name: 'echomeet_email_sent_total',
  help: 'Total number of emails sent',
  labelNames: ['status'],
  registers: [registry],
});
