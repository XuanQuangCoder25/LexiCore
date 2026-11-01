import 'dotenv/config';
import mongoose from 'mongoose';
import Course from '../database/models/Course';
import Lesson from '../database/models/Lesson';
import Chapter from '../database/models/Chapter';
import Flashcard from '../database/models/Flashcard';
import Exam from '../database/models/Exam';
import Question from '../database/models/Question';
import ExamResult from '../database/models/ExamResult';
import {
  saveFullDeck,
  saveFullExam,
  getPrivateSpaceContent,
  cloneDirectDeck,
  cloneExam
} from '../modules/creator/creator.controller';
import { submitExam } from '../modules/exam/exam.controller';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/lexicore';

function createMockReqRes(options: {
  body?: any;
  params?: any;
  query?: any;
  user?: { id: string; role?: string; creator_status?: string };
}) {
  let statusCode = 200;
  let responseData: any = null;

  const req: any = {
    body: options.body || {},
    params: options.params || {},
    query: options.query || {},
    user: options.user || { id: 'test-user-id', role: 'user' }
  };

  const res: any = {
    status: (code: number) => {
      statusCode = code;
      return res;
    },
    json: (data: any) => {
      responseData = data;
      return res;
    }
  };

  return {
    req,
    res,
    getStatusCode: () => statusCode,
    getData: () => responseData
  };
}

