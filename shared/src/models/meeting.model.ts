import mongoose, { Schema, Document } from 'mongoose';

export enum MeetingStatus {
  UPLOADING = 'uploading',
  TRANSCRIBING = 'transcribing',
  DIARIZING = 'diarizing',
  SUMMARIZING = 'summarizing',
  DELIVERED = 'delivered',
  FAILED = 'failed'
}

export interface IMeeting extends Document {
  meetingId: string;
  userId: string;
  title: string;
  status: MeetingStatus;
  audioS3Key?: string;
  duration?: number;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

const MeetingSchema: Schema = new Schema({
  meetingId: { type: String, required: true, unique: true, index: true },
  userId: { type: String, required: true, index: true },
  title: { type: String, default: 'Untitled Meeting' },
  status: { 
    type: String, 
    enum: Object.values(MeetingStatus), 
    default: MeetingStatus.UPLOADING 
  },
  audioS3Key: { type: String },
  duration: { type: Number },
  error: { type: String },
}, { timestamps: true });

export const Meeting = mongoose.model<IMeeting>('Meeting', MeetingSchema);
