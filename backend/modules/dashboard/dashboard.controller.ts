import { Request, Response } from 'express';
import StudySession from '../../database/models/StudySession';
import RetentionLog from '../../database/models/RetentionLog';
import User from '../../database/models/User';
import Lesson from '../../database/models/Lesson';
// Import as side-effects so TypeScript doesn't elide them when only used in populate()
import '../../database/models/Course';
import '../../database/models/Achievement';

// 1. Quick Stats
export const getStats = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    
    // Lấy thông tin user (để lấy streak, level, wordsLearned)
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy user' });
    }

    // Lấy thông tin từ StudySession (tổng thời gian, số bài học)
    const sessions = await StudySession.find({ userId });
    const totalDuration = sessions.reduce((sum, s) => sum + s.durationMinutes, 0);
    const totalLessons = sessions.reduce((sum, s) => sum + s.lessonsCompleted, 0);
    
    res.json({
      durationHours: Math.round(totalDuration / 60) || 0,
      lessonsCompleted: totalLessons || 0,
      level: user.level || 'A1 Beginner', 
      wordsLearned: user.totalWordsLearned || 0,
      streak: user.streak || 0
    });
  } catch (error) {
    console.error('Lỗi API:', error);
    res.status(500).json({ message: (error as Error).message, stack: (error as Error).stack });
  }
};

// 2. Retention Curve
export const getRetention = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const logs = await RetentionLog.find({ userId }).sort({ date: -1 }).limit(7);
    
    // Trả về [] nếu không có dữ liệu thật (Không mock!)
    if (!logs || logs.length === 0) {
      return res.json([]);
    }
    res.json(logs);
  } catch (error) {
    console.error('Lỗi API:', error);
    res.status(500).json({ message: (error as Error).message, stack: (error as Error).stack });
  }
};

// 3. Current Courses
export const getCoursesProgress = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const user = await User.findById(userId).populate('enrolledCourses.courseId');
    
    if (!user || !user.enrolledCourses || user.enrolledCourses.length === 0) {
      return res.json([]);
    }

    const coursesProgress = user.enrolledCourses
      .filter(ec => ec.courseId != null) // Lọc bỏ reference trống
      .map(ec => {
        const course = ec.courseId as any; 
        return {
          id: course._id,
          title: course.title,
          progress: ec.progressPercentage
        };
      });

    res.json(coursesProgress);
  } catch (error) {
    console.error('Lỗi API:', error);
    res.status(500).json({ message: (error as Error).message, stack: (error as Error).stack });
  }
};

// 4. Next Lessons
export const getNextLessons = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const user = await User.findById(userId);
    
    if (!user || !user.enrolledCourses || user.enrolledCourses.length === 0) {
      return res.json([]);
    }

    // Lấy bài học đầu tiên chưa hoàn thành của từng khóa đang học
    const enrolledCourseIds = user.enrolledCourses.map(c => c.courseId);
    
    const nextLessonsRaw = await Lesson.find({
      courseId: { $in: enrolledCourseIds },
      _id: { $nin: user.completedLessons } // Loại trừ bài đã học
    })
    .sort({ order: 1 })
    .limit(4) // Trả về tối đa 4 bài
    .populate('courseId', 'title');

    const nextLessons = nextLessonsRaw.map(lesson => {
      const course = lesson.courseId as any;
      return {
        id: lesson._id,
        title: lesson.title,
        course: course ? course.title : 'N/A',
        duration: `${lesson.durationMinutes} min`
      };
    });

    res.json(nextLessons);
  } catch (error) {
    console.error('Lỗi API:', error);
    res.status(500).json({ message: (error as Error).message, stack: (error as Error).stack });
  }
};

// 5. Recent Activities & Achievements
export const getActivities = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const user = await User.findById(userId).populate('unlockedAchievements.achievementId');
    
    if (!user) {
      return res.json({ achievements: [], weeklyActivityScore: 0 });
    }

    const achievements = user.unlockedAchievements
      .filter(ua => ua.achievementId != null)
      .sort((a, b) => b.unlockedAt.getTime() - a.unlockedAt.getTime())
      .slice(0, 5) // Lấy tối đa 5 thành tựu mới nhất
      .map(ua => {
        const ach = ua.achievementId as any;
        return {
          id: ach._id,
          title: ach.title,
          description: ach.description,
          icon: ach.icon
        };
      });

    res.json({
      achievements: achievements,
      weeklyActivityScore: user.weeklyActivityScore || 0
    });
  } catch (error) {
    console.error('Lỗi API:', error);
    res.status(500).json({ message: (error as Error).message, stack: (error as Error).stack });
  }
};
