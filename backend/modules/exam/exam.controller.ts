import { Request, Response } from 'express';
import Exam from '../../database/models/Exam';
import Question from '../../database/models/Question';
import ExamResult from '../../database/models/ExamResult';

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
    const exams = await Exam.find({ status: 'Published' }).sort({ createdAt: -1 }).lean();
    
    // Lấy tiến độ của user
    const results = await ExamResult.find({ userId }).lean();
    const resultByExamId = results.reduce((acc: any, curr: any) => {
      acc[curr.examId.toString()] = curr;
      return acc;
    }, {});

    const examsWithProgress = exams.map(exam => ({
      ...exam,
      progress: resultByExamId[exam._id.toString()] || null
    }));

    res.json({ success: true, data: examsWithProgress });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

export const getExamById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const exam = await Exam.findById(id).lean();
    if (!exam) return res.status(404).json({ success: false, message: 'Exam not found' });

    const questions = await Question.find({ examId: id }).lean();
    // Ẩn đáp án đúng khỏi Client
    const sanitizedQuestions = questions.map((q: any) => {
      const { answerData, ...rest } = q;
      return rest;
    });

    res.json({ success: true, data: { ...exam, questions: sanitizedQuestions } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

export const submitExam = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { answers } = req.body; // Map { questionId: answer }
    const userId = req.user?.id;

    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const questions = await Question.find({ examId: id }).lean();
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
