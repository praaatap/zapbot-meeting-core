import mongoose, { Schema, Document } from 'mongoose';

export enum BotStatus {
  DISPATCHED = 'dispatched',
  JOINING = 'joining',
  RECORDING = 'recording',
  UPLOADING = 'uploading',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

export interface IBot extends Document {
  botId: string;
  meetingId: string;
  userId: string;
  meetingUrl: string;
  platform: 'zoom' | 'teams' | 'meet' | 'other';
  status: BotStatus;
  joinedAt?: Date;
  startedRecordingAt?: Date;
  finishedAt?: Date;
  audioS3Key?: string;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

const BotSchema: Schema = new Schema({
  botId: { type: String, required: true, unique: true, index: true },
  meetingId: { type: String, required: true, index: true },
  userId: { type: String, required: true, index: true },
  meetingUrl: { type: String, required: true },
  platform: { 
    type: String, 
    enum: ['zoom', 'teams', 'meet', 'other'], 
    default: 'other' 
  },
  status: { 
    type: String, 
    enum: Object.values(BotStatus), 
    default: BotStatus.DISPATCHED 
  },
  joinedAt: { type: Date },
  startedRecordingAt: { type: Date },
  finishedAt: { type: Date },
  audioS3Key: { type: String },
  error: { type: String },
}, { timestamps: true });

export const Bot = mongoose.model<IBot>('Bot', BotSchema);
