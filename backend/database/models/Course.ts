import mongoose, { Schema, Document } from 'mongoose';

export interface ICourse extends Document {
  title: string;
  description: string;
}

const CourseSchema = new Schema<ICourse>({
  title: { type: String, required: true },
  description: { type: String, default: '' }
}, { timestamps: true });

export default mongoose.model<ICourse>('Course', CourseSchema);
