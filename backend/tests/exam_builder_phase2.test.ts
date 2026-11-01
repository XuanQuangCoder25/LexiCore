import 'dotenv/config';
import mongoose from 'mongoose';
import Exam from '../database/models/Exam';
import Question from '../database/models/Question';
import ExamResult from '../database/models/ExamResult';
import {
  saveFullExam,
  getCreatorExamById,
  publishExam,
  unpublishExam,
  cloneExam,
  getPrivateSpaceContent
} from '../modules/creator/creator.controller';
import {
  getExamById,
  submitExam
} from '../modules/exam/exam.controller';

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

async function runPhase2Tests() {
  console.log('====================================================');
  console.log('🚀 RUNNING PHASE 2: EXAM BUILDER & BACKEND API TESTS');
  console.log('====================================================');

  await mongoose.connect(MONGODB_URI);
  console.log('✅ Connected to MongoDB');

  const testCreatorId = 'usr_exam_creator_' + Date.now();
  const testStudentId = 'usr_exam_student_' + Date.now();

  try {
    // ------------------------------------------------------------------------
    // TEST 1: Atomic Exam Creation & Saving (saveFullExam) with Academic Fields
    // ------------------------------------------------------------------------
    console.log('\n--- TEST 1: Atomic saveFullExam with Multi-skill Foreign Language Config ---');
    const mockSaveFull = createMockReqRes({
      user: { id: testCreatorId, role: 'content_creator', creator_status: 'ACTIVE' },
      body: {
        title: 'IELTS Academic Placement Test B2',
        description: 'Comprehensive test for listening, reading, and grammar',
        thumbnail: 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d',
        durationMinutes: 45,
        passingScore: 75,
        level: 'B2',
        shuffleQuestions: true,
        skills: ['Listening', 'Reading', 'Grammar'],
        status: 'Draft',
        questions: [
          {
            type: 'MultipleChoice',
            content: {
              text: 'Choose the correct option: She ______ English for 5 years before moving to London.',
              options: ['had studied', 'has studied', 'studies', 'was studying']
            },
            answerData: { correctOption: 'had studied' },
            explanation: 'Past perfect is used for an action completed before another past action.'
          },
          {
            type: 'Audio',
            content: {
              mediaUrl: 'https://example.com/audio/listening_section1.mp3',
              transcript: 'Host: Welcome to the language lab. Today we discuss space exploration.',
              subQuestions: [
                {
                  id: 'sq_audio_1',
                  text: 'What is the topic of the conversation?',
                  options: ['Space exploration', 'Ocean depths', 'Ancient history'],
                  explanation: 'The host mentions space exploration at the start.'
                }
              ]
            },
            answerData: {
              mapping: {
                sq_audio_1: 'Space exploration'
              }
            },
            explanation: 'Audio listening comprehension on space research.'
          },
          {
            type: 'Reading',
            content: {
              title: 'The Great Barrier Reef',
              passage: 'The Great Barrier Reef is the world largest coral reef system, located in Australia.',
              subQuestions: [
                {
                  id: 'sq_read_1',
                  text: 'Where is the Great Barrier Reef located?',
                  options: ['Australia', 'Brazil', 'Japan'],
                  explanation: 'The passage explicitly states it is located in Australia.'
                }
              ]
            },
            answerData: {
              mapping: {
                sq_read_1: 'Australia'
              }
            },
            explanation: 'Reading passage detail retrieval.'
          }
        ]
      }
    });

    await saveFullExam(mockSaveFull.req, mockSaveFull.res);
    if (mockSaveFull.getStatusCode() !== 200 || !mockSaveFull.getData().success) {
      throw new Error(`Failed Test 1: saveFullExam returned ${mockSaveFull.getStatusCode()}: ${JSON.stringify(mockSaveFull.getData())}`);
    }

    const createdExam = mockSaveFull.getData().data.exam;
    const createdExamId = createdExam._id.toString();

    // Verify DB records
    const dbExam = await Exam.findById(createdExamId);
    if (!dbExam) throw new Error('Exam not found in database');
    if (dbExam.durationMinutes !== 45 || dbExam.passingScore !== 75 || dbExam.level !== 'B2' || !dbExam.shuffleQuestions) {
      throw new Error('Exam academic config fields mismatch in DB');
    }
    if (dbExam.totalQuestions !== 3) {
      throw new Error(`Expected 3 totalQuestions, got ${dbExam.totalQuestions}`);
    }

    const dbQuestions = await Question.find({ examId: dbExam._id }).sort({ order: 1 });
    if (dbQuestions.length !== 3) {
      throw new Error(`Expected 3 questions in DB, got ${dbQuestions.length}`);
    }
    if (dbQuestions[0].explanation !== 'Past perfect is used for an action completed before another past action.') {
      throw new Error('Question 0 explanation mismatch');
    }
    if (dbQuestions[2].type !== 'Reading' || !dbQuestions[2].content?.passage) {
      throw new Error('Reading question type or passage not saved properly');
    }

    console.log('✅ TEST 1 PASSED: saveFullExam saved exam + 3 multi-skill questions with explanations & config');

    // ------------------------------------------------------------------------
    // TEST 2: RBAC Publishing Protection
    // ------------------------------------------------------------------------
    console.log('\n--- TEST 2: RBAC Protection on Publish ---');
    // Normal user attempts to publish
    const mockUserPublish = createMockReqRes({
      user: { id: testCreatorId, role: 'user' },
      params: { id: createdExamId }
    });
    await publishExam(mockUserPublish.req, mockUserPublish.res);
    if (mockUserPublish.getStatusCode() !== 403 || !mockUserPublish.getData().requires_creator) {
      throw new Error('Expected 403 with requires_creator for normal user publish');
    }
    console.log('✅ TEST 2.1 PASSED: Normal user blocked from publishing (403 requires_creator: true)');

    // Attempting to publish exam with 0 questions
    const emptyExam = new Exam({
      title: 'Empty Exam',
      createdBy: testCreatorId,
      status: 'Draft',
      totalQuestions: 0
    });
    await emptyExam.save();

    const mockEmptyPublish = createMockReqRes({
      user: { id: testCreatorId, role: 'content_creator', creator_status: 'ACTIVE' },
      params: { id: emptyExam._id.toString() }
    });
    await publishExam(mockEmptyPublish.req, mockEmptyPublish.res);
    if (mockEmptyPublish.getStatusCode() !== 400) {
      throw new Error('Expected 400 when publishing exam with 0 questions');
    }
    console.log('✅ TEST 2.2 PASSED: Blocked publish for 0 questions (400 validation error)');

    // ------------------------------------------------------------------------
    // TEST 3: Content Creator Publishes Exam (publishExam)
    // ------------------------------------------------------------------------
    console.log('\n--- TEST 3: Content Creator Successfully Publishes Exam ---');
    const mockCreatorPublish = createMockReqRes({
      user: { id: testCreatorId, role: 'content_creator', creator_status: 'ACTIVE' },
      params: { id: createdExamId }
    });
    await publishExam(mockCreatorPublish.req, mockCreatorPublish.res);
    if (mockCreatorPublish.getStatusCode() !== 200 || !mockCreatorPublish.getData().success) {
      throw new Error('Creator publish failed');
    }
    const publishedDb = await Exam.findById(createdExamId);
    if (publishedDb?.status !== 'Published') {
      throw new Error('Exam status not updated to Published');
    }
    console.log('✅ TEST 3 PASSED: Exam published successfully (status = Published)');

    // ------------------------------------------------------------------------
    // TEST 4: Student Exam Fetch (getExamById) Security & Sanitization
    // ------------------------------------------------------------------------
    console.log('\n--- TEST 4: Student Exam Fetch (getExamById) Sanitization ---');
    const mockGetExam = createMockReqRes({
      user: { id: testStudentId, role: 'user' },
      params: { id: createdExamId }
    });
    await getExamById(mockGetExam.req, mockGetExam.res);
    if (mockGetExam.getStatusCode() !== 200) {
      throw new Error('Failed to get exam by ID');
    }

    const fetchedExam = mockGetExam.getData().data;
    if (fetchedExam.durationMinutes !== 45 || fetchedExam.passingScore !== 75 || fetchedExam.level !== 'B2') {
      throw new Error('Academic config missing in fetched exam');
    }

    // Verify sanitization
    for (const q of fetchedExam.questions) {
      if (q.answerData !== undefined) {
        throw new Error(`SECURITY LEAK: answerData found in sanitized question ${q._id}`);
      }
      if (q.explanation !== undefined) {
        throw new Error(`SECURITY LEAK: explanation found in sanitized question ${q._id}`);
      }
      if (q.content?.subQuestions) {
        for (const sq of q.content.subQuestions) {
          if (sq.explanation !== undefined) {
            throw new Error(`SECURITY LEAK: subQuestion explanation leaked in ${sq.id}`);
          }
          if (sq.correctOption !== undefined) {
            throw new Error(`SECURITY LEAK: subQuestion correctOption leaked in ${sq.id}`);
          }
        }
      }
    }
    console.log('✅ TEST 4 PASSED: Student received sanitized exam with zero answer/explanation leaks');

    // ------------------------------------------------------------------------
    // TEST 5: Student Submission & Auto-grading (submitExam)
    // ------------------------------------------------------------------------
    console.log('\n--- TEST 5: Student Submission, Grading & Reviews (submitExam) ---');
    // Map question answers
    const answersPayload: Record<string, any> = {};
    for (const q of dbQuestions) {
      const qId = q._id.toString();
      if (q.type === 'MultipleChoice') {
        answersPayload[qId] = 'had studied'; // Correct
      } else if (q.type === 'Audio') {
        answersPayload[qId] = { sq_audio_1: 'Space exploration' }; // Correct
      } else if (q.type === 'Reading') {
        answersPayload[qId] = { sq_read_1: 'Australia' }; // Correct
      }
    }

    const mockSubmit = createMockReqRes({
      user: { id: testStudentId, role: 'user' },
      params: { id: createdExamId },
      body: {
        answers: answersPayload,
        durationSpentSeconds: 420
      }
    });

    await submitExam(mockSubmit.req, mockSubmit.res);
    if (mockSubmit.getStatusCode() !== 200) {
      throw new Error(`Failed submitExam: ${JSON.stringify(mockSubmit.getData())}`);
    }

    const submitResult = mockSubmit.getData().data;
    if (submitResult.score !== 100 || !submitResult.passed) {
      throw new Error(`Expected 100% score and passed=true, got score=${submitResult.score}, passed=${submitResult.passed}`);
    }
    if (submitResult.durationSpentSeconds !== 420) {
      throw new Error(`Expected durationSpentSeconds=420, got ${submitResult.durationSpentSeconds}`);
    }

    // Verify detailed questionReviews
    const reviews = submitResult.questionReviews;
    if (!Array.isArray(reviews) || reviews.length !== 3) {
      throw new Error(`Expected 3 question reviews, got ${reviews?.length}`);
    }
    if (!reviews[0].isCorrect || !reviews[0].explanation) {
      throw new Error('Review 0 missing explanation or correctness');
    }
    if (reviews[1].type !== 'Audio' || !reviews[1].subQuestionReviews || reviews[1].subQuestionReviews.length !== 1) {
      throw new Error('Audio subQuestionReviews missing');
    }
    if (reviews[2].type !== 'Reading' || !reviews[2].content?.passage) {
      throw new Error('Reading passage missing in review');
    }

    // Verify DB ExamResult
    const dbResult = await ExamResult.findOne({ userId: testStudentId, examId: createdExamId });
    if (!dbResult || dbResult.score !== 100 || !dbResult.passed || dbResult.durationSpentSeconds !== 420) {
      throw new Error('ExamResult document in DB has invalid fields');
    }

    console.log('✅ TEST 5 PASSED: 100% grade, passed=true, ExamResult updated, and detailed questionReviews returned');

    // ------------------------------------------------------------------------
    // TEST 6: Private Space Integration (getPrivateSpaceContent)
    // ------------------------------------------------------------------------
    console.log('\n--- TEST 6: Private Space Content Verification ---');
    const mockPrivateSpace = createMockReqRes({
      user: { id: testCreatorId, role: 'content_creator' }
    });
    await getPrivateSpaceContent(mockPrivateSpace.req, mockPrivateSpace.res);
    if (mockPrivateSpace.getStatusCode() !== 200) {
      throw new Error('getPrivateSpaceContent failed');
    }

    const spaceData = mockPrivateSpace.getData().data;
    const foundExamInSpace = spaceData.exams.find((e: any) => e._id.toString() === createdExamId);
    if (!foundExamInSpace) {
      throw new Error('Created exam not found in creator Private Space');
    }
    if (foundExamInSpace.durationMinutes !== 45 || foundExamInSpace.passingScore !== 75) {
      throw new Error('Private space exam missing academic fields');
    }
    console.log('✅ TEST 6 PASSED: Exam appears in Private Space with complete configuration');

    // ------------------------------------------------------------------------
    // TEST 7: Direct Exam Cloning (cloneExam)
    // ------------------------------------------------------------------------
    console.log('\n--- TEST 7: Direct Exam Cloning to Student Private Space ---');
    const mockClone = createMockReqRes({
      user: { id: testStudentId, role: 'user' },
      params: { id: createdExamId }
    });
    await cloneExam(mockClone.req, mockClone.res);
    if (mockClone.getStatusCode() !== 201) {
      throw new Error('cloneExam failed');
    }

    const clonedExamData = mockClone.getData().data;
    if (!clonedExamData.title.includes('(Bản sao)') || clonedExamData.createdBy !== testStudentId) {
      throw new Error('Cloned exam metadata mismatch');
    }

    const clonedQuestions = await Question.find({ examId: clonedExamData._id });
    if (clonedQuestions.length !== 3) {
      throw new Error(`Expected 3 cloned questions, got ${clonedQuestions.length}`);
    }
    console.log('✅ TEST 7 PASSED: Exam duplicated cleanly into student Private Space with 3 questions');

    // Cleanup
    await Exam.deleteMany({ createdBy: { $in: [testCreatorId, testStudentId] } });
    await Question.deleteMany({ examId: { $in: [createdExamId, emptyExam._id, clonedExamData._id] } });
    await ExamResult.deleteMany({ userId: { $in: [testCreatorId, testStudentId] } });

    console.log('\n====================================================');
    console.log('🎉 ALL 7 PHASE 2 EXAM BUILDER BACKEND TESTS PASSED 100%!');
    console.log('====================================================');
  } catch (err) {
    console.error('\n❌ PHASE 2 TEST FAILED:', err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

runPhase2Tests();
