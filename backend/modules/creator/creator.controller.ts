import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Course from '../../database/models/Course';
import Flashcard from '../../database/models/Flashcard';

// --- COURSES ---
export const createCourse = async (req: Request, res: Response) => {
  try {
    const { title, description, thumbnail, isPublished } = req.body;
    const creatorId = req.user?.id;
    if (!creatorId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const course = new Course({ title, description, thumbnail, isPublished, creatorId });
    await course.save();
    res.status(201).json({ success: true, data: course });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

export const updateCourse = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const course = await Course.findOneAndUpdate({ _id: id, creatorId: req.user?.id }, req.body, { new: true });
    if (!course) return res.status(404).json({ success: false, message: 'Course not found' });
    res.json({ success: true, data: course });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

export const deleteCourse = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const course = await Course.findOneAndDelete({ _id: id, creatorId: req.user?.id });
    if (!course) return res.status(404).json({ success: false, message: 'Course not found' });
    
    // Delete associated flashcards
    await Flashcard.deleteMany({ courseId: id });
    res.json({ success: true, message: 'Course deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

export const getCourses = async (req: Request, res: Response) => {
  try {
    const courses = await Course.find({ creatorId: req.user?.id }).sort({ createdAt: -1 });
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

// --- EXAMS (CREATOR) ---
import Exam from '../../database/models/Exam';
import Question from '../../database/models/Question';
import ExamResult from '../../database/models/ExamResult';
import ExamReport from '../../database/models/ExamReport';
import ExamRating from '../../database/models/ExamRating';

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

    const questions = await Question.find({ examId: new mongoose.Types.ObjectId(id) }).sort({ order: 1 }).lean();
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
