export const SUMMARY_PROMPT = `
Summarize the following meeting transcript in 3-5 concise sentences. 
Highlight the main purpose of the meeting and the general outcome.
`;

export const ACTION_ITEMS_PROMPT = `
Extract action items from the following meeting transcript.
For each action item, identify:
- The assignee (Speaker ID or name if mentioned)
- The specific task
- The deadline (if mentioned)
- Priority (high/medium/low) based on the speaker's urgency.
`;

export const SENTIMENT_PROMPT = `
Analyze the sentiment of the meeting.
Provide:
- Overall sentiment (positive, neutral, negative)
- Sentiment per speaker (speakerId, sentiment description, and a score from 0 to 1).
`;
