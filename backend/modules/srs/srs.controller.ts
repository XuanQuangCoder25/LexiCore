import { Request, Response } from 'express';
import CardReview from '../../database/models/CardReview';
import { calculateSM2Plus } from './srs.service';
import mongoose from 'mongoose';
import Course from '../../database/models/Course';
import Flashcard from '../../database/models/Flashcard';
import { updateStreak } from '../../utils/streak';
import { updateAchievementProgress, updateGoalProgress } from '../gamification/gamification-repository';

export const getDueCards = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { courseId, limit = '20' } = req.query;

    // Tự động tăng lượt xem/học thực tế của bộ thẻ/khóa học
    if (courseId && mongoose.isValidObjectId(String(courseId))) {
      await Course.findByIdAndUpdate(courseId, { $inc: { viewsCount: 1 } });
    }

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
      const lastRevDate = Array.isArray(rev.reviewHistory) && rev.reviewHistory.length > 0
        ? rev.reviewHistory[rev.reviewHistory.length - 1].date
        : null;
      return {
        ...rev,
        _id: rev.cardId,
        front: fc?.front || 'Thẻ đã bị xóa',
        back: fc?.back || 'Thẻ đã bị xóa',
        partOfSpeech: fc?.partOfSpeech || 'noun',
        phonetic: fc?.phonetic || '',
        audioUrl: fc?.audioUrl || '',
        example: fc?.example || '',
        exampleMeaning: fc?.exampleMeaning || '',
        synonyms: fc?.synonyms || [],
        note: fc?.note || '',
        imageUrl: fc?.imageUrl || '',
        order: fc?.order || 0,
        easeFactor: rev.easeFactor ?? 2.5,
        interval: rev.interval ?? 0,
        repetitions: rev.repetitions ?? 0,
        status: rev.status || 'Review',
        previousReviewDate: lastRevDate
      };
    }));

    let resultCards: any[] = reviewCards;

    // 2. Nếu thiếu thẻ, lấy thêm thẻ mới
    if (resultCards.length < limitNum && courseId) {
      const existingCardIds = await CardReview.find({ userId, courseId: courseId as any }).distinct('cardId');
      const newFlashcards = await Flashcard.find({
        courseId: courseId as any,
        _id: { $nin: existingCardIds }
      }).limit(limitNum - resultCards.length).lean();

      const newCards = newFlashcards.map((fc: any) => ({
        _id: fc._id,
        cardId: fc._id,
        courseId: fc.courseId,
        front: fc.front,
        back: fc.back,
        partOfSpeech: fc.partOfSpeech || 'noun',
        phonetic: fc.phonetic || '',
        audioUrl: fc.audioUrl || '',
        example: fc.example || '',
        exampleMeaning: fc.exampleMeaning || '',
        synonyms: fc.synonyms || [],
        note: fc.note || '',
        imageUrl: fc.imageUrl || '',
        order: fc.order || 0,
        easeFactor: 2.5,
        interval: 0,
        repetitions: 0,
        status: 'New',
        previousReviewDate: null
      }));

      resultCards = [...resultCards, ...newCards];
    }

    // 3. Nếu vẫn còn chỗ trong giới hạn và có truyền courseId:
    // Lấy thêm các thẻ còn lại trong deck để học viên có thể ôn tập toàn diện bộ thẻ (Cram/Practice mode)
    if (resultCards.length < limitNum && courseId) {
      const includedCardIds = resultCards.map(c => (c._id || c.cardId)?.toString());
      const remainingFlashcards = await Flashcard.find({
        courseId: courseId as any,
        _id: { $nin: includedCardIds }
      }).limit(limitNum - resultCards.length).lean();

      const existingReviewsForPractice = await CardReview.find({
        userId,
        cardId: { $in: remainingFlashcards.map((f: any) => f._id) }
      }).lean();
      const reviewMap = new Map(existingReviewsForPractice.map((r: any) => [r.cardId.toString(), r]));

      const practiceCards = remainingFlashcards.map((fc: any) => {
        const existingRev: any = reviewMap.get(fc._id.toString());
        const lastRevDate = existingRev && Array.isArray(existingRev.reviewHistory) && existingRev.reviewHistory.length > 0
          ? existingRev.reviewHistory[existingRev.reviewHistory.length - 1].date
          : null;
        return {
          _id: fc._id,
          cardId: fc._id,
          courseId: fc.courseId,
          front: fc.front,
          back: fc.back,
          partOfSpeech: fc.partOfSpeech || 'noun',
          phonetic: fc.phonetic || '',
          audioUrl: fc.audioUrl || '',
          example: fc.example || '',
          exampleMeaning: fc.exampleMeaning || '',
          synonyms: fc.synonyms || [],
          note: fc.note || '',
          imageUrl: fc.imageUrl || '',
          order: fc.order || 0,
          easeFactor: existingRev?.easeFactor ?? 2.5,
          interval: existingRev?.interval ?? 0,
          repetitions: existingRev?.repetitions ?? 0,
          status: existingRev?.status || 'Practice',
          previousReviewDate: lastRevDate
        };
      });

      resultCards = [...resultCards, ...practiceCards];
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

    const previousEaseFactor = card.easeFactor ?? 2.5;
    const previousInterval = card.interval ?? 0;
    const previousRepetitions = card.repetitions ?? 0;
    const previousStatus = card.status || 'New';

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

    if (userId) {
      try {
        await updateStreak(userId);
        await updateAchievementProgress(userId, 'vocab_studied', 1);
        await updateGoalProgress(userId, 'vocab_studied', 1);
      } catch {
        // Không làm gián đoạn luồng ôn thẻ nếu gamification lỗi
      }
    }

    res.json({
      success: true,
      data: card,
      delta: {
        previousEaseFactor,
        newEaseFactor: card.easeFactor,
        previousInterval,
        newInterval: card.interval,
        previousRepetitions,
        newRepetitions: card.repetitions,
        previousStatus,
        newStatus: card.status
      }
    });
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
    const { search, level, sort } = req.query;

    let query: any = { isPublished: true };

    // Lọc theo cấp bậc CEFR (A1..C2)
    if (level && level !== 'ALL' && level !== 'All Levels') {
      query.level = String(level).toUpperCase();
    }

    // Tìm kiếm đa trường không phân biệt hoa thường
    if (search && String(search).trim()) {
      const searchRegex = { $regex: String(search).trim(), $options: 'i' };
      query.$or = [
        { title: searchRegex },
        { shortDescription: searchRegex },
        { description: searchRegex },
        { tags: searchRegex }
      ];
    }

    // Sắp xếp: Mới nhất (newest), Cũ nhất (oldest), Xem nhiều nhất (most_viewed)
    let sortObj: any = { createdAt: -1 };
    if (sort === 'oldest') {
      sortObj = { createdAt: 1 };
    } else if (sort === 'most_viewed') {
      sortObj = { viewsCount: -1, createdAt: -1 };
    }

    // Lấy danh sách khoá học / bộ thẻ đã xuất bản
    const courses = await Course.find(query).sort(sortObj);
    
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
        level: course.level || 'B1',
        viewsCount: course.viewsCount || 0,
        createdAt: (course as any).createdAt,
        totalCards,
        studiedCards,
        masteredCards: reviewCards, // Thẻ đã vào trạng thái Review
        newCards: Math.max(0, totalCards - studiedCards),
        reviewCards: dueCardsCount, // Chính xác là số thẻ CẦN ÔN TẬP
        category: course.type === 'flashcard' ? 'Flashcard Deck' : 'Khóa học',
        difficulty: course.level || 'B1'
      };
    }));

    res.json({ success: true, data: decks });
  } catch (error) {
    console.error('Lỗi khi get decks:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

/**
 * GET /api/v1/srs/reviewed-cards
 * Trả về danh sách các thẻ từ vựng mà học viên đã ôn tập từ 2 lần trở lên (reviewHistory.length >= 2)
 * Sắp xếp ưu tiên thẻ có lịch sử ôn tập dày nhất lên đầu để vẽ Đồ thị răng cưa Sawtooth.
 */
export const getReviewedCards = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const reviews = await CardReview.find({
      userId,
      'reviewHistory.1': { $exists: true }
    }).lean();

    if (!reviews || reviews.length === 0) {
      return res.json({ success: true, data: [] });
    }

    const cardIds = reviews.map((r) => r.cardId);
    const courseIds = reviews.map((r) => r.courseId).filter(Boolean);

    const [flashcards, courses] = await Promise.all([
      Flashcard.find({ _id: { $in: cardIds } }).select('_id front back phonetic partOfSpeech courseId').lean(),
      Course.find({ _id: { $in: courseIds } }).select('_id title').lean()
    ]);

    const fcMap = new Map(flashcards.map((fc: any) => [fc._id.toString(), fc]));
    const courseMap = new Map(courses.map((c: any) => [c._id.toString(), c]));

    const items = reviews
      .map((rev: any) => {
        const fc: any = fcMap.get(rev.cardId?.toString());
        if (!fc) return null;
        const course: any = courseMap.get((rev.courseId || fc.courseId)?.toString());
        const historyLen = Array.isArray(rev.reviewHistory) ? rev.reviewHistory.length : 0;

        // Đếm số ngày ôn tập thực tế khác nhau để ưu tiên thẻ có đồ thị răng cưa trải qua nhiều ngày
        const distinctDays = new Set(
          (rev.reviewHistory || []).map((h: any) => {
            const d = new Date(h.date);
            return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
          })
        ).size;

        return {
          cardId: rev.cardId.toString(),
          front: fc.front,
          back: fc.back,
          phonetic: fc.phonetic || '',
          partOfSpeech: fc.partOfSpeech || 'noun',
          deckTitle: course?.title || 'Bộ thẻ từ vựng',
          reviewsCount: historyLen,
          distinctDaysCount: distinctDays,
          easeFactor: Number((rev.easeFactor ?? 2.5).toFixed(2)),
          interval: rev.interval ?? 0,
          repetitions: rev.repetitions ?? 0,
          status: rev.status || 'Review',
          nextReviewDate: rev.nextReviewDate
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .sort((a, b) => {
        if (b.distinctDaysCount !== a.distinctDaysCount) return b.distinctDaysCount - a.distinctDaysCount;
        if (b.reviewsCount !== a.reviewsCount) return b.reviewsCount - a.reviewsCount;
        return b.interval - a.interval;
      });

    res.json({ success: true, data: items });
  } catch (error) {
    console.error('Lỗi khi getReviewedCards:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

/**
 * GET /api/v1/srs/card-curve/:cardId
 * Tính toán chuỗi điểm tọa độ Đồ thị răng cưa Ebbinghaus (Sawtooth Curve) từ reviewHistory thật trong MongoDB.
 */
export const getCardCurve = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { cardId } = req.params;

    if (!cardId || !mongoose.isValidObjectId(cardId)) {
      return res.status(400).json({ success: false, message: 'cardId không hợp lệ' });
    }

    const [cardReview, flashcard] = await Promise.all([
      CardReview.findOne({ userId, cardId }).lean(),
      Flashcard.findById(cardId).lean()
    ]);

    if (!cardReview || !Array.isArray(cardReview.reviewHistory) || cardReview.reviewHistory.length === 0) {
      return res.status(404).json({ success: false, message: 'Chưa có lịch sử ôn tập cho thẻ này' });
    }

    const course = cardReview.courseId ? await Course.findById(cardReview.courseId).select('title').lean() : null;

    // Sắp xếp lịch sử ôn tập theo thời gian tăng dần
    const sortedHistory = [...cardReview.reviewHistory]
      .filter((h) => h && h.date)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Gom theo từng mốc ngày (nếu ôn nhiều lần trong cùng 1 ngày thì giữ lượt cuối của ngày đó;
    // nếu tất cả các lượt ôn diễn ra trong cùng 1 ngày duy nhất thì giãn theo chỉ số lượt ôn để đồ thị vẫn trực quan)
    const dayGroupMap = new Map<string, typeof sortedHistory[0]>();
    for (const h of sortedHistory) {
      const d = new Date(h.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      dayGroupMap.set(key, h);
    }

    const distinctEvents =
      dayGroupMap.size >= 2
        ? Array.from(dayGroupMap.values())
        : sortedHistory;

    const firstDate = new Date(distinctEvents[0].date);
    firstDate.setHours(0, 0, 0, 0);

    const formatDDMM = (d: Date) =>
      `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
    const formatYYYYMMDD = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    // Tính toạ độ ngày t_k cho từng sự kiện ôn tập
    let lastDayOffset = -1;
    const eventsWithOffset = distinctEvents.map((ev, idx) => {
      const evDate = new Date(ev.date);
      evDate.setHours(0, 0, 0, 0);
      let dayOffset = Math.max(0, Math.round((evDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24)));
      if (dayOffset <= lastDayOffset) {
        dayOffset = lastDayOffset + Math.max(1, Number(distinctEvents[idx - 1]?.interval || 1));
      }
      lastDayOffset = dayOffset;
      const syntheticDate = new Date(firstDate);
      syntheticDate.setDate(firstDate.getDate() + dayOffset);

      return {
        ...ev,
        dayOffset,
        displayDate: syntheticDate,
        quality: Number(ev.quality ?? 4),
        interval: Math.max(1, Number(ev.interval || (idx === 0 ? 1 : idx === 1 ? 6 : 15))),
        easeFactor: Number(ev.easeFactor ?? 2.5)
      };
    });

    // Đường cong quên tự nhiên nếu KHÔNG có SRS từ Ngày 0: R_without(t) = max(12, round(100 * e^(-t / 3.2)))
    const computeWithoutSrs = (t: number) => Math.max(12, Math.round(100 * Math.exp(-t / 3.2)));

    interface SawtoothPoint {
      x: number;
      dayIndex: number;
      label: string;
      date: string;
      withoutReview: number;
      withSrs: number;
      preReviewRetention?: number;
      isReviewEvent: boolean;
      isTroughPoint?: boolean;
      isNextDuePoint?: boolean;
      reviewNumber?: number;
      reviewQuality?: number;
      intervalAfter?: number;
      efAfter?: number;
    }

    const points: SawtoothPoint[] = [];

    // Điểm khởi đầu tại Ngày 0 (Lần học đầu tiên)
    const firstEv = eventsWithOffset[0];
    points.push({
      x: 0,
      dayIndex: 0,
      label: `Lần 1 (${formatDDMM(firstEv.displayDate)})`,
      date: formatYYYYMMDD(firstEv.displayDate),
      withoutReview: 100,
      withSrs: 100,
      isReviewEvent: true,
      reviewNumber: 1,
      reviewQuality: firstEv.quality,
      intervalAfter: firstEv.interval,
      efAfter: Number(firstEv.easeFactor.toFixed(2))
    });

    // Duyệt qua các khoảng giữa lần ôn k và lần ôn k+1
    for (let k = 0; k < eventsWithOffset.length - 1; k++) {
      const currEv = eventsWithOffset[k];
      const nextEv = eventsWithOffset[k + 1];
      const tStart = currEv.dayOffset;
      const tEnd = nextEv.dayOffset;
      const span = Math.max(1, tEnd - tStart);

      // Độ nhớ mục tiêu ngay trước lần ôn tiếp theo (tăng dần độ bền qua mỗi chu kỳ: ~76% -> ~81% -> ~85%)
      const preReviewTarget = Math.min(88, 76 + k * 4);
      const startPeak = currEv.quality >= 2 ? 100 : 82;
      const cycleStability = span / -Math.log(preReviewTarget / startPeak);

      // Chèn các điểm trung gian để vẽ đường cong hàm mũ mượt mà
      const midSteps = Math.min(4, Math.max(1, span - 1));
      for (let s = 1; s <= midSteps; s++) {
        const dt = (span * s) / (midSteps + 1);
        const tCurr = Number((tStart + dt).toFixed(2));
        const dCurr = new Date(firstDate);
        dCurr.setDate(firstDate.getDate() + Math.round(tCurr));
        const decayed = Math.round(startPeak * Math.exp(-dt / cycleStability));

        points.push({
          x: tCurr,
          dayIndex: Math.round(tCurr),
          label: formatDDMM(dCurr),
          date: formatYYYYMMDD(dCurr),
          withoutReview: computeWithoutSrs(tCurr),
          withSrs: decayed,
          isReviewEvent: false
        });
      }

      // 1. Điểm đáy ngay trước khi ôn tập tại t = tEnd (Trough point)
      points.push({
        x: tEnd,
        dayIndex: tEnd,
        label: formatDDMM(nextEv.displayDate),
        date: formatYYYYMMDD(nextEv.displayDate),
        withoutReview: computeWithoutSrs(tEnd),
        withSrs: preReviewTarget,
        isReviewEvent: false,
        isTroughPoint: true
      });

      // 2. Điểm bật thẳng đứng lên 100% ngay sau khi ôn tại cùng toạ độ x = tEnd (Sawtooth Jump)
      const peakAfterReview = nextEv.quality >= 2 ? 100 : 82;
      points.push({
        x: tEnd,
        dayIndex: tEnd,
        label: `Lần ${k + 2} (${formatDDMM(nextEv.displayDate)})`,
        date: formatYYYYMMDD(nextEv.displayDate),
        withoutReview: computeWithoutSrs(tEnd),
        withSrs: peakAfterReview,
        preReviewRetention: preReviewTarget,
        isReviewEvent: true,
        reviewNumber: k + 2,
        reviewQuality: nextEv.quality,
        intervalAfter: nextEv.interval,
        efAfter: Number(nextEv.easeFactor.toFixed(2))
      });
    }

    // Chu kỳ dự phóng từ lần ôn cuối cùng đến Điểm rơi tiếp theo (nextReviewDate)
    const lastEv = eventsWithOffset[eventsWithOffset.length - 1];
    const tLast = lastEv.dayOffset;
    const futureSpan = Math.max(2, Number(cardReview.interval || lastEv.interval || 6));
    const tDue = tLast + futureSpan;
    const dueTargetRetention = 86;
    const lastPeak = lastEv.quality >= 2 ? 100 : 82;
    const futureStability = futureSpan / -Math.log(dueTargetRetention / lastPeak);

    const futureMidSteps = Math.min(4, Math.max(2, Math.floor(futureSpan / 3)));
    for (let s = 1; s <= futureMidSteps; s++) {
      const dt = (futureSpan * s) / (futureMidSteps + 1);
      const tCurr = Number((tLast + dt).toFixed(2));
      const dCurr = new Date(firstDate);
      dCurr.setDate(firstDate.getDate() + Math.round(tCurr));
      const decayed = Math.round(lastPeak * Math.exp(-dt / futureStability));

      points.push({
        x: tCurr,
        dayIndex: Math.round(tCurr),
        label: formatDDMM(dCurr),
        date: formatYYYYMMDD(dCurr),
        withoutReview: computeWithoutSrs(tCurr),
        withSrs: decayed,
        isReviewEvent: false
      });
    }

    const nextDueDate = cardReview.nextReviewDate
      ? new Date(cardReview.nextReviewDate)
      : new Date(lastEv.displayDate.getTime() + futureSpan * 86400000);

    points.push({
      x: tDue,
      dayIndex: tDue,
      label: `Điểm rơi (${formatDDMM(nextDueDate)})`,
      date: formatYYYYMMDD(nextDueDate),
      withoutReview: computeWithoutSrs(tDue),
      withSrs: dueTargetRetention,
      isReviewEvent: false,
      isNextDuePoint: true,
      intervalAfter: cardReview.interval || futureSpan,
      efAfter: Number((cardReview.easeFactor ?? 2.5).toFixed(2))
    });

    res.json({
      success: true,
      data: {
        cardId: cardReview.cardId.toString(),
        front: flashcard?.front || 'Từ vựng',
        back: flashcard?.back || '',
        phonetic: flashcard?.phonetic || '',
        deckTitle: (course as any)?.title || 'Bộ thẻ từ vựng',
        easeFactor: Number((cardReview.easeFactor ?? 2.5).toFixed(2)),
        interval: cardReview.interval ?? 0,
        repetitions: cardReview.repetitions ?? 0,
        status: cardReview.status || 'Review',
        reviewsCount: sortedHistory.length,
        nextReviewDate: nextDueDate,
        totalSpanDays: tDue,
        points
      }
    });
  } catch (error) {
    console.error('Lỗi khi getCardCurve:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

/**
 * GET /api/v1/srs/forecast
 * Đếm chính xác số lượng thẻ có nextReviewDate rơi vào từng ngày trong 7 ngày tới (Hôm nay -> +6 ngày).
 */
export const getReviewForecast = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const reviews = await CardReview.find({ userId })
      .select('nextReviewDate status interval repetitions')
      .lean();

    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    const forecast: Array<{
      offset: number;
      label: string;
      dayName: string;
      dateLabel: string;
      date: string;
      count: number;
      isToday: boolean;
    }> = [];

    for (let offset = 0; offset < 7; offset++) {
      const startOfDay = new Date(todayStart);
      startOfDay.setDate(todayStart.getDate() + offset);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(startOfDay);
      endOfDay.setHours(23, 59, 59, 999);

      const count = reviews.filter((r) => {
        if (!r.nextReviewDate) return false;
        const dueTime = new Date(r.nextReviewDate).getTime();
        if (offset === 0) {
          // Cột "Hôm nay" bao gồm tất cả thẻ quá hạn hoặc đến hạn trong hôm nay
          return dueTime <= endOfDay.getTime();
        }
        return dueTime >= startOfDay.getTime() && dueTime <= endOfDay.getTime();
      }).length;

      const dd = String(startOfDay.getDate()).padStart(2, '0');
      const mm = String(startOfDay.getMonth() + 1).padStart(2, '0');
      const yyyy = startOfDay.getFullYear();

      forecast.push({
        offset,
        label: offset === 0 ? 'Hôm nay' : offset === 1 ? 'Ngày mai' : `+${offset} ngày`,
        dayName: dayNames[startOfDay.getDay()],
        dateLabel: `${dd}/${mm}`,
        date: `${yyyy}-${mm}-${dd}`,
        count,
        isToday: offset === 0
      });
    }

    res.json({
      success: true,
      data: forecast
    });
  } catch (error) {
    console.error('Lỗi khi getReviewForecast:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};
