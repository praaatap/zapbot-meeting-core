import mongoose, { Schema, Document } from 'mongoose';

export interface ISummary extends Document {
  meetingId: string;
  summary: string;
  actionItems: {
    assignee: string;
    task: string;
    deadline?: string;
    priority: 'high' | 'medium' | 'low';
  }[];
  decisions: string[];
  keyTopics: string[];
  sentiment: {
    overall: 'positive' | 'neutral' | 'negative';
    perSpeaker: { speakerId: string; sentiment: string; score: number }[];
  };
  meetingType: string;
  durationSummary: string;
  createdAt: Date;
}

const SummarySchema: Schema = new Schema({
  meetingId: { type: String, required: true, index: true },
  summary: { type: String, required: true },
  actionItems: [{
    assignee: { type: String },
    task: { type: String, required: true },
    deadline: { type: String },
    priority: { type: String, enum: ['high', 'medium', 'low'], default: 'medium' },
  }],
  decisions: [{ type: String }],
  keyTopics: [{ type: String }],
  sentiment: {
    overall: { type: String, enum: ['positive', 'neutral', 'negative'] },
    perSpeaker: [{
      speakerId: { type: String },
      sentiment: { type: String },
      score: { type: Number },
    }],
  },
  meetingType: { type: String },
  durationSummary: { type: String },
}, { timestamps: true });

export default mongoose.model<ISummary>('Summary', SummarySchema);
