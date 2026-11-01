import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Course from '../../database/models/Course';
import Flashcard from '../../database/models/Flashcard';
import CardReview from '../../database/models/CardReview';
import Exam from '../../database/models/Exam';
import Question from '../../database/models/Question';
import ExamResult from '../../database/models/ExamResult';
import ExamReport from '../../database/models/ExamReport';
import ExamRating from '../../database/models/ExamRating';

// Helper kiểm tra quyền xuất bản (Admin hoặc Content Creator ACTIVE)
const canPublishContent = (req: Request): boolean => {
  const role = req.user?.role?.toLowerCase().replace(/\s+/g, '_');
  const creatorStatus = req.user?.creator_status;
  const isAdmin = role === 'admin';
  const isActiveCreator = role === 'content_creator' && creatorStatus !== 'SUSPENDED';
  return isAdmin || isActiveCreator;
};

// --- COURSES (FLASHCARD DECKS) ---
export const createCourse = async (req: Request, res: Response) => {
  try {
    const { title, description, thumbnail } = req.body;
    const creatorId = req.user?.id;
    if (!creatorId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    // Luôn tạo ở trạng thái private/draft ban đầu
    const course = new Course({ 
      title, 
      description, 
      thumbnail, 
      isPublished: false, 
      creatorId, 
      type: 'flashcard' 
    });
    await course.save();
    res.status(201).json({ success: true, data: course });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

export const updateCourse = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const creatorId = req.user?.id;

    // Chặn role user xuất bản ra cộng đồng
    if (req.body.isPublished === true && !canPublishContent(req)) {
      return res.status(403).json({
        success: false,
        message: 'Chỉ tài khoản Content Creator hoặc Admin mới có quyền xuất bản bộ thẻ ra cộng đồng.',
        requires_creator: true
      });
    }

    const course = await Course.findOneAndUpdate({ _id: id, creatorId }, req.body, { new: true });
    if (!course) return res.status(404).json({ success: false, message: 'Bộ thẻ không tồn tại hoặc bạn không có quyền.' });
    res.json({ success: true, data: course });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

export const deleteCourse = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const course = await Course.findOneAndDelete({ _id: id, creatorId: req.user?.id, type: 'flashcard' });
    if (!course) return res.status(404).json({ success: false, message: 'Flashcard deck not found' });
    
    // Delete associated flashcards
    await Flashcard.deleteMany({ courseId: id });
    res.json({ success: true, message: 'Course deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

export const getCourses = async (req: Request, res: Response) => {
  try {
    const { all } = req.query;
    const query: any = { type: 'flashcard' };
    if (!all && req.user?.role !== 'admin') {
      query.$or = [{ creatorId: req.user?.id }, { isPublished: true }];
    }
    const courses = await Course.find(query).sort({ createdAt: -1 });
    res.json({ success: true, data: courses });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

// --- FLASHCARDS ---
export const createFlashcard = async (req: Request, res: Response) => {
  try {
    const { courseId, lessonId, front, back, order } = req.body;
    
    // Verify course belongs to creator
    const course = await Course.findOne({ _id: courseId, creatorId: req.user?.id });
    if (!course) return res.status(404).json({ success: false, message: 'Course not found or unauthorized' });

    const flashcard = new Flashcard({ courseId, lessonId, front, back, order });
    await flashcard.save();
    res.status(201).json({ success: true, data: flashcard });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

export const updateFlashcard = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const flashcard = await Flashcard.findById(id);
    if (!flashcard) return res.status(404).json({ success: false, message: 'Flashcard not found' });
    
    const course = await Course.findOne({ _id: flashcard.courseId, creatorId: req.user?.id });
    if (!course) return res.status(404).json({ success: false, message: 'Unauthorized' });

    const updated = await Flashcard.findByIdAndUpdate(id, req.body, { new: true });
    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

export const deleteFlashcard = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const flashcard = await Flashcard.findById(id);
    if (!flashcard) return res.status(404).json({ success: false, message: 'Flashcard not found' });
    
    const course = await Course.findOne({ _id: flashcard.courseId, creatorId: req.user?.id });
    if (!course) return res.status(404).json({ success: false, message: 'Unauthorized' });

    await Flashcard.findByIdAndDelete(id);
    res.json({ success: true, message: 'Flashcard deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

export const getFlashcards = async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;
    const course = await Course.findOne({ _id: courseId, creatorId: req.user?.id });
    if (!course) return res.status(404).json({ success: false, message: 'Course not found or unauthorized' });

    const flashcards = await Flashcard.find({ courseId }).sort({ order: 1, createdAt: -1 });
    res.json({ success: true, data: flashcards });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

// --- FLASHCARD DECK MANAGEMENT (ATOMIC SAVE & DETAIL) ---
export const getDeckById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'ID bộ thẻ không hợp lệ' });
    }

    const deck = await Course.findOne({ 
      _id: id, 
      type: 'flashcard',
      $or: [
        { creatorId: userId },
        { isPublished: true }
      ]
    });

    if (!deck) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy bộ thẻ hoặc bạn không có quyền truy cập.' });
    }

    const cards = await Flashcard.find({ courseId: id }).sort({ order: 1 });
    return res.json({
      success: true,
      data: {
        deck,
        cards
      }
    });
  } catch (error) {
    console.error('Lỗi khi lấy chi tiết bộ thẻ:', error);
    return res.status(500).json({ success: false, message: 'Lỗi server khi lấy chi tiết bộ thẻ' });
  }
};

export const saveFullDeck = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { deck: deckInput, cards: cardsInput = [] } = req.body;
    if (!deckInput || !deckInput.title || !deckInput.title.trim()) {
      return res.status(400).json({ success: false, message: 'Tiêu đề bộ thẻ là bắt buộc' });
    }

    const isPublished = Boolean(deckInput.isPublished);

    // Chặn role user xuất bản ra ngoài cộng đồng
    if (isPublished && !canPublishContent(req)) {
      return res.status(403).json({
        success: false,
        message: 'Chỉ tài khoản Content Creator hoặc Admin mới có quyền xuất bản bộ thẻ ra cộng đồng.',
        requires_creator: true
      });
    }

    // Không cho phép xuất bản bộ thẻ không có thẻ nào
    if (isPublished && (!Array.isArray(cardsInput) || cardsInput.length === 0)) {
      return res.status(400).json({
        success: false,
        message: 'Bộ thẻ cần có ít nhất 1 thẻ từ vựng trước khi xuất bản ra cộng đồng.'
      });
    }

    let targetDeck: any = null;

    if (deckInput.id && mongoose.Types.ObjectId.isValid(deckInput.id)) {
      targetDeck = await Course.findOne({ _id: deckInput.id, creatorId: userId, type: 'flashcard' });
      if (!targetDeck) {
        return res.status(404).json({ success: false, message: 'Bộ thẻ không tồn tại hoặc bạn không có quyền chỉnh sửa.' });
      }

      targetDeck.title = deckInput.title.trim();
      targetDeck.description = (deckInput.description || '').trim();
      targetDeck.thumbnail = (deckInput.thumbnail || '').trim();
      targetDeck.level = deckInput.level || targetDeck.level || 'ALL';
      targetDeck.tags = Array.isArray(deckInput.tags) ? deckInput.tags : targetDeck.tags || [];
      targetDeck.allowClone = deckInput.allowClone !== undefined ? Boolean(deckInput.allowClone) : (targetDeck.allowClone !== false);
      targetDeck.isPublished = isPublished;
      targetDeck.status = isPublished ? 'published' : 'draft';
      if (isPublished && !targetDeck.publishedAt) {
        targetDeck.publishedAt = new Date();
      }
      targetDeck.cardCount = cardsInput.length;
      await targetDeck.save();
    } else {
      targetDeck = new Course({
        title: deckInput.title.trim(),
        description: (deckInput.description || '').trim(),
        thumbnail: (deckInput.thumbnail || '').trim(),
        level: deckInput.level || 'ALL',
        tags: Array.isArray(deckInput.tags) ? deckInput.tags : [],
        allowClone: deckInput.allowClone !== false,
        isPublished: isPublished,
        status: isPublished ? 'published' : 'draft',
        publishedAt: isPublished ? new Date() : null,
        creatorId: userId,
        type: 'flashcard',
        cardCount: cardsInput.length
      });
      await targetDeck.save();
    }

    const deckId = targetDeck._id;

    // --- ĐỒNG BỘ DANH SÁCH THẺ (ATOMIC CARDS SYNC) ---
    const existingCards = await Flashcard.find({ courseId: deckId });
    const existingCardMap = new Map(existingCards.map(c => [c._id.toString(), c]));
    const retainedCardIds: mongoose.Types.ObjectId[] = [];
    const savedCards: any[] = [];

    for (let i = 0; i < cardsInput.length; i++) {
      const cardData = cardsInput[i];
      const front = (cardData.front || '').trim();
      const back = (cardData.back || '').trim();
      if (!front || !back) continue; // Bỏ qua thẻ trống

      const order = typeof cardData.order === 'number' ? cardData.order : i;
      const partOfSpeech = cardData.partOfSpeech || 'noun';
      const phonetic = (cardData.phonetic || '').trim();
      const audioUrl = (cardData.audioUrl || '').trim();
      const example = (cardData.example || '').trim();
      const exampleMeaning = (cardData.exampleMeaning || '').trim();
      const synonyms = Array.isArray(cardData.synonyms) ? cardData.synonyms : [];
      const note = (cardData.note || '').trim();
      const imageUrl = (cardData.imageUrl || '').trim();

      if (cardData.id && mongoose.Types.ObjectId.isValid(cardData.id) && existingCardMap.has(cardData.id)) {
        const existingCard = existingCardMap.get(cardData.id)!;
        existingCard.front = front;
        existingCard.back = back;
        existingCard.order = order;
        existingCard.partOfSpeech = partOfSpeech;
        existingCard.phonetic = phonetic;
        existingCard.audioUrl = audioUrl;
        existingCard.example = example;
        existingCard.exampleMeaning = exampleMeaning;
        existingCard.synonyms = synonyms;
        existingCard.note = note;
        existingCard.imageUrl = imageUrl;
        await existingCard.save();
        retainedCardIds.push(existingCard._id);
        savedCards.push(existingCard);
      } else {
        const newCard = new Flashcard({
          courseId: deckId,
          front,
          back,
          order,
          partOfSpeech,
          phonetic,
          audioUrl,
          example,
          exampleMeaning,
          synonyms,
          note,
          imageUrl,
          initialEaseFactor: 2.5,
          initialInterval: 0,
          initialRepetitions: 0
        });
        await newCard.save();
        retainedCardIds.push(newCard._id);
        savedCards.push(newCard);
      }
    }

    // Xóa những thẻ không còn tồn tại trong danh sách mới
    await Flashcard.deleteMany({
      courseId: deckId,
      _id: { $nin: retainedCardIds }
    });

    // Cập nhật lại cardCount chính xác
    targetDeck.cardCount = retainedCardIds.length;
    await targetDeck.save();

    // --- TỰ ĐỘNG KHỞI TẠO SRS (SPACED REPETITION) CHO TÁC GIẢ ---
    for (const cardDoc of savedCards) {
      await CardReview.findOneAndUpdate(
        { userId, cardId: cardDoc._id },
        {
          $setOnInsert: {
            userId,
            cardId: cardDoc._id,
            courseId: deckId,
            easeFactor: 2.5,
            interval: 0,
            repetitions: 0,
            nextReviewDate: new Date(),
            status: 'New',
            reviewHistory: []
          }
        },
        { upsert: true, new: true }
      );
    }

    // Xóa CardReview của những thẻ đã bị xóa
    await CardReview.deleteMany({
      courseId: deckId,
      cardId: { $nin: retainedCardIds }
    });

    return res.status(200).json({
      success: true,
      message: 'Đã lưu bộ thẻ thành công',
      data: {
        deck: targetDeck,
        cards: savedCards
      }
    });
  } catch (error) {
    console.error('Lỗi khi lưu bộ thẻ:', error);
    return res.status(500).json({ success: false, message: 'Lỗi server khi lưu bộ thẻ' });
  }
};

export const publishDeck = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    if (!canPublishContent(req)) {
      return res.status(403).json({
        success: false,
        message: 'Chỉ tài khoản Content Creator hoặc Admin mới có quyền xuất bản bộ thẻ ra cộng đồng.',
        requires_creator: true
      });
    }

    const deck = await Course.findOne({ _id: id, creatorId: userId, type: 'flashcard' });
    if (!deck) return res.status(404).json({ success: false, message: 'Không tìm thấy bộ thẻ.' });

    const cardCount = await Flashcard.countDocuments({ courseId: id });
    if (cardCount === 0) {
      return res.status(400).json({ success: false, message: 'Bộ thẻ cần có ít nhất 1 thẻ từ vựng trước khi xuất bản.' });
    }

    deck.isPublished = true;
    deck.status = 'published';
    deck.publishedAt = new Date();
    deck.cardCount = cardCount;
    await deck.save();

    return res.json({ success: true, message: 'Đã xuất bản bộ thẻ ra cộng đồng thành công', data: deck });
  } catch (error) {
    console.error('Lỗi khi xuất bản bộ thẻ:', error);
    return res.status(500).json({ success: false, message: 'Lỗi server khi xuất bản bộ thẻ' });
  }
};

export const unpublishDeck = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const deck = await Course.findOne({ _id: id, creatorId: userId, type: 'flashcard' });
    if (!deck) return res.status(404).json({ success: false, message: 'Không tìm thấy bộ thẻ.' });

    deck.isPublished = false;
    deck.status = 'draft';
    await deck.save();

    return res.json({ success: true, message: 'Đã chuyển bộ thẻ về bản nháp', data: deck });
  } catch (error) {
    console.error('Lỗi khi hủy xuất bản bộ thẻ:', error);
    return res.status(500).json({ success: false, message: 'Lỗi server khi hủy xuất bản bộ thẻ' });
  }
};