async function runPhase4SystemIntegrationTests() {
  console.log('====================================================');
  console.log('🚀 RUNNING PHASE 4: COURSE-FLASHCARD-EXAM E2E INTEGRATION');
  console.log('====================================================');

  await mongoose.connect(MONGODB_URI);
  console.log('✅ Connected to MongoDB');

  const testCreatorId = 'usr_phase4_creator_' + Date.now();
  const testStudentId = 'usr_phase4_student_' + Date.now();

  try {
    // ------------------------------------------------------------------------
    // 1. Creator creates an Exam with Academic Config & Reading question
    // ------------------------------------------------------------------------
    console.log('\n--- STEP 1: Creating an Academic Exam in Creator Studio ---');
    const examReq = createMockReqRes({
      user: { id: testCreatorId, role: 'content_creator', creator_status: 'ACTIVE' },
      body: {
        title: 'IELTS Final Assessment',
        description: 'Test attached to Lesson 1',
        durationMinutes: 30,
        passingScore: 80,
        level: 'B2',
        shuffleQuestions: true,
        skills: ['Listening', 'Reading'],
        status: 'Published',
        questions: [
          {
            type: 'Reading',
            content: {
              title: 'Global Ocean Ecosystem',
              passage: 'The Pacific Ocean is the largest and deepest ocean on Earth.',
              subQuestions: [
                {
                  id: 'sq_p4_1',
                  text: 'What is the largest ocean on Earth?',
                  options: ['Pacific Ocean', 'Atlantic Ocean', 'Indian Ocean'],
                  explanation: 'The passage explicitly says the Pacific Ocean is the largest.'
                }
              ]
            },
            answerData: { mapping: { sq_p4_1: 'Pacific Ocean' } },
            explanation: 'Detail retrieval from passage.'
          }
        ]
      }
    });

    await saveFullExam(examReq.req, examReq.res);
    if (examReq.getStatusCode() !== 200) {
      throw new Error(`Failed to create exam: ${JSON.stringify(examReq.getData())}`);
    }
    const createdExam = examReq.getData().data.exam;
    console.log(`✅ Exam created successfully: ID=${createdExam._id}, title="${createdExam.title}"`);

    // ------------------------------------------------------------------------
    // 2. Creator creates a Flashcard Deck with Rich Language Cards
    // ------------------------------------------------------------------------
    console.log('\n--- STEP 2: Creating a Flashcard Deck in Creator Studio ---');
    const deckReq = createMockReqRes({
      user: { id: testCreatorId, role: 'content_creator', creator_status: 'ACTIVE' },
      body: {
        deck: {
          title: 'Academic Collocations Deck',
          description: 'Deck attached to Lesson 1',
          level: 'B2',
          isPublished: true
        },
        cards: [
          {
            front: 'conduct research',
            back: 'tiến hành nghiên cứu',
            partOfSpeech: 'verb',
            phonetic: '/kənˈdʌkt rɪˈsɜːtʃ/',
            example: 'Scientists conduct research into climate change.'
          },
          {
            front: 'draw a conclusion',
            back: 'rút ra kết luận',
            partOfSpeech: 'verb',
            phonetic: '/drɔː ə kənˈkluːʒn/'
          }
        ]
      }
    });

    await saveFullDeck(deckReq.req, deckReq.res);
    if (deckReq.getStatusCode() !== 200) {
      throw new Error(`Failed to create deck: ${JSON.stringify(deckReq.getData())}`);
    }
    const createdDeck = deckReq.getData().data.deck;
    console.log(`✅ Deck created successfully: ID=${createdDeck._id}, cardCount=${createdDeck.cardCount}`);

    // ------------------------------------------------------------------------
    // 3. Creator creates Course & Lesson Cross-linking the Deck and Exam
    // ------------------------------------------------------------------------
    console.log('\n--- STEP 3: Cross-linking Course Lesson with Deck & Exam ---');
    const course = new Course({
      title: 'IELTS Intensive Masterclass',
      description: 'Master course with integrated cards and exams',
      creatorId: testCreatorId,
      type: 'course',
      isPublished: true,
      status: 'published'
    });
    await course.save();

    const chapter = new Chapter({
      courseId: course._id,
      title: 'Chương 1: Khoa học & Môi trường',
      order: 1
    });
    await chapter.save();

    const lesson = new Lesson({
      courseId: course._id,
      chapterId: chapter._id,
      title: 'Bài 1: Hải dương học & Từ vựng môi trường',
      order: 1,
      durationMinutes: 25,
      content: 'Trong bài này chúng ta tìm hiểu về đại dương...',
      attachedFlashcardId: createdDeck._id,
      attachedExamId: createdExam._id,
      isRequiredToPassExam: true
    });
    await lesson.save();

    // Verify Lesson cross-linking population in DB
    const populatedLesson = await Lesson.findById(lesson._id)
      .populate('attachedExamId', 'title description totalQuestions status averageRating durationMinutes passingScore level')
      .populate('attachedFlashcardId', 'title description cardCount')
      .lean();

    if (!populatedLesson) throw new Error('Failed to find created lesson');
    const attachedExam: any = populatedLesson.attachedExamId;
    const attachedDeck: any = populatedLesson.attachedFlashcardId;

    if (!attachedExam || attachedExam.durationMinutes !== 30 || attachedExam.passingScore !== 80 || attachedExam.level !== 'B2') {
      throw new Error('Attached exam populated fields mismatch');
    }
    if (!attachedDeck || attachedDeck.cardCount !== 2) {
      throw new Error(`Attached flashcard deck populated cardCount mismatch, got ${attachedDeck?.cardCount}`);
    }
    console.log(`✅ Lesson cross-link verified: attachedExam="${attachedExam.title}" (30m, 80%), attachedDeck="${attachedDeck.title}" (2 cards)`);

    // ------------------------------------------------------------------------
    // 4. Student takes the Attached Exam directly from Lesson
    // ------------------------------------------------------------------------
    console.log('\n--- STEP 4: Student takes Attached Exam via API ---');
    const examQuestions = await Question.find({ examId: createdExam._id });
    const answersPayload: Record<string, any> = {
      [examQuestions[0]._id.toString()]: { sq_p4_1: 'Pacific Ocean' } // Correct
    };

    const submitReq = createMockReqRes({
      user: { id: testStudentId, role: 'user' },
      params: { id: createdExam._id.toString() },
      body: {
        answers: answersPayload,
        durationSpentSeconds: 180
      }
    });

    await submitExam(submitReq.req, submitReq.res);
    if (submitReq.getStatusCode() !== 200) {
      throw new Error('Failed to submit attached exam');
    }

    const submitData = submitReq.getData().data;
    if (submitData.score !== 100 || !submitData.passed) {
      throw new Error('Expected 100% and passed=true for student exam submission');
    }
    if (!Array.isArray(submitData.questionReviews) || submitData.questionReviews.length !== 1) {
      throw new Error('Detailed questionReviews missing in submission result');
    }
    console.log(`✅ Student scored 100% on attached exam, passed=true, received full review & explanations`);

    // ------------------------------------------------------------------------
    // 5. Verify Private Space for Creator (Courses, Decks, Exams All in 1 Place)
    // ------------------------------------------------------------------------
    console.log('\n--- STEP 5: Verifying Private Space Sync for Creator ---');
    const spaceReq = createMockReqRes({
      user: { id: testCreatorId, role: 'content_creator' }
    });

    await getPrivateSpaceContent(spaceReq.req, spaceReq.res);
    if (spaceReq.getStatusCode() !== 200) {
      throw new Error('Failed to get private space content');
    }

    const spaceData = spaceReq.getData().data;
    const foundCourse = spaceData.courses.find((c: any) => c._id.toString() === course._id.toString());
    const foundDeck = spaceData.flashcardDecks.find((d: any) => d._id.toString() === createdDeck._id.toString());
    const foundExam = spaceData.exams.find((e: any) => e._id.toString() === createdExam._id.toString());

    if (!foundCourse || !foundDeck || !foundExam) {
      throw new Error('Private space missing one of the 3 created items');
    }
    if (foundDeck.cardCount !== 2 || foundExam.durationMinutes !== 30 || foundExam.passingScore !== 80) {
      throw new Error('Private space item details mismatch');
    }
    console.log('✅ Creator Private Space verified: Course, Flashcard Deck, and Exam all synchronized');

    // ------------------------------------------------------------------------
    // 6. Direct Cloning of Deck & Exam into Student Private Space
    // ------------------------------------------------------------------------
    console.log('\n--- STEP 6: Student Clones Public Deck & Exam to Private Space ---');
    const cloneDeckReq = createMockReqRes({
      user: { id: testStudentId, role: 'user' },
      params: { id: createdDeck._id.toString() }
    });
    await cloneDirectDeck(cloneDeckReq.req, cloneDeckReq.res);
    if (cloneDeckReq.getStatusCode() !== 201) {
      throw new Error('Failed to clone deck');
    }

    const cloneExamReq = createMockReqRes({
      user: { id: testStudentId, role: 'user' },
      params: { id: createdExam._id.toString() }
    });
    await cloneExam(cloneExamReq.req, cloneExamReq.res);
    if (cloneExamReq.getStatusCode() !== 201) {
      throw new Error('Failed to clone exam');
    }

    // Check student private space
    const studentSpaceReq = createMockReqRes({
      user: { id: testStudentId, role: 'user' }
    });
    await getPrivateSpaceContent(studentSpaceReq.req, studentSpaceReq.res);
    const studentSpace = studentSpaceReq.getData().data;

    const studentClonedDeck = studentSpace.flashcardDecks.find((d: any) => d.title.includes('(Bản sao)'));
    const studentClonedExam = studentSpace.exams.find((e: any) => e.title.includes('(Bản sao)'));

    if (!studentClonedDeck || !studentClonedExam) {
      throw new Error('Cloned deck or cloned exam missing in student private space');
    }
    console.log('✅ Student Private Space verified: Cloned Deck & Exam duplicated cleanly into personal space');

    // Cleanup
    await Course.deleteMany({ _id: { $in: [course._id, createdDeck._id, studentClonedDeck._id] } });
    await Chapter.deleteMany({ courseId: course._id });
    await Lesson.deleteMany({ courseId: course._id });
    await Flashcard.deleteMany({ courseId: { $in: [createdDeck._id, studentClonedDeck._id] } });
    await Exam.deleteMany({ _id: { $in: [createdExam._id, studentClonedExam._id] } });
    await Question.deleteMany({ examId: { $in: [createdExam._id, studentClonedExam._id] } });
    await ExamResult.deleteMany({ userId: testStudentId });

    console.log('\n====================================================');
    console.log('🎉 ALL 6 PHASE 4 SYSTEM INTEGRATION TESTS PASSED 100%!');
    console.log('====================================================');
  } catch (err) {
    console.error('\n❌ PHASE 4 INTEGRATION TEST FAILED:', err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

runPhase4SystemIntegrationTests();
