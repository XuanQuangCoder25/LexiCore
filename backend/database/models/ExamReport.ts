import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IExamReport extends Document {
  examId: Types.ObjectId;
  userId: string;
  reason: string;
}

const ExamReportSchema = new Schema<IExamReport>({
  examId: { type: Schema.Types.ObjectId, ref: 'Exam', required: true },
  userId: { type: String, required: true },
  reason: { type: String, required: true }
}, { timestamps: true });

// Prevent duplicate reports: a user can only report an exam once
ExamReportSchema.index({ examId: 1, userId: 1 }, { unique: true });

export default mongoose.model<IExamReport>('ExamReport', ExamReportSchema);
