import { Request, Response } from 'express';
import CardReview from '../../database/models/CardReview';
import { calculateSM2Plus } from './srs.service';
import mongoose from 'mongoose';
import Course from '../../database/models/Course';
import Flashcard from '../../database/models/Flashcard';

export const getDueCards = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { courseId, limit = '20' } = req.query;

    const limitNum = parseInt(limit as string, 10);

    // 1. Lấy thẻ due
    const query: any = {
      userId,
      nextReviewDate: { $lte: new Date() }
    };
    if (courseId) {
      query.courseId = courseId;
    }

    const dueReviews = await CardReview.find(query).limit(limitNum).lean();

    const reviewCards = await Promise.all(dueReviews.map(async (rev) => {
      const fc = await Flashcard.findById(rev.cardId);
      return {
        ...rev,
        _id: rev.cardId,
        front: fc?.front || 'Thẻ đã bị xóa',
        back: fc?.back || 'Thẻ đã bị xóa'
      };
    }));

    let resultCards = reviewCards;

    // 2. Nếu thiếu thẻ, lấy thêm thẻ mới
    if (resultCards.length < limitNum && courseId) {
      const existingCardIds = await CardReview.find({ userId, courseId }).distinct('cardId');
      const newFlashcards = await Flashcard.find({
        courseId,
        _id: { $nin: existingCardIds }
      }).limit(limitNum - resultCards.length).lean();

      const newCards = newFlashcards.map(fc => ({
        _id: fc._id,
        cardId: fc._id,
        courseId: fc.courseId,
        front: fc.front,
        back: fc.back,
        status: 'New'
      }));

      resultCards = [...resultCards, ...newCards];
    }

    res.json({
      success: true,
      data: {
        totalDue: resultCards.length,
        cards: resultCards
      }
    });
  } catch (error) {
    console.error('Lỗi khi get due cards:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

export const submitReview = async (req: Request, res: Response) => {
  try {
    const { cardId, courseId, quality, responseTimeMs } = req.body;
    const userId = req.user!.id;

    let card = await CardReview.findOne({ userId, cardId });
    
    // Nếu thẻ chưa từng được học, tạo mới bản ghi ôn tập
    if (!card) {
      card = new CardReview({
        userId,
        cardId,
        courseId: courseId ? new mongoose.Types.ObjectId(courseId) : new mongoose.Types.ObjectId(),
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
    const userId = req.user!.id;
    
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

    // 2. Heatmap từ dữ liệu thật
    const heatmapData = await CardReview.aggregate([
      { $match: { userId } },
      { $unwind: "$reviewHistory" },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$reviewHistory.date" }
          },
          reviewsCount: { $sum: 1 }
        }
      },
      { $sort: { _id: -1 } },
      { $limit: 30 },
      {
        $project: {
          _id: 0,
          date: "$_id",
          reviewsCount: 1
        }
      }
    ]);
    const heatmap = heatmapData.reverse();

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

export const getDecks = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    // Lấy danh sách khoá học đã xuất bản
    const courses = await Course.find({ isPublished: true });
    
    const decks = await Promise.all(courses.map(async (course) => {
      const totalCards = await Flashcard.countDocuments({ courseId: course._id });
      
      const stats = await CardReview.aggregate([
        { $match: { userId, courseId: course._id } },
        { 
          $group: {
            _id: "$status",
            count: { $sum: 1 }
          }
        }
      ]);

      const learningCards = stats.find(s => s._id === 'Learning' || s._id === 'Relearning')?.count || 0;
      const reviewCards = stats.find(s => s._id === 'Review')?.count || 0;
      const studiedCards = learningCards + reviewCards;
      
      const dueCardsCount = await CardReview.countDocuments({
        userId,
        courseId: course._id,
        nextReviewDate: { $lte: new Date() }
      });

      return {
        _id: course._id,
        title: course.title,
        description: course.description,
        thumbnail: course.thumbnail,
        totalCards,
        studiedCards,
        masteredCards: reviewCards, // Thẻ đã vào trạng thái Review
        newCards: Math.max(0, totalCards - studiedCards),
        reviewCards: dueCardsCount, // Chính xác là số thẻ CẦN ÔN TẬP
        category: 'Từ vựng',
        difficulty: 'Cơ bản'
      };
    }));

    res.json({ success: true, data: decks });
  } catch (error) {
    console.error('Lỗi khi get decks:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};
