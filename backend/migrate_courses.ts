import 'dotenv/config';
import mongoose from 'mongoose';
import Course from './database/models/Course';
import Chapter from './database/models/Chapter';
import Lesson from './database/models/Lesson';

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/lexicore';

async function migrateCourses() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB.');

    const courses = await Course.find({ type: 'course' });
    console.log(`Found ${courses.length} courses to inspect/migrate.`);

    for (const course of courses) {
      // 1. Standardize level
      if (course.level === 'All Levels') course.level = 'ALL';
      else if (course.level === 'A1 Beginner') course.level = 'A1';
      else if (course.level === 'B2 Upper Intermediate') course.level = 'B2';
      else if (!course.level) course.level = 'ALL';

      // 2. Set status & shortDescription & objectives
      if (!course.status) {
        course.status = course.isPublished ? 'published' : 'draft';
      }
      if (course.shortDescription === undefined) {
        course.shortDescription = (course.description || '').slice(0, 150);
      }
      if (!Array.isArray(course.objectives)) {
        course.objectives = [];
      }

      // 3. Recalculate stats
      const chapters = await Chapter.find({ courseId: course._id });
      const lessons = await Lesson.find({ courseId: course._id });
      const totalDuration = lessons.reduce((sum, l) => sum + (l.durationMinutes || 0), 0);

      course.stats = {
        totalChapters: chapters.length,
        totalLessons: lessons.length,
        totalDurationMinutes: totalDuration
      };

      await course.save();

      // 4. Update Chapters
      for (const ch of chapters) {
        let changed = false;
        if (ch.summary === undefined) { ch.summary = ''; changed = true; }
        if (!Array.isArray(ch.keyTakeaways)) { ch.keyTakeaways = []; changed = true; }
        if (changed) await ch.save();
      }

      // 5. Update Lessons
      for (const ls of lessons) {
        let changed = false;
        if (!ls.type) {
          ls.type = ls.videoUrl ? 'video' : 'reading';
          changed = true;
        }
        if (ls.notes === undefined) { ls.notes = ''; changed = true; }
        if (!Array.isArray(ls.vocabulary)) { ls.vocabulary = []; changed = true; }
        if (!Array.isArray(ls.quiz)) { ls.quiz = []; changed = true; }
        if (changed) await ls.save();
      }
    }

    console.log('Course migration completed successfully!');
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Migration error:', err);
    process.exit(1);
  }
}

migrateCourses();
