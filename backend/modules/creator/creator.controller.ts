import { Request, Response } from 'express';
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
