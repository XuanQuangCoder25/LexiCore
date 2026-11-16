import { Request, Response } from 'express';
import StudySession from '../../database/models/StudySession';
import RetentionLog from '../../database/models/RetentionLog';
import User from '../../database/models/User';
import Course from '../../database/models/Course';
import Chapter from '../../database/models/Chapter';
import Lesson from '../../database/models/Lesson';
import CardReview from '../../database/models/CardReview';
import ExamResult from '../../database/models/ExamResult';
import '../../database/models/Achievement';
import { findUserById } from '../auth/auth-repository';
import { pool } from '../../config/mysql';
import { getDailyGoals } from '../gamification/gamification-repository';
import { updateStreak } from '../../utils/streak';

/**
 * Quy đổi cấp độ (level số nguyên từ MySQL wallets) sang nhãn CEFR hiển thị trên Dashboard.
 */
const formatUserLevelLabel = (walletLevel: number, mongoLevel?: string): string => {
  let cefr = 'A1 Beginner';
  if (walletLevel >= 15) cefr = 'C2 Mastery';
  else if (walletLevel >= 11) cefr = 'C1 Advanced';
  else if (walletLevel >= 8) cefr = 'B2 Upper Intermediate';
  else if (walletLevel >= 5) cefr = 'B1 Intermediate';
  else if (walletLevel >= 3) cefr = 'A2 Elementary';
  else if (mongoLevel && mongoLevel !== 'A1 Beginner') cefr = mongoLevel;

  return `Lv.${Math.max(1, walletLevel)} • ${cefr}`;
};

/**
 * Định dạng thời gian học thực tế (tính bằng giây) sang chuỗi hiển thị trực quan.
 */
const formatStudyDuration = (totalSeconds: number): string => {
  const sec = Math.max(0, Math.round(totalSeconds || 0));
  if (sec === 0) return '0m';
  if (sec < 60) return `${sec}s`;
  if (sec < 3600) {
    const mins = Math.floor(sec / 60);
    const remSec = sec % 60;
    return remSec > 0 ? `${mins}m ${remSec}s` : `${mins}m`;
  }
  const hours = Math.floor(sec / 3600);
  const mins = Math.floor((sec % 3600) / 60);
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
};

