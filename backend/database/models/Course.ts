import mongoose, { Schema, Document } from 'mongoose';

export interface ICourse extends Document {
  title: string;
  description: string;
  thumbnail: string;
  creatorId: string;
  isPublished: boolean;
}

const CourseSchema = new Schema<ICourse>({
  title: { type: String, required: true },
  description: { type: String, default: '' },
  thumbnail: { type: String, default: '' },
  creatorId: { type: String, required: true },
  isPublished: { type: Boolean, default: false }
}, { timestamps: true });

export default mongoose.model<ICourse>('Course', CourseSchema);