export const cloneDirectDeck = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const sourceDeck = await Course.findOne({
      _id: id,
      type: 'flashcard',
      $or: [{ creatorId: userId }, { isPublished: true }]
    });

    if (!sourceDeck) return res.status(404).json({ success: false, message: 'Không tìm thấy bộ thẻ gốc.' });

    if (sourceDeck.creatorId !== userId && sourceDeck.allowClone === false) {
      return res.status(403).json({ success: false, message: 'Tác giả không cho phép nhân bản bộ thẻ này.' });
    }

    const clonedDeck = new Course({
      title: `${sourceDeck.title} (Bản sao)`,
      description: sourceDeck.description || '',
      thumbnail: sourceDeck.thumbnail || '',
      level: sourceDeck.level || 'ALL',
      tags: sourceDeck.tags || [],
      price: 0,
      creatorId: userId,
      type: 'flashcard',
      isPublished: false,
      status: 'draft',
      allowClone: true,
      cardCount: 0
    });
    await clonedDeck.save();

    const sourceCards = await Flashcard.find({ courseId: id }).sort({ order: 1 }).lean();
    if (sourceCards.length > 0) {
      const newCards = sourceCards.map(c => ({
        courseId: clonedDeck._id,
        front: c.front,
        back: c.back,
        order: c.order,
        partOfSpeech: c.partOfSpeech || 'noun',
        phonetic: c.phonetic || '',
        audioUrl: c.audioUrl || '',
        example: c.example || '',
        exampleMeaning: c.exampleMeaning || '',
        synonyms: c.synonyms || [],
        note: c.note || '',
        imageUrl: c.imageUrl || '',
        initialEaseFactor: c.initialEaseFactor || 2.5,
        initialInterval: c.initialInterval || 0,
        initialRepetitions: c.initialRepetitions || 0
      }));
      const inserted = await Flashcard.insertMany(newCards);
      clonedDeck.cardCount = inserted.length;
      await clonedDeck.save();

      const reviews = inserted.map(c => ({
        userId,
        cardId: c._id,
        courseId: clonedDeck._id,
        easeFactor: 2.5,
        interval: 0,
        repetitions: 0,
        nextReviewDate: new Date(),
        status: 'New',
        reviewHistory: []
      }));
      await CardReview.insertMany(reviews);
    }

    return res.status(201).json({
      success: true,
      message: 'Nhân bản bộ thẻ vào Private Space thành công!',
      data: clonedDeck
    });
  } catch (error) {
    console.error('Lỗi khi nhân bản bộ thẻ:', error);
    return res.status(500).json({ success: false, message: 'Lỗi server khi nhân bản bộ thẻ' });
  }
};

