import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IQuestion extends Document {
  examId: Types.ObjectId;
  order: number;
  type: 'DragDrop' | 'FillBlank' | 'MultipleChoice' | 'Audio' | 'Video';
  content: any; 
  /* 
   Flexible JSON payload for content:
   - Audio/Video: { mediaUrl: string, startAt?: number, endAt?: number, subQuestions: [...] }
   - DragDrop/FillBlank: { text: string (with [blank_1]), wordBank: string[], distractors: string[] }
   - MultipleChoice: { text: string, options: string[] }
  */
  answerData: any; 
  /*
   Flexible JSON payload for answers:
   - Audio/Video: mapping of subQuestion ID to correct answer
   - DragDrop/FillBlank: mapping of blank ID to correct word { "[blank_1]": "discovered" }
   - MultipleChoice: correct option string
  */
}

const QuestionSchema = new Schema<IQuestion>({
  examId: { type: Schema.Types.ObjectId, ref: 'Exam', required: true },
  order: { type: Number, default: 0 },
  type: { 
    type: String, 
    enum: ['DragDrop', 'FillBlank', 'MultipleChoice', 'Audio', 'Video'], 
    required: true 
  },
  content: { type: Schema.Types.Mixed, required: true },
  answerData: { type: Schema.Types.Mixed, required: true }
}, { timestamps: true });

export default mongoose.model<IQuestion>('Question', QuestionSchema);
