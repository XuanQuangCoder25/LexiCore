import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Exam from '../../database/models/Exam';
import Question from '../../database/models/Question';
import ExamResult from '../../database/models/ExamResult';
import ExamReport from '../../database/models/ExamReport';
import ExamRating from '../../database/models/ExamRating';

// --- API cho Creator Studio (Quản lý) ---

export const createExam = async (req: Request, res: Response) => {
  try {
    const { title, description, thumbnail, questions } = req.body;
    const creatorId = req.user?.id;
    if (!creatorId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const exam = new Exam({ 
      title, 
      description, 
      thumbnail, 
      totalQuestions: questions ? questions.length : 0,
      createdBy: creatorId 
    });
    await exam.save();

    if (questions && questions.length > 0) {
      const questionsToSave = questions.map((q: any) => ({
        ...q,
        examId: exam._id
      }));
      await Question.insertMany(questionsToSave);
    }

    res.status(201).json({ success: true, data: exam });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

export const updateExam = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, description, thumbnail, questions } = req.body;
    const creatorId = req.user?.id;

    const exam = await Exam.findOneAndUpdate(
      { _id: id, createdBy: creatorId }, 
      { title, description, thumbnail, totalQuestions: questions ? questions.length : 0 },
      { new: true }
    );

    if (!exam) return res.status(404).json({ success: false, message: 'Exam not found or unauthorized' });

    if (questions) {
      // Đơn giản hóa: Xóa câu hỏi cũ, thêm câu hỏi mới
      await Question.deleteMany({ examId: exam._id });
      const questionsToSave = questions.map((q: any) => ({
        ...q,
        examId: exam._id
      }));
      await Question.insertMany(questionsToSave);
    }

    res.json({ success: true, data: exam });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};


// --- API cho trang Exam (Hiển thị & Làm bài) ---

export const getExams = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { search, sort } = req.query;

    const query: any = { status: 'Published' };
    if (search) {
      query.title = { $regex: search, $options: 'i' };
    }

    let sortObj: any = { createdAt: -1 };
    if (sort === 'oldest') sortObj = { createdAt: 1 };
    if (sort === 'highest_rated') sortObj = { averageRating: -1, createdAt: -1 };

    const exams = await Exam.find(query).sort(sortObj).lean();
    
    // Lấy tiến độ của user
    const results = await ExamResult.find({ userId }).lean();
    const resultByExamId = results.reduce((acc: any, curr: any) => {
      acc[curr.examId.toString()] = curr;
      return acc;
    }, {});

    const examsWithProgress = exams.map(exam => {
      const { password, ...rest } = exam;
      return {
        ...rest,
        hasPassword: !!password,
        progress: resultByExamId[exam._id.toString()] || null
      };
    });

    res.json({ success: true, data: examsWithProgress });
  } catch (error) {
    console.error("Error in getExams:", error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

export const getExamById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const exam = await Exam.findById(id).lean();
    if (!exam) return res.status(404).json({ success: false, message: 'Exam not found' });

    console.log(`Fetching exam with id: ${id}`);
    const questions = await Question.find({ examId: new mongoose.Types.ObjectId(id) }).sort({ order: 1 }).lean();
    console.log(`Found ${questions.length} questions for exam ${id}`);
    
    // Ẩn đáp án đúng khỏi Client
    const sanitizedQuestions = questions.map((q: any) => {
      const { answerData, ...rest } = q;
      return rest;
    });

    const { password, ...restExam } = exam;

    res.json({ success: true, data: { ...restExam, hasPassword: !!password, questions: sanitizedQuestions } });
  } catch (error) {
    console.error("Error in getExamById:", error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

export const submitExam = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { answers } = req.body; // Map { questionId: answer }
    const userId = req.user?.id;

    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const questions = await Question.find({ examId: new mongoose.Types.ObjectId(id) }).lean();
    if (!questions.length) return res.status(404).json({ success: false, message: 'No questions found for this exam' });

    let correctCount = 0;
    
    questions.forEach(q => {
      const userAnswer = answers[q._id.toString()];
      if (!userAnswer) return;

      if (q.type === 'MultipleChoice') {
        const correctOpt = q.answerData?.correctOption;
        if (userAnswer === correctOpt) correctCount++;
      } else if (q.type === 'DragDrop' || q.type === 'FillBlank' || q.type === 'Audio' || q.type === 'Video') {
        const correctMapping = q.answerData?.mapping || {};
        const keys = Object.keys(correctMapping);
        const isCorrect = keys.length > 0 && keys.every(key => correctMapping[key] === userAnswer[key]);
        // Also ensure user didn't submit extra keys incorrectly
        const userKeys = Object.keys(userAnswer);
        if (isCorrect && keys.length === userKeys.length) {
          correctCount++;
        }
      }
    });

    const score = (correctCount / questions.length) * 100;
    
    // Tìm result cũ hoặc tạo mới
    let result = await ExamResult.findOne({ userId, examId: id });
    if (result) {
       result.score = score;
       result.answers = answers;
       result.progress = 100;
       result.status = 'Completed';
       result.completedAt = new Date();
       await result.save();
    } else {
       result = new ExamResult({
         userId,
         examId: id,
         score,
         progress: 100,
         status: 'Completed',
         completedAt: new Date(),
         answers
       });
       await result.save();
    }

    res.json({ 
      success: true, 
      data: { 
        score, 
        correctCount, 
        total: questions.length, 
        result 
      } 
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

export const verifyPassword = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { password } = req.body;
    const exam = await Exam.findById(id).lean();
    if (!exam) return res.status(404).json({ success: false, message: 'Exam not found' });

    if (exam.password && exam.password !== password) {
      return res.status(401).json({ success: false, message: 'Mật khẩu không chính xác' });
    }

    res.json({ success: true, message: 'Mật khẩu chính xác' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

export const reportExam = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const existingReport = await ExamReport.findOne({ examId: id, userId });
    if (existingReport) {
      return res.status(400).json({ success: false, message: 'Bạn đã báo cáo bài thi này rồi.' });
    }

    await ExamReport.create({ examId: id, userId, reason });

    // Tự động Suspend nếu bị report >= 5 lần
    const reportCount = await ExamReport.countDocuments({ examId: id });
    if (reportCount >= 5) {
      await Exam.findByIdAndUpdate(id, { status: 'Suspended' });
    }

    res.json({ success: true, message: 'Đã gửi báo cáo thành công.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

export const rateExam = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { rating, review } = req.body;
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    // Verify user has completed the exam
    const result = await ExamResult.findOne({ examId: id, userId, status: 'Completed' });
    if (!result) {
      return res.status(400).json({ success: false, message: 'Bạn phải hoàn thành bài thi mới được đánh giá.' });
    }

    const existingRating = await ExamRating.findOne({ examId: id, userId });
    if (existingRating) {
      return res.status(400).json({ success: false, message: 'Bạn đã đánh giá bài thi này rồi.' });
    }

    await ExamRating.create({ examId: id, userId, rating, review });

    // Update average rating
    const allRatings = await ExamRating.find({ examId: id });
    const totalRatings = allRatings.length;
    const averageRating = totalRatings > 0 ? allRatings.reduce((acc, curr) => acc + curr.rating, 0) / totalRatings : 0;

    await Exam.findByIdAndUpdate(id, { totalRatings, averageRating });

    res.json({ success: true, message: 'Cảm ơn bạn đã đánh giá!' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

export const getExamRatings = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const ratings = await ExamRating.find({ examId: id }).sort({ createdAt: -1 }).lean();
    res.json({ success: true, data: ratings });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};
