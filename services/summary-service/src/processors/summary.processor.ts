import OpenAI from 'openai';
import { logger, openaiTokensUsedTotal } from '@echomeet/shared';
import { SUMMARY_PROMPT, ACTION_ITEMS_PROMPT, SENTIMENT_PROMPT } from './prompts/prompts.js';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const processSummary = async (transcriptText: string, requestId: string) => {
  try {
    logger.info('Generating summary with GPT-4', { requestId });

    const response = await openai.chat.completions.create({
      model: 'gpt-4-0125-preview',
      messages: [
        {
          role: 'system',
          content: `You are an AI meeting assistant. Analyze the provided meeting transcript and extract structured information.
          ${SUMMARY_PROMPT}
          ${ACTION_ITEMS_PROMPT}
          ${SENTIMENT_PROMPT}
          `
        },
        {
          role: 'user',
          content: transcriptText
        }
      ],
      tools: [
        {
          type: 'function',
          function: {
            name: 'generate_meeting_report',
            description: 'Generate a structured report from a meeting transcript',
            parameters: {
              type: 'object',
              properties: {
                summary: { type: 'string' },
                actionItems: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      assignee: { type: 'string' },
                      task: { type: 'string' },
                      deadline: { type: 'string' },
                      priority: { type: 'string', enum: ['high', 'medium', 'low'] }
                    },
                    required: ['task']
                  }
                },
                decisions: { type: 'array', items: { type: 'string' } },
                keyTopics: { type: 'array', items: { type: 'string' } },
                sentiment: {
                  type: 'object',
                  properties: {
                    overall: { type: 'string', enum: ['positive', 'neutral', 'negative'] },
                    perSpeaker: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          speakerId: { type: 'string' },
                          sentiment: { type: 'string' },
                          score: { type: 'number' }
                        }
                      }
                    }
                  }
                },
                meetingType: { type: 'string' },
                durationSummary: { type: 'string' }
              },
              required: ['summary', 'actionItems', 'decisions', 'keyTopics', 'sentiment', 'meetingType', 'durationSummary']
            }
          }
        }
      ],
      tool_choice: { type: 'function', function: { name: 'generate_meeting_report' } }
    });

    const toolCall = response.choices[0].message.tool_calls?.[0];
    if (!toolCall) {
      throw new Error('GPT-4 failed to generate structured output');
    }

    const report = JSON.parse(toolCall.function.arguments);

    openaiTokensUsedTotal.inc({ 
      service: 'summary-service', 
      model: response.model 
    });

    logger.info('Summary generation completed', { requestId });
    return report;
  } catch (error) {
    logger.error('Summary generation failed', { requestId, error });
    throw error;
  }
};
