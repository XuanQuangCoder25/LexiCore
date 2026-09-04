import { Request, Response } from 'express';
import StudySession from '../../database/models/StudySession';
import RetentionLog from '../../database/models/RetentionLog';

// Cho Dev A: Lấy dữ liệu Quick Stats
export const getStats = async (req: Request, res: Response) => {
  try {
    // Tạm mock userId nếu middleware Auth chưa bóc tách JWT
    const userId = (req as any).user?.id || 'demo-user-id'; 
    const sessions = await StudySession.find({ userId });
    
    const totalDuration = sessions.reduce((sum, s) => sum + s.durationMinutes, 0);
    const totalLessons = sessions.reduce((sum, s) => sum + s.lessonsCompleted, 0);
    
    res.json({
      durationHours: Math.round(totalDuration / 60),
      lessonsCompleted: totalLessons,
      level: 'B2', 
      wordsLearned: totalLessons * 10
    });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server' });
  }
};

// Cho Dev B: Lấy dữ liệu Đường cong quên lãng
export const getRetention = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id || 'demo-user-id';
    const logs = await RetentionLog.find({ userId }).sort({ date: -1 }).limit(7);
    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server' });
  }
};