// 1. Quick Stats (GET /api/v1/dashboard/stats)
export const getStats = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    // 1. Truy vấn song song dữ liệu thật từ cả MySQL và MongoDB
    const [mysqlUser, mongoUser, studySessions, cardReviews, examResults, dueCardsToday] = await Promise.all([
      findUserById(userId).catch(() => null),
      User.findById(userId).lean(),
      StudySession.find({ userId }).lean(),
      CardReview.find({ userId }).lean(),
      ExamResult.find({ userId }).lean(),
      CardReview.countDocuments({ userId, nextReviewDate: { $lte: new Date() } })
    ]);

    // Đếm thời gian luyện tập Shadowing từ MySQL (nếu có)
    let shadowingSeconds = 0;
    let shadowingCount = 0;
    try {
      const [shadowRows] = await pool.execute(
        `SELECT COUNT(ush.id) AS total_segments,
                COALESCE(SUM(GREATEST(3, COALESCE(ss.end_time - ss.start_time, 5))), 0) AS total_seconds
         FROM user_shadowing_history ush
         LEFT JOIN shadowing_segments ss ON ush.segment_id = ss.id
         WHERE ush.user_id = ?`,
        [userId]
      );
      const row = (shadowRows as any[])[0];
      if (row) {
        shadowingCount = Number(row.total_segments || 0);
        shadowingSeconds = Number(row.total_seconds || 0);
      }
    } catch {
      // Bỏ qua nếu bảng chưa có dữ liệu
    }

    // 2. Tính tổng số bài học đã hoàn thành (Lessons Completed)
    const completedLessonIds = Array.isArray(mongoUser?.completedLessons)
      ? mongoUser!.completedLessons.map((id) => id.toString())
      : [];
    const sessionLessons = studySessions.reduce((sum, s) => sum + (s.lessonsCompleted || 0), 0);
    const lessonsCompleted = Math.max(completedLessonIds.length, sessionLessons);

    // 3. Lấy thông tin các bài học đã hoàn thành để cộng từ vựng và thời lượng fallback
    let completedLessonsDocs: any[] = [];
    if (completedLessonIds.length > 0) {
      completedLessonsDocs = await Lesson.find({ _id: { $in: completedLessonIds } })
        .select('_id durationMinutes vocabulary')
        .lean();
    }

    // 4. Tính tổng thời gian học thực tế (Study Time - giây)
    // 4a. Thời gian học Course (từ enrolledCourses.lessonTimeSpent / timeSpentSeconds)
    const recordedLessonTimeMap: Record<string, number> = {};
    let courseSpentSeconds = 0;
    if (Array.isArray(mongoUser?.enrolledCourses)) {
      for (const ec of mongoUser!.enrolledCourses) {
        const ecMap = (ec as any).lessonTimeSpent;
        if (ecMap && typeof ecMap === 'object') {
          const entries = ecMap instanceof Map ? Array.from(ecMap.entries()) : Object.entries(ecMap);
          for (const [lId, sec] of entries) {
            const val = Number(sec || 0);
            if (val > 0) {
              recordedLessonTimeMap[String(lId)] = val;
              courseSpentSeconds += val;
            }
          }
        } else if (Number((ec as any).timeSpentSeconds || 0) > 0) {
          courseSpentSeconds += Number((ec as any).timeSpentSeconds || 0);
        }
      }
    }

    // Nếu có bài học đã hoàn thành trước khi có bộ đếm giây chi tiết, cộng thời lượng ước tính của bài đó
    for (const lDoc of completedLessonsDocs) {
      const lId = lDoc._id.toString();
      if (!recordedLessonTimeMap[lId] && courseSpentSeconds === 0) {
        courseSpentSeconds += (Number(lDoc.durationMinutes) || 5) * 60;
      }
    }

    // 4b. Thời gian làm bài kiểm tra (ExamResult.durationSpentSeconds)
    const examSpentSeconds = examResults.reduce((sum, er) => sum + (Number(er.durationSpentSeconds) || 0), 0);

    // 4c. Thời gian ôn tập thẻ nhớ SRS (CardReview.reviewHistory.responseTimeMs)
    let srsSpentSeconds = 0;
    for (const cr of cardReviews) {
      if (Array.isArray(cr.reviewHistory)) {
        for (const rev of cr.reviewHistory) {
          const ms = Number(rev.responseTimeMs || 0);
          srsSpentSeconds += ms > 0 ? Math.round(ms / 1000) : 5;
        }
      }
    }

    // 4d. Thời gian từ StudySession (nếu có)
    const sessionSeconds = studySessions.reduce((sum, s) => sum + (Number(s.durationMinutes) || 0) * 60, 0);

    const totalStudySeconds = Math.max(
      sessionSeconds,
      courseSpentSeconds + examSpentSeconds + srsSpentSeconds + shadowingSeconds
    );
    const durationMinutes = totalStudySeconds > 0 ? Math.max(1, Math.round(totalStudySeconds / 60)) : 0;
    const durationHours = Number((totalStudySeconds / 3600).toFixed(1));

    // 5. Tính số từ vựng đã học (Words Learned)
    const srsWordsLearned = cardReviews.filter(
      (cr) =>
        cr.status === 'Learning' ||
        cr.status === 'Review' ||
        cr.status === 'Relearning' ||
        (cr.repetitions && cr.repetitions > 0) ||
        (Array.isArray(cr.reviewHistory) && cr.reviewHistory.length > 0)
    ).length;

    const lessonWordsLearned = completedLessonsDocs.reduce(
      (sum, lDoc) => sum + (Array.isArray(lDoc.vocabulary) ? lDoc.vocabulary.length : 0),
      0
    );

    const wordsLearned = Math.max(
      Number(mongoUser?.totalWordsLearned || 0),
      srsWordsLearned + lessonWordsLearned
    );

    // 6. Tính Streak & Level thực tế từ MySQL Wallets
    let currentStreak = Math.max(
      Number(mysqlUser?.current_streak || 0),
      Number(mongoUser?.streak || 0)
    );

    // Nếu user đã có hoạt động học tập thực tế nhưng streak vẫn bằng 0, tự động kích hoạt updateStreak
    const hasRealActivity = lessonsCompleted > 0 || srsWordsLearned > 0 || examResults.length > 0 || shadowingCount > 0;
    if (hasRealActivity && currentStreak === 0) {
      try {
        await updateStreak(userId);
        currentStreak = 1;
      } catch {
        currentStreak = 1;
      }
    }

    const walletLevel = Number(mysqlUser?.level || 1);
    const levelLabel = formatUserLevelLabel(walletLevel, mongoUser?.level);

    res.json({
      userName: mysqlUser?.full_name || mongoUser?.username || 'Học viên',
      durationHours,
      durationMinutes,
      durationSeconds: totalStudySeconds,
      formattedDuration: formatStudyDuration(totalStudySeconds),
      lessonsCompleted,
      level: levelLabel,
      wordsLearned,
      streak: currentStreak,
      dueCardsToday,
      examsCompleted: examResults.filter((e) => e.status === 'Completed').length
    });
  } catch (error) {
    console.error('Lỗi API getStats:', error);
    res.status(500).json({ message: (error as Error).message });
  }
};

