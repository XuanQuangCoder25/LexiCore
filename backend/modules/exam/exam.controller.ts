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
      status: 'Draft', 
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
    const { title, description, thumbnail, questions, status } = req.body;
    const creatorId = req.user?.id;

    // Chặn role user xuất bản bài kiểm tra ra cộng đồng
    if (status === 'Published') {
      const role = req.user?.role?.toLowerCase().replace(/\s+/g, '_');
      const creatorStatus = req.user?.creator_status;
      const isAdmin = role === 'admin';
      const isActiveCreator = role === 'content_creator' && creatorStatus !== 'SUSPENDED';
      if (!isAdmin && !isActiveCreator) {
        return res.status(403).json({
          success: false,
          message: 'Chỉ tài khoản Content Creator hoặc Admin mới có quyền xuất bản bài kiểm tra ra cộng đồng.',
          requires_creator: true
        });
      }
    }

    const updateFields: any = { title, description, thumbnail, totalQuestions: questions ? questions.length : 0 };
    if (status) updateFields.status = status;

    const exam = await Exam.findOneAndUpdate(
      { _id: id, createdBy: creatorId }, 
      updateFields,
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
    const questions = await Question.find({ examId: new mongoose.Types.ObjectId(String(id)) }).sort({ order: 1 }).lean();
    console.log(`Found ${questions.length} questions for exam ${id}`);
    
    // Ẩn đáp án đúng và lời giải chi tiết khỏi Client trong lúc làm bài
    const sanitizedQuestions = questions.map((q: any) => {
      const { answerData, explanation, ...rest } = q;
      let safeContent = rest.content ? { ...rest.content } : {};
      
      // Đảm bảo không lộ đáp án/lời giải trong subQuestions của Audio/Video/Reading
      if (Array.isArray(safeContent.subQuestions)) {
        safeContent.subQuestions = safeContent.subQuestions.map((sq: any) => {
          const { explanation: sqExp, correctOption, ...restSq } = sq;
          return restSq;
        });
      }
      return {
        ...rest,
        content: safeContent
      };
    });

    // Xáo trộn thứ tự câu hỏi nếu bài thi bật shuffleQuestions
    let finalQuestions = sanitizedQuestions;
    if (exam.shuffleQuestions && sanitizedQuestions.length > 1) {
      finalQuestions = [...sanitizedQuestions].sort(() => Math.random() - 0.5);
    }

    const { password, ...restExam } = exam;

    res.json({ 
      success: true, 
      data: { 
        ...restExam, 
        hasPassword: !!password, 
        questions: finalQuestions 
      } 
    });
  } catch (error) {
    console.error("Error in getExamById:", error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

export const submitExam = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { answers, durationSpentSeconds } = req.body; // Map { questionId: answer }
    const userId = req.user?.id;

    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const exam = await Exam.findById(id).lean();
    if (!exam) return res.status(404).json({ success: false, message: 'Exam not found' });

    const questions = await Question.find({ examId: new mongoose.Types.ObjectId(String(id)) }).sort({ order: 1 }).lean();
    if (!questions.length) return res.status(404).json({ success: false, message: 'No questions found for this exam' });

    let correctCount = 0;
    const questionReviews: any[] = [];
    const userAnswersMap = answers || {};
    
    questions.forEach(q => {
      const qId = q._id.toString();
      const userAnswer = userAnswersMap[qId];

      if (q.type === 'MultipleChoice') {
        const correctOpt = q.answerData?.correctOption;
        let isCorrect = false;
        if (typeof userAnswer === 'string') {
          isCorrect = userAnswer.trim().toLowerCase() === String(correctOpt).trim().toLowerCase();
        } else if (userAnswer && typeof userAnswer === 'object') {
          isCorrect = userAnswer.selectedOption === correctOpt;
        }

        if (isCorrect) correctCount++;

        questionReviews.push({
          questionId: q._id,
          order: q.order,
          type: q.type,
          content: q.content,
          userAnswer: userAnswer || null,
          correctAnswer: correctOpt,
          isCorrect,
          explanation: q.explanation || q.content?.explanation || ''
        });

      } else if (q.type === 'DragDrop' || q.type === 'FillBlank') {
        const correctMapping = q.answerData?.mapping || (typeof q.answerData === 'object' ? q.answerData : {});
        const keys = Object.keys(correctMapping);
        let isCorrect = false;

        if (keys.length > 0 && userAnswer && typeof userAnswer === 'object') {
          isCorrect = keys.every(key => {
            const userVal = String(userAnswer[key] || '').trim().toLowerCase();
            const correctVal = String(correctMapping[key] || '').trim().toLowerCase();
            return userVal === correctVal;
          });
        }

        if (isCorrect) correctCount++;

        questionReviews.push({
          questionId: q._id,
          order: q.order,
          type: q.type,
          content: q.content,
          userAnswer: userAnswer || null,
          correctAnswer: correctMapping,
          isCorrect,
          explanation: q.explanation || ''
        });

      } else if (q.type === 'Audio' || q.type === 'Video' || q.type === 'Reading') {
        const subQuestions = Array.isArray(q.content?.subQuestions) ? q.content.subQuestions : [];
        const correctMapping = q.answerData?.mapping || (typeof q.answerData === 'object' ? q.answerData : {});
        let subCorrect = 0;

        const subReviews = subQuestions.map((sq: any) => {
          const userSubAns = userAnswer && typeof userAnswer === 'object' ? userAnswer[sq.id] : undefined;
          const correctSubAns = correctMapping[sq.id];
          const isSubCorrect = userSubAns !== undefined && String(userSubAns).trim().toLowerCase() === String(correctSubAns).trim().toLowerCase();
          if (isSubCorrect) subCorrect++;

          return {
            id: sq.id,
            text: sq.text,
            options: sq.options,
            userAnswer: userSubAns || null,
            correctAnswer: correctSubAns || null,
            isCorrect: isSubCorrect,
            explanation: sq.explanation || ''
          };
        });

        const isCorrect = subQuestions.length > 0 && subCorrect === subQuestions.length;
        if (isCorrect) correctCount++;

        questionReviews.push({
          questionId: q._id,
          order: q.order,
          type: q.type,
          content: q.content,
          userAnswer: userAnswer || null,
          correctAnswer: correctMapping,
          isCorrect,
          explanation: q.explanation || '',
          subQuestionReviews: subReviews
        });
      } else {
        // Fallback cho question type khác nếu có
        questionReviews.push({
          questionId: q._id,
          order: q.order,
          type: q.type,
          content: q.content,
          userAnswer: userAnswer || null,
          correctAnswer: q.answerData,
          isCorrect: false,
          explanation: q.explanation || ''
        });
      }
    });

    const score = Math.round((correctCount / questions.length) * 100);
    const passingScore = typeof exam.passingScore === 'number' ? exam.passingScore : 70;
    const passed = score >= passingScore;
    const spentSeconds = Number(durationSpentSeconds) || 0;
    
    // Tìm result cũ hoặc tạo mới
    let result = await ExamResult.findOne({ userId, examId: id });
    if (result) {
       result.score = score;
       result.passed = passed;
       result.correctCount = correctCount;
       result.totalQuestions = questions.length;
       result.durationSpentSeconds = spentSeconds;
       result.answers = userAnswersMap;
       result.progress = 100;
       result.status = 'Completed';
       result.completedAt = new Date();
       await result.save();
    } else {
       result = new ExamResult({
         userId,
         examId: id,
         score,
         passed,
         correctCount,
         totalQuestions: questions.length,
         durationSpentSeconds: spentSeconds,
         progress: 100,
         status: 'Completed',
         completedAt: new Date(),
         answers: userAnswersMap
       });
       await result.save();
    }

    res.json({ 
      success: true, 
      data: { 
        score, 
        passed,
        passingScore,
        correctCount, 
        total: questions.length, 
        durationSpentSeconds: spentSeconds,
        result,
        questionReviews
      } 
    });
  } catch (error) {
    console.error('Error in submitExam:', error);
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

    await ExamReport.create({ examId: String(id) as any, userId, reason });

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

    await ExamRating.create({ examId: String(id) as any, userId, rating, review });

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
