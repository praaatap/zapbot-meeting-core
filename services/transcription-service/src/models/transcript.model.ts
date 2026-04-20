import mongoose, { Schema, Document } from 'mongoose';

export interface ITranscript extends Document {
  meetingId: string;
  rawText: string;
  segments: {
    start: number;
    end: number;
    text: string;
  }[];
  language: string;
  confidence: number;
  processingTimeMs: number;
  createdAt: Date;
}

const TranscriptSchema: Schema = new Schema({
  meetingId: { type: String, required: true, index: true },
  rawText: { type: String, required: true },
  segments: [{
    start: { type: Number, required: true },
    end: { type: Number, required: true },
    text: { type: String, required: true },
  }],
  language: { type: String, default: 'en' },
  confidence: { type: Number },
  processingTimeMs: { type: Number },
}, { timestamps: true });

export default mongoose.model<ITranscript>('Transcript', TranscriptSchema);