// 2. Retention Curve (GET /api/v1/dashboard/retention)
export const getRetention = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    // 1. Kiểm tra dữ liệu ôn tập thật từ CardReview
    const cardReviews = await CardReview.find({ userId }).lean();
    const allReviews: Array<{ date: Date; quality: number; interval: number; easeFactor: number }> = [];

    for (const cr of cardReviews) {
      if (Array.isArray(cr.reviewHistory)) {
        for (const rev of cr.reviewHistory) {
          if (rev.date) {
            allReviews.push({
              date: new Date(rev.date),
              quality: Number(rev.quality ?? 4),
              interval: Number(rev.interval ?? cr.interval ?? 1),
              easeFactor: Number(rev.easeFactor ?? cr.easeFactor ?? 2.5)
            });
          }
        }
      }
    }

    if (allReviews.length > 0) {
      // Sắp xếp lịch sử ôn tập theo thời gian tăng dần
      allReviews.sort((a, b) => a.date.getTime() - b.date.getTime());

      const firstReviewDay = new Date(allReviews[0].date);
      firstReviewDay.setHours(0, 0, 0, 0);

      const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const now = new Date();
      const points: Array<{ day: string; date: string; retention: number; withReview: number; reviewsCount: number }> = [];

      for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(now.getDate() - i);
        d.setHours(0, 0, 0, 0);

        const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

        // Nếu ngày d nằm TRƯỚC ngày đầu tiên user từng ôn tập -> Chưa có dữ liệu (0%)
        if (d.getTime() < firstReviewDay.getTime()) {
          points.push({
            day: `${dayLabels[d.getDay()]} (${d.getDate()}/${d.getMonth() + 1})`,
            date: dateStr,
            retention: 0,
            withReview: 0,
            reviewsCount: 0
          });
          continue;
        }

        // Các lượt ôn tập diễn ra trong đúng ngày d
        const dayReviews = allReviews.filter((r) => {
          const rd = r.date;
          return (
            rd.getFullYear() === d.getFullYear() &&
            rd.getMonth() === d.getMonth() &&
            rd.getDate() === d.getDate()
          );
        });

        // Các lượt ôn tập tính từ đầu cho tới hết ngày d
        const endOfDay = new Date(d);
        endOfDay.setHours(23, 59, 59, 999);
        const reviewsUpToDay = allReviews.filter((r) => r.date.getTime() <= endOfDay.getTime());
        const lastReviewBeforeOrOnDay = reviewsUpToDay[reviewsUpToDay.length - 1];

        // Số ngày trôi qua kể từ ngày bắt đầu học thẻ đầu tiên (cho đường cong quên tự nhiên không ôn tập)
        const daysSinceFirst = Math.max(0, Math.round((d.getTime() - firstReviewDay.getTime()) / (1000 * 60 * 60 * 24)));
        const naturalRetention = Math.max(15, Math.round(100 * Math.exp(-daysSinceFirst / 3)));

        // Tính tỷ lệ nhớ thực tế (withReview) dựa trên lịch sử ôn tập thật
        let withReview = 0;
        if (dayReviews.length > 0) {
          // Có ôn tập trong ngày: tính điểm nhớ thực tế từ quality (0..5) của các lượt ôn trong ngày
          const avgQualityRatio =
            dayReviews.reduce((sum, r) => sum + Math.min(1, Math.max(0, r.quality >= 3 ? 0.8 + (r.quality - 3) * 0.1 : r.quality * 0.2)), 0) /
            dayReviews.length;
          withReview = Math.round(avgQualityRatio * 100);
        } else if (lastReviewBeforeOrOnDay) {
          // Không ôn tập trong ngày d, nhưng đã ôn trước đó: suy giảm theo interval & easeFactor thật của lần ôn gần nhất
          const lastRevDay = new Date(lastReviewBeforeOrOnDay.date);
          lastRevDay.setHours(0, 0, 0, 0);
          const daysElapsed = Math.max(1, Math.round((d.getTime() - lastRevDay.getTime()) / (1000 * 60 * 60 * 24)));
          const stability = Math.max(1, (lastReviewBeforeOrOnDay.interval || 1) * (lastReviewBeforeOrOnDay.easeFactor || 2.5));
          const lastScore = lastReviewBeforeOrOnDay.quality >= 3 ? (80 + (lastReviewBeforeOrOnDay.quality - 3) * 10) : 50;
          withReview = Math.max(naturalRetention, Math.round(lastScore * Math.exp(-daysElapsed / stability)));
        }

        points.push({
          day: `${dayLabels[d.getDay()]} (${d.getDate()}/${d.getMonth() + 1})`,
          date: dateStr,
          retention: naturalRetention,
          withReview: Math.min(100, Math.max(0, withReview)),
          reviewsCount: dayReviews.length
        });
      }

      return res.json(points);
    }

    // 2. Fallback kiểm tra bảng RetentionLog nếu có dữ liệu
    const logs = await RetentionLog.find({ userId }).sort({ date: 1 }).limit(7).lean();
    if (!logs || logs.length === 0) {
      return res.json([]);
    }
    res.json(logs);
  } catch (error) {
    console.error('Lỗi API getRetention:', error);
    res.status(500).json({ message: (error as Error).message });
  }
};

