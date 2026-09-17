import { Request, Response } from 'express';
import CardReview from '../../database/models/CardReview';
import { calculateSM2Plus } from './srs.service';
import mongoose from 'mongoose';

export const getDueCards = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id || 'demo-user-id';
    const { deckId, limit = '50', page = '1' } = req.query;

    const limitNum = parseInt(limit as string, 10);
    const pageNum = parseInt(page as string, 10);
    const skip = (pageNum - 1) * limitNum;

    // Filter query
    const query: any = {
      userId,
      nextReviewDate: { $lte: new Date() }
    };
    
    if (deckId) {
      query.deckId = deckId;
    }

    const [dueCards, totalDue] = await Promise.all([
      CardReview.find(query).skip(skip).limit(limitNum),
      CardReview.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: {
        totalDue,
        cards: dueCards
      }
    });
  } catch (error) {
    console.error('Lỗi khi get due cards:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

export const submitReview = async (req: Request, res: Response) => {
  try {
    const { cardId, deckId, quality, responseTimeMs } = req.body;
    const userId = (req as any).user?.id || 'demo-user-id';

    let card = await CardReview.findOne({ userId, cardId });
    
    // Nếu thẻ chưa từng được học, tạo mới bản ghi ôn tập
    if (!card) {
      card = new CardReview({
        userId,
        cardId,
        deckId: deckId ? new mongoose.Types.ObjectId(deckId) : new mongoose.Types.ObjectId(),
        easeFactor: 2.5,
        interval: 0,
        repetitions: 0,
        status: 'New',
        reviewHistory: []
      });
    }

    // Gọi hàm tính toán SM-2+ mới
    const previousReviewDate = card.reviewHistory.length > 0 
      ? card.reviewHistory[card.reviewHistory.length - 1].date 
      : null;
      
    const result = calculateSM2Plus(
      quality, 
      card.repetitions, 
      card.easeFactor, 
      card.interval,
      previousReviewDate,
      card.status as any
    );
    
    // Cập nhật thông tin mới
    card.easeFactor = result.easeFactor;
    card.interval = result.interval;
    card.repetitions = result.repetitions;
    card.nextReviewDate = result.nextReviewDate;
    card.status = result.status;

    // Lưu vào lịch sử
    card.reviewHistory.push({
      date: new Date(),
      quality,
      interval: result.interval,
      easeFactor: result.easeFactor,
      responseTimeMs
    });

    await card.save();
    res.json({ success: true, data: card });
  } catch (error) {
    console.error('Lỗi khi submit review:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

export const getSrsStats = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id || 'demo-user-id';
    
    // 1. Lấy overview các thẻ
    const stats = await CardReview.aggregate([
      { $match: { userId } },
      { 
        $group: {
          _id: "$status",
          count: { $sum: 1 }
        }
      }
    ]);

    const dueCardsCount = await CardReview.countDocuments({
      userId,
      nextReviewDate: { $lte: new Date() }
    });

    const deckOverview = {
      newCards: stats.find(s => s._id === 'New')?.count || 0,
      learningCards: stats.find(s => s._id === 'Learning' || s._id === 'Relearning')?.count || 0,
      dueCards: dueCardsCount,
      masteredCards: stats.find(s => s._id === 'Review')?.count || 0,
    };

    // 2. Mock data Heatmap (Để hoàn thiện sau bằng Aggregation Date)
    const today = new Date();
    const heatmap = [
      { date: new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], reviewsCount: 45 },
      { date: new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], reviewsCount: 60 },
      { date: today.toISOString().split('T')[0], reviewsCount: 12 }
    ];

    res.json({
      success: true,
      data: {
        deckOverview,
        heatmap
      }
    });
  } catch (error) {
    console.error('Lỗi khi get stats:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};
