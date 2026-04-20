import mongoose, { Schema, Document } from 'mongoose';

export interface IDiarizedTranscript extends Document {
  meetingId: string;
  speakers: {
    speakerId: string;
    totalWordCount: number;
    totalSpeakingTimeSeconds: number;
  }[];
  segments: {
    speakerId: string;
    start: number;
    end: number;
    text: string;
  }[];
  createdAt: Date;
}

const DiarizedTranscriptSchema: Schema = new Schema({
  meetingId: { type: String, required: true, index: true },
  speakers: [{
    speakerId: { type: String, required: true },
    totalWordCount: { type: Number, default: 0 },
    totalSpeakingTimeSeconds: { type: Number, default: 0 },
  }],
  segments: [{
    speakerId: { type: String, required: true },
    start: { type: Number, required: true },
    end: { type: Number, required: true },
    text: { type: String, required: true },
  }],
}, { timestamps: true });

export default mongoose.model<IDiarizedTranscript>('DiarizedTranscript', DiarizedTranscriptSchema);