// 3. Current Courses (GET /api/v1/dashboard/courses)
export const getCoursesProgress = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const user = await User.findById(userId).populate('enrolledCourses.courseId').lean();

    if (!user || !Array.isArray(user.enrolledCourses) || user.enrolledCourses.length === 0) {
      return res.json([]);
    }

    const completedSet = new Set((user.completedLessons || []).map((id) => id.toString()));
    const validEnrollments = user.enrolledCourses.filter(
      (ec) => ec.courseId != null && (ec.courseId as any).type !== 'flashcard'
    );

    const coursesProgress = await Promise.all(
      validEnrollments.map(async (ec) => {
        const course = ec.courseId as any;
        const courseLessons = await Lesson.find({ courseId: course._id }).select('_id').lean();
        const totalLessons = courseLessons.length;
        const completedCount = courseLessons.filter((l) => completedSet.has(l._id.toString())).length;

        const computedProgress =
          totalLessons > 0
            ? Math.round((completedCount / totalLessons) * 100)
            : Number(ec.progressPercentage || 0);

        return {
          id: course._id.toString(),
          title: course.title,
          level: course.level || 'ALL',
          thumbnail: course.thumbnail || '',
          progress: ec.isCompleted ? 100 : computedProgress,
          completedLessons: completedCount,
          totalLessons,
          isCompleted: !!ec.isCompleted
        };
      })
    );

    res.json(coursesProgress);
  } catch (error) {
    console.error('Lỗi API getCoursesProgress:', error);
    res.status(500).json({ message: (error as Error).message });
  }
};

// 4. Next Lessons (GET /api/v1/dashboard/lessons)
export const getNextLessons = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const user = await User.findById(userId).lean();

    if (!user || !Array.isArray(user.enrolledCourses) || user.enrolledCourses.length === 0) {
      return res.json([]);
    }

    const enrolledCourseIds = user.enrolledCourses
      .map((c) => c.courseId)
      .filter((id) => id != null);

    if (enrolledCourseIds.length === 0) {
      return res.json([]);
    }

    const [courses, chapters, uncompletedLessons] = await Promise.all([
      Course.find({ _id: { $in: enrolledCourseIds }, type: 'course' }).select('_id title level').lean(),
      Chapter.find({ courseId: { $in: enrolledCourseIds } }).select('_id courseId order title').sort({ order: 1 }).lean(),
      Lesson.find({
        courseId: { $in: enrolledCourseIds },
        _id: { $nin: user.completedLessons || [] }
      })
        .select('_id courseId chapterId title durationMinutes order type')
        .lean()
    ]);

    const courseMap = new Map(courses.map((c) => [c._id.toString(), c]));
    const chapterOrderMap = new Map(chapters.map((ch) => [ch._id.toString(), ch.order || 1]));

    // Lọc chỉ lấy bài học thuộc các khóa học còn tồn tại và sắp xếp theo (Chapter.order -> Lesson.order)
    const sortedLessons = uncompletedLessons
      .filter((l) => courseMap.has(l.courseId.toString()))
      .sort((a, b) => {
        const chOrderA = chapterOrderMap.get(a.chapterId?.toString()) ?? 999;
        const chOrderB = chapterOrderMap.get(b.chapterId?.toString()) ?? 999;
        if (chOrderA !== chOrderB) return chOrderA - chOrderB;
        return (a.order || 1) - (b.order || 1);
      })
      .slice(0, 4);

    const nextLessons = sortedLessons.map((lesson) => {
      const course = courseMap.get(lesson.courseId.toString());
      return {
        id: lesson._id.toString(),
        courseId: lesson.courseId.toString(),
        title: lesson.title,
        course: course ? course.title : 'Khóa học',
        duration: `${lesson.durationMinutes || 5} phút`,
        type: lesson.type || 'reading'
      };
    });

    res.json(nextLessons);
  } catch (error) {
    console.error('Lỗi API getNextLessons:', error);
    res.status(500).json({ message: (error as Error).message });
  }
};

