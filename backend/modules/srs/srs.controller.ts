import { Request, Response } from 'express';
import CardReview from '../../database/models/CardReview';
import { calculateSM2 } from './srs.service';
import mongoose from 'mongoose';

export const getDueCards = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id || 'demo-user-id';
    const dueCards = await CardReview.find({
      userId,
      nextReviewDate: { $lte: new Date() } // Thẻ đã đến hạn
    });
    res.json(dueCards);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server' });
  }
};

export const submitReview = async (req: Request, res: Response) => {
  try {
    const { cardId, quality } = req.body;
    const userId = (req as any).user?.id || 'demo-user-id';

    let card = await CardReview.findOne({ userId, cardId });
    
    // Nếu thẻ chưa từng được học, tạo mới bản ghi ôn tập
    if (!card) {
      card = new CardReview({
        userId,
        cardId,
        deckId: new mongoose.Types.ObjectId(), // Tạm mock deckId cho bài test
        easeFactor: 2.5,
        interval: 0,
        repetitions: 0
      });
    }

    // Gọi hàm tính toán SM-2 anh đã viết ở Bước 2
    const result = calculateSM2(quality, card.repetitions, card.easeFactor, card.interval);
    
    // Lưu kết quả mới vào database
    card.easeFactor = result.easeFactor;
    card.interval = result.interval;
    card.repetitions = result.repetitions;
    card.nextReviewDate = result.nextReviewDate;

    await card.save();
    res.json(card);
  } catch (error) {
    console.error('Lỗi khi submit review:', error);
    res.status(500).json({ message: 'Lỗi server' });
  }
};