// --- EXAMS (CREATOR) ---
export const getCreatorExams = async (req: Request, res: Response) => {
  try {
    const exams = await Exam.find({ createdBy: req.user?.id }).sort({ createdAt: -1 }).lean();
    
    const examsWithDistribution = await Promise.all(exams.map(async (exam) => {
      const ratings = await ExamRating.find({ examId: exam._id });
      const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
      ratings.forEach(r => {
        if (distribution[r.rating as keyof typeof distribution] !== undefined) {
          distribution[r.rating as keyof typeof distribution]++;
        }
      });
      return { ...exam, ratingDistribution: distribution };
    }));

    res.json({ success: true, data: examsWithDistribution });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

export const getCreatorExamById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const exam = await Exam.findOne({ _id: id, createdBy: req.user?.id }).lean();
    if (!exam) return res.status(404).json({ success: false, message: 'Exam not found' });

    const questions = await Question.find({ examId: new mongoose.Types.ObjectId(String(id)) }).sort({ order: 1 }).lean();
    res.json({ success: true, data: { ...exam, questions } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

export const createExam = async (req: Request, res: Response) => {
  try {
    const { title, description, thumbnail } = req.body;
    const creatorId = req.user?.id;
    if (!creatorId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const exam = new Exam({ 
      title, 
      description, 
      thumbnail, 
      status: 'Draft',
      totalQuestions: 0,
      createdBy: creatorId 
    });
    await exam.save();

    res.status(201).json({ success: true, data: exam });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

export const updateExam = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, description, thumbnail, status, password } = req.body;

    // Chặn role user xuất bản bài thi ra cộng đồng
    if (status === 'Published' && !canPublishContent(req)) {
      return res.status(403).json({
        success: false,
        message: 'Chỉ tài khoản Content Creator hoặc Admin mới có quyền xuất bản bài kiểm tra ra cộng đồng.',
        requires_creator: true
      });
    }
    
    const exam = await Exam.findOneAndUpdate(
      { _id: id, createdBy: req.user?.id }, 
      { title, description, thumbnail, status, password },
      { new: true }
    );

    if (!exam) return res.status(404).json({ success: false, message: 'Exam not found or unauthorized' });

    res.json({ success: true, data: exam });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

export const deleteExam = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const exam = await Exam.findOneAndDelete({ _id: id, createdBy: req.user?.id });
    if (!exam) return res.status(404).json({ success: false, message: 'Exam not found or unauthorized' });

    // Delete associated data
    await Question.deleteMany({ examId: id });
    await ExamResult.deleteMany({ examId: id });
    await ExamReport.deleteMany({ examId: id });
    await ExamRating.deleteMany({ examId: id });

    res.json({ success: true, message: 'Exam deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

export const saveExamQuestions = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { questions } = req.body; // Array of question objects
    
    const exam = await Exam.findOne({ _id: id, createdBy: req.user?.id });
    if (!exam) return res.status(404).json({ success: false, message: 'Exam not found or unauthorized' });

    console.log(`Saving questions for exam ${id}. Questions received: ${questions?.length}`);

    if (Array.isArray(questions)) {
      await Question.deleteMany({ examId: exam._id });
      const questionsToSave = questions.map((q: any, idx: number) => ({
        examId: exam._id,
        order: idx,
        type: q.type,
        content: q.content,
        answerData: q.answerData
      }));
      
      console.log("Questions to save:", JSON.stringify(questionsToSave));
      
      if (questionsToSave.length > 0) {
        await Question.insertMany(questionsToSave);
        console.log("Successfully inserted questions.");
      }
      
      exam.totalQuestions = questionsToSave.length;
      await exam.save();
    }

    res.json({ success: true, message: 'Questions saved successfully' });
  } catch (error) {
    console.error("Error in saveExamQuestions:", error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

export const bulkActionExams = async (req: Request, res: Response) => {
  try {
    const { ids, action } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: 'Danh sách ID không hợp lệ' });
    }

    const creatorId = req.user?.id;

    if (action === 'delete') {
      const exams = await Exam.find({ _id: { $in: ids }, createdBy: creatorId });
      const validIds = exams.map(e => e._id);
      
      await Exam.deleteMany({ _id: { $in: validIds } });
      await Question.deleteMany({ examId: { $in: validIds } });
      await ExamResult.deleteMany({ examId: { $in: validIds } });
      await ExamReport.deleteMany({ examId: { $in: validIds } });
      await ExamRating.deleteMany({ examId: { $in: validIds } });
      
    } else if (action === 'publish') {
      if (!canPublishContent(req)) {
        return res.status(403).json({
          success: false,
          message: 'Chỉ tài khoản Content Creator hoặc Admin mới có quyền xuất bản bài kiểm tra ra cộng đồng.',
          requires_creator: true
        });
      }
      await Exam.updateMany({ _id: { $in: ids }, createdBy: creatorId }, { status: 'Published' });
    } else if (action === 'unpublish') {
      await Exam.updateMany({ _id: { $in: ids }, createdBy: creatorId }, { status: 'Draft' });
    } else {
      return res.status(400).json({ success: false, message: 'Hành động không hợp lệ' });
    }

    res.json({ success: true, message: 'Thao tác thành công' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

// --- PRIVATE SPACE API ---
export const getPrivateSpaceContent = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    // 1. Lấy tất cả khóa học của user (cả private và public)
    const courses = await Course.find({ creatorId: userId, type: 'course' }).sort({ createdAt: -1 }).lean();

    // 2. Lấy tất cả bộ thẻ Flashcard của user kèm số thẻ trong từng bộ
    const flashcardDecks = await Course.find({ creatorId: userId, type: 'flashcard' }).sort({ createdAt: -1 }).lean();
    const flashcardDecksWithCount = await Promise.all(flashcardDecks.map(async (deck) => {
      const cardCount = await Flashcard.countDocuments({ courseId: deck._id });
      return {
        ...deck,
        cardCount
      };
    }));

    // 3. Lấy tất cả bài kiểm tra của user
    const exams = await Exam.find({ createdBy: userId }).sort({ createdAt: -1 }).lean();

    // 4. Tổng hợp số liệu thống kê
    const stats = {
      totalCourses: courses.length,
      totalFlashcardDecks: flashcardDecks.length,
      totalExams: exams.length,
      privateCourses: courses.filter(c => !c.isPublished).length,
      privateDecks: flashcardDecks.filter(d => !d.isPublished).length,
      privateExams: exams.filter(e => e.status !== 'Published').length,
    };

    res.json({
      success: true,
      data: {
        courses,
        flashcardDecks: flashcardDecksWithCount,
        exams,
        stats
      }
    });
  } catch (error) {
    console.error('Lỗi khi lấy dữ liệu Private Space:', error);
    res.status(500).json({ success: false, message: 'Lỗi server khi lấy dữ liệu Private Space' });
  }
};

export const getExamRatings = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const exam = await Exam.findOne({ _id: id, createdBy: req.user?.id });
    if (!exam) return res.status(404).json({ success: false, message: 'Exam not found or unauthorized' });

    // Assuming we might want to populate user details if we had a User model,
    // but we can just return the raw rating records for now.
    const ratings = await ExamRating.find({ examId: id }).sort({ createdAt: -1 }).lean();
    res.json({ success: true, data: ratings });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};