// 5. Recent Activities, Achievements & Daily Goals (GET /api/v1/dashboard/activities)
export const getActivities = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    // 1. Lấy danh sách thành tựu đã mở khóa từ MySQL (user_achievements + achievement_definitions)
    let mysqlUnlockedAchievements: Array<{
      id: string;
      title: string;
      description: string;
      icon: string;
      category?: string;
      unlockedAt?: Date | string;
    }> = [];

    try {
      const [rows] = await pool.execute(
        `SELECT a.id, a.title, a.description, a.icon, a.category, ua.unlocked_at
         FROM user_achievements ua
         JOIN achievement_definitions a ON ua.achievement_id = a.id
         WHERE ua.user_id = ? AND ua.is_unlocked = TRUE
         ORDER BY ua.unlocked_at DESC
         LIMIT 5`,
        [userId]
      );
      mysqlUnlockedAchievements = (rows as any[]).map((r) => ({
        id: String(r.id),
        title: r.title,
        description: r.description || '',
        icon: r.icon || 'Trophy',
        category: r.category,
        unlockedAt: r.unlocked_at
      }));
    } catch {
      // fallback nếu lỗi kết nối MySQL
    }

    // 2. Lấy thêm từ MongoDB User.unlockedAchievements (nếu có) và gộp lại không trùng lặp
    const user = await User.findById(userId).populate('unlockedAchievements.achievementId').lean();
    const mongoAchievements = (user?.unlockedAchievements || [])
      .filter((ua: any) => ua.achievementId != null)
      .sort((a: any, b: any) => new Date(b.unlockedAt).getTime() - new Date(a.unlockedAt).getTime())
      .map((ua: any) => {
        const ach = ua.achievementId as any;
        return {
          id: ach._id.toString(),
          title: ach.title,
          description: ach.description || '',
          icon: ach.icon || 'Award',
          unlockedAt: ua.unlockedAt
        };
      });

    const seenIds = new Set(mysqlUnlockedAchievements.map((a) => a.id));
    const combinedAchievements = [
      ...mysqlUnlockedAchievements,
      ...mongoAchievements.filter((a) => !seenIds.has(a.id))
    ].slice(0, 5);

    // 3. Lấy tiến độ Daily Goals hôm nay từ MySQL
    let dailyGoalsSummary = {
      completed: 0,
      total: 0,
      title: 'Hoàn thành nhiệm vụ hàng ngày'
    };
    try {
      const goals = await getDailyGoals(userId);
      const onlyDaily = goals.filter((g: any) => g.type === 'DAILY');
      if (onlyDaily.length > 0) {
        dailyGoalsSummary = {
          completed: onlyDaily.filter((g: any) => Boolean(g.is_completed)).length,
          total: onlyDaily.length,
          title: onlyDaily[0].description || onlyDaily[0].title || 'Hoàn thành nhiệm vụ hàng ngày'
        };
      }
    } catch {
      // ignore
    }

    // 4. Tính điểm tích cực trong tuần (weeklyActivityScore) từ hoạt động thực tế
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const [recentCardReviews, recentExams] = await Promise.all([
      CardReview.countDocuments({
        userId,
        'reviewHistory.date': { $gte: oneWeekAgo }
      }),
      ExamResult.countDocuments({
        userId,
        createdAt: { $gte: oneWeekAgo }
      })
    ]);

    const completedLessonsCount = Array.isArray(user?.completedLessons) ? user!.completedLessons.length : 0;
    const rawActivityPoints =
      Number(user?.weeklyActivityScore || 0) +
      recentCardReviews * 5 +
      recentExams * 15 +
      completedLessonsCount * 10;
    const weeklyActivityScore = Math.min(99, Math.max(0, rawActivityPoints));

    res.json({
      achievements: combinedAchievements,
      weeklyActivityScore,
      dailyGoals: dailyGoalsSummary
    });
  } catch (error) {
    console.error('Lỗi API getActivities:', error);
    res.status(500).json({ message: (error as Error).message });
  }
};
