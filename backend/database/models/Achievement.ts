import mongoose, { Schema, Document } from 'mongoose';

export interface IAchievement extends Document {
  title: string;
  description: string;
  icon?: string;
  criteria: string; // VD: "learn_1000_words", "7_day_streak"
}

const AchievementSchema = new Schema<IAchievement>({
  title: { type: String, required: true },
  description: { type: String, required: true },
  icon: { type: String },
  criteria: { type: String, required: true, unique: true }
}, { timestamps: true });

export default mongoose.model<IAchievement>('Achievement', AchievementSchema);
