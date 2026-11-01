import mongoose, { Schema, Document, Types } from 'mongoose';

export type CardPartOfSpeech = 
  | 'noun' 
  | 'verb' 
  | 'adjective' 
  | 'adverb' 
  | 'idiom' 
  | 'phrase' 
  | 'preposition' 
  | 'conjunction' 
  | 'other';

export interface IFlashcard extends Document {
  courseId: Types.ObjectId;
  lessonId?: Types.ObjectId;
  front: string;                      // Từ vựng / Thuật ngữ chính
  back: string;                       // Nghĩa tiếng Việt / Định nghĩa
  order: number;
  partOfSpeech?: CardPartOfSpeech;    // Loại từ (noun, verb, adj...)
  phonetic?: string;                  // Phiên âm quốc tế IPA (vd: /ˌser.ənˈdɪp.ə.ti/)
  audioUrl?: string;                  // Link audio phát âm chuẩn
  example?: string;                   // Câu ví dụ tiếng Anh
  exampleMeaning?: string;            // Dịch nghĩa câu ví dụ
  synonyms?: string[];                // Danh sách từ đồng nghĩa
  note?: string;                      // Mẹo nhớ / Mnemonic note
  imageUrl?: string;                  // Hình ảnh minh họa
  initialEaseFactor?: number;         // Hệ số độ dễ khởi tạo (Mặc định: 2.5)
  initialInterval?: number;           // Khoảng cách ôn khởi tạo (Mặc định: 0)
  initialRepetitions?: number;        // Số lần lặp khởi tạo (Mặc định: 0)
}

const FlashcardSchema = new Schema<IFlashcard>({
  courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
  lessonId: { type: Schema.Types.ObjectId, ref: 'Lesson' },
  front: { type: String, required: true },
  back: { type: String, required: true },
  order: { type: Number, default: 0 },
  partOfSpeech: { 
    type: String, 
    enum: ['noun', 'verb', 'adjective', 'adverb', 'idiom', 'phrase', 'preposition', 'conjunction', 'other'],
    default: 'noun'
  },
  phonetic: { type: String, default: '' },
  audioUrl: { type: String, default: '' },
  example: { type: String, default: '' },
  exampleMeaning: { type: String, default: '' },
  synonyms: [{ type: String }],
  note: { type: String, default: '' },
  imageUrl: { type: String, default: '' },
  initialEaseFactor: { type: Number, default: 2.5 },
  initialInterval: { type: Number, default: 0 },
  initialRepetitions: { type: Number, default: 0 }
}, { timestamps: true });

FlashcardSchema.index({ courseId: 1, order: 1 });

export default mongoose.model<IFlashcard>('Flashcard', FlashcardSchema);
