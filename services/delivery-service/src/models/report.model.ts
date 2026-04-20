import mongoose, { Schema, Document } from 'mongoose';

export interface IReport extends Document {
  meetingId: string;
  pdfS3Key: string;
  emailSentTo: string;
  emailSentAt: Date;
  downloadCount: number;
  createdAt: Date;
}

const ReportSchema: Schema = new Schema({
  meetingId: { type: String, required: true, index: true },
  pdfS3Key: { type: String, required: true },
  emailSentTo: { type: String, required: true },
  emailSentAt: { type: Date, default: Date.now },
  downloadCount: { type: Number, default: 0 },
}, { timestamps: true });

export default mongoose.model<IReport>('Report', ReportSchema);
