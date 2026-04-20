import OpenAI from 'openai';
import { logger, openaiTokensUsedTotal } from '@echomeet/shared';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface TranscriptionSegment {
  start: number;
  end: number;
  text: string;
}

export interface DiarizedSegment extends TranscriptionSegment {
  speakerId: string;
}

export const processDiarization = async (
  segments: TranscriptionSegment[], 
  requestId: string
): Promise<DiarizedSegment[]> => {
  try {
    logger.info('Starting diarization with GPT-4', { requestId, segmentsCount: segments.length });

    // Prepare segments for GPT analysis
    const transcriptText = segments.map((s, i) => `[Segment ${i}] ${s.text}`).join('\n');

    const response = await openai.chat.completions.create({
      model: 'gpt-4-0125-preview',
      messages: [
        {
          role: 'system',
          content: `You are an expert at conversational analysis. Your task is to identify different speakers in a meeting transcript.
          The transcript consists of segments labeled [Segment N]. 
          Assign a speaker ID (e.g., "Speaker 1", "Speaker 2", etc.) to each segment based on linguistic patterns, tone, and context.
          Return a JSON object where keys are segment indices and values are speaker IDs.
          Example output: { "0": "Speaker 1", "1": "Speaker 2", "2": "Speaker 1" }`
        },
        {
          role: 'user',
          content: transcriptText
        }
      ],
      response_format: { type: 'json_object' }
    });

    const completionText = response.choices[0].message.content || '{}';
    const speakerMap = JSON.parse(completionText);

    // Instrument token usage
    openaiTokensUsedTotal.inc({ 
      service: 'diarization-service', 
      model: response.model 
    });

    // Map labels back to segments
    const diarizedSegments: DiarizedSegment[] = segments.map((s, i) => ({
      ...s,
      speakerId: speakerMap[i.toString()] || 'Unknown'
    }));

    logger.info('Diarization completed', { requestId });
    return diarizedSegments;
  } catch (error) {
    logger.error('Diarization failed', { requestId, error });
    throw error;
  }
};
