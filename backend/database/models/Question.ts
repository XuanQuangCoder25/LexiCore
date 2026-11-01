import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IQuestion extends Document {
  examId: Types.ObjectId;
  order: number;
  type: 'DragDrop' | 'FillBlank' | 'MultipleChoice' | 'Audio' | 'Video' | 'Reading';
  content: any; 
  /* 
   Flexible JSON payload for content:
   - Audio/Video: { mediaUrl: string, transcript?: string, subQuestions: [{ id, text, options, explanation? }] }
   - Reading: { passage: string, title?: string, subQuestions: [{ id, text, options, explanation? }] }
   - DragDrop/FillBlank: { text: string (with [blank_1]), wordBank: string[], distractors: string[], explanation?: string }
   - MultipleChoice: { text: string, options: string[], explanation?: string }
  */
  answerData: any; 
  /*
   Flexible JSON payload for answers:
   - Audio/Video/Reading: mapping of subQuestion ID to correct answer
   - DragDrop/FillBlank: mapping of blank ID to correct word { "[blank_1]": "discovered" }
   - MultipleChoice: { correctOption: string }
  */
  explanation?: string;
}

const QuestionSchema = new Schema<IQuestion>({
  examId: { type: Schema.Types.ObjectId, ref: 'Exam', required: true },
  order: { type: Number, default: 0 },
  type: { 
    type: String, 
    enum: ['DragDrop', 'FillBlank', 'MultipleChoice', 'Audio', 'Video', 'Reading'], 
    required: true 
  },
  content: { type: Schema.Types.Mixed, required: true },
  answerData: { type: Schema.Types.Mixed, required: true },
  explanation: { type: String, default: '' }
}, { timestamps: true });

QuestionSchema.index({ examId: 1, order: 1 });

export default mongoose.model<IQuestion>('Question', QuestionSchema);
