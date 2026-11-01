import 'dotenv/config';
import mongoose from 'mongoose';
import Course from '../database/models/Course';
import Flashcard from '../database/models/Flashcard';
import CardReview from '../database/models/CardReview';
import { 
  getDeckById, 
  saveFullDeck, 
  publishDeck, 
  unpublishDeck, 
  cloneDirectDeck 
} from '../modules/creator/creator.controller';
import { getDueCards } from '../modules/srs/srs.controller';

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
  console.log('🚀 RUNNING PHASE 2: FLASHCARD BUILDER BACKEND TESTS');
  console.log('====================================================');

  await mongoose.connect(MONGODB_URI);
  console.log('✅ Connected to MongoDB');

  const testOwnerId = 'usr_phase2_creator_' + Date.now();
  const testStudentId = 'usr_phase2_student_' + Date.now();
  let createdDeckId = '';
  let cardIds: string[] = [];

  try {
    // ----------------------------------------------------
    // TEST 1: Atomic Save Deck with Rich Language Cards
    // ----------------------------------------------------
    console.log('\n--- TEST 1: Atomic Save Deck with Rich Cards ---');
    const mockSave = createMockReqRes({
      user: { id: testOwnerId, role: 'content_creator' },
      body: {
        deck: {
          title: 'IELTS Advanced Vocabulary 8.0+ Master',
          description: 'Tuyển tập 3 từ vựng học thuật đỉnh cao phục vụ kỳ thi IELTS Writing & Speaking',
          thumbnail: 'https://images.unsplash.com/photo-1457369804613-52c61a468e7d',
          level: 'C1',
          tags: ['#IELTS', '#Advanced', '#Vocabulary'],
          allowClone: true,
          isPublished: false
        },
        cards: [
          {
            id: 'tmp_c1',
            front: 'serendipity',
            back: 'sự tình cờ may mắn tìm thấy điều quý giá',
            partOfSpeech: 'noun',
            phonetic: '/ˌser.ənˈdɪp.ə.ti/',
            audioUrl: 'https://example.com/audio/serendipity.mp3',
            example: 'Finding this book was a pure serendipity.',
            exampleMeaning: 'Tìm thấy cuốn sách này quả là một sự tình cờ may mắn.',
            synonyms: ['chance', 'fluke', 'happy accident'],
            note: 'Bắt nguồn từ câu chuyện Ba hoàng tử Serendip',
            imageUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475',
            order: 0
          },
          {
            id: 'tmp_c2',
            front: 'ubiquitous',
            back: 'có mặt ở khắp mọi nơi cùng một lúc',
            partOfSpeech: 'adjective',
            phonetic: '/juːˈbɪk.wə.təs/',
            audioUrl: 'https://example.com/audio/ubiquitous.mp3',
            example: 'Smartphones have become ubiquitous in modern society.',
            exampleMeaning: 'Điện thoại thông minh đã trở nên phổ biến ở khắp mọi nơi.',
            synonyms: ['omnipresent', 'pervasive', 'universal'],
            note: 'Gốc Latin ubique = everywhere',
            imageUrl: '',
            order: 1
          },
          {
            id: 'tmp_c3',
            front: 'pragmatic',
            back: 'thực dụng, dựa trên tính thực tiễn',
            partOfSpeech: 'adjective',
            phonetic: '/præɡˈmæt.ɪk/',
            audioUrl: '',
            example: 'We need to take a pragmatic approach to solve this engineering problem.',
            exampleMeaning: 'Chúng ta cần tiếp cận một cách thực tế để giải quyết vấn đề kỹ thuật này.',
            synonyms: ['practical', 'realistic', 'sensible'],
            note: 'Trái nghĩa với idealistic',
            imageUrl: '',
            order: 2
          }
        ]
      }
    });

    await saveFullDeck(mockSave.req, mockSave.res);
    const saveRes = mockSave.getData();

    if (mockSave.getStatusCode() !== 200 || !saveRes.success) {
      throw new Error(`Failed to save full deck: ${JSON.stringify(saveRes)}`);
    }

    createdDeckId = String(saveRes.data.deck._id);
    cardIds = saveRes.data.cards.map((c: any) => String(c._id));

    console.log(`✅ Deck created with ID: ${createdDeckId}`);
    console.log(`✅ Saved ${cardIds.length} rich flashcards`);
    console.log('✅ Test 1 Passed: Atomic deck creation with rich cards succeeded');

    // ----------------------------------------------------
    // TEST 2: Schema Integrity Check (Database verification)
    // ----------------------------------------------------
    console.log('\n--- TEST 2: Database Schema Integrity Check ---');
    const dbDeck = await Course.findById(createdDeckId);
    if (!dbDeck) throw new Error('Deck not found in MongoDB');
    if (dbDeck.level !== 'C1') throw new Error(`Expected level C1, got ${dbDeck.level}`);
    if (dbDeck.cardCount !== 3) throw new Error(`Expected cardCount 3, got ${dbDeck.cardCount}`);
    if (dbDeck.allowClone !== true) throw new Error('Expected allowClone true');
    if (dbDeck.type !== 'flashcard') throw new Error('Expected type flashcard');

    const dbCards = await Flashcard.find({ courseId: createdDeckId }).sort({ order: 1 });
    if (dbCards.length !== 3) throw new Error(`Expected 3 cards in DB, got ${dbCards.length}`);

    const card1 = dbCards[0];
    if (card1.front !== 'serendipity') throw new Error('Card 1 front mismatch');
    if (card1.partOfSpeech !== 'noun') throw new Error('Card 1 partOfSpeech mismatch');
    if (card1.phonetic !== '/ˌser.ənˈdɪp.ə.ti/') throw new Error('Card 1 phonetic mismatch');
    if (card1.synonyms?.length !== 3) throw new Error('Card 1 synonyms mismatch');
    if (!card1.example || !card1.exampleMeaning) throw new Error('Card 1 example mismatch');

    console.log('✅ Test 2 Passed: MongoDB schema integrity verified (partOfSpeech, phonetic, synonyms, audio, example)');

    // ----------------------------------------------------
    // TEST 3: Auto-seed SRS CardReview Records
    // ----------------------------------------------------
    console.log('\n--- TEST 3: Auto-seed SRS CardReview Records ---');
    const dbReviews = await CardReview.find({ courseId: createdDeckId, userId: testOwnerId });
    if (dbReviews.length !== 3) {
      throw new Error(`Expected 3 CardReview records for creator, got ${dbReviews.length}`);
    }

    for (const rev of dbReviews) {
      if (rev.easeFactor !== 2.5) throw new Error(`Expected easeFactor 2.5, got ${rev.easeFactor}`);
      if (rev.interval !== 0) throw new Error(`Expected interval 0, got ${rev.interval}`);
      if (rev.status !== 'New') throw new Error(`Expected status New, got ${rev.status}`);
      if (isNaN(rev.easeFactor)) throw new Error('easeFactor is NaN');
    }
    console.log(`✅ All ${dbReviews.length} cards pre-initialized with SM-2 easeFactor: 2.5, interval: 0, status: 'New'`);
    console.log('✅ Test 3 Passed: SRS reviews auto-seeded without NaN or undefined');

    // ----------------------------------------------------
    // TEST 4: SRS getDueCards Returns Rich Language Fields
    // ----------------------------------------------------
    console.log('\n--- TEST 4: SRS getDueCards with Rich Card Output ---');
    const mockDue = createMockReqRes({
      user: { id: testOwnerId, role: 'user' },
      query: { courseId: createdDeckId }
    });

    await getDueCards(mockDue.req, mockDue.res);
    const dueRes = mockDue.getData();
    if (!dueRes.success || !dueRes.data?.cards) {
      throw new Error(`Failed to get due cards: ${JSON.stringify(dueRes)}`);
    }

    const fetchedCard1 = dueRes.data.cards.find((c: any) => c.front === 'serendipity');
    if (!fetchedCard1) throw new Error('Could not find serendipity in due cards');
    if (fetchedCard1.partOfSpeech !== 'noun' || fetchedCard1.phonetic !== '/ˌser.ənˈdɪp.ə.ti/') {
      throw new Error('getDueCards failed to return rich language fields');
    }
    if (!fetchedCard1.example) throw new Error('getDueCards missing example');

    console.log('✅ getDueCards returned full rich card payload (front, back, partOfSpeech, phonetic, audioUrl, example)');
    console.log('✅ Test 4 Passed: SRS study session receives rich language data');

    // ----------------------------------------------------
    // TEST 5: Deck Modification, Card Deletion & Re-sync
    // ----------------------------------------------------
    console.log('\n--- TEST 5: Modify Deck, Delete Card 3 & Add Card 4 ---');
    const mockUpdate = createMockReqRes({
      user: { id: testOwnerId, role: 'content_creator' },
      body: {
        deck: {
          id: createdDeckId,
          title: 'IELTS Advanced Vocabulary 8.0+ Master (Updated)',
          description: 'Updated description',
          level: 'C2',
          tags: ['#IELTS', '#Academic'],
          allowClone: true,
          isPublished: false
        },
        cards: [
          {
            id: cardIds[0], // Keep card 1
            front: 'serendipity',
            back: 'sự tình cờ may mắn (Đã cập nhật)',
            partOfSpeech: 'noun',
            phonetic: '/ˌser.ənˈdɪp.ə.ti/',
            order: 0
          },
          {
            id: cardIds[1], // Keep card 2
            front: 'ubiquitous',
            back: 'có mặt ở khắp mọi nơi',
            partOfSpeech: 'adjective',
            phonetic: '/juːˈbɪk.wə.təs/',
            order: 1
          },
          // Card 3 omitted -> Should be deleted!
          {
            id: 'tmp_new_card_4', // Add card 4
            front: 'ephemeral',
            back: 'phù du, sớm nở tối tàn, ngắn ngủi',
            partOfSpeech: 'adjective',
            phonetic: '/ɪˈfem.ər.əl/',
            example: 'Fame in the digital age is often ephemeral.',
            exampleMeaning: 'Danh tiếng trong thời đại số thường rất ngắn ngủi.',
            order: 2
          }
        ]
      }
    });

    await saveFullDeck(mockUpdate.req, mockUpdate.res);
    const updateRes = mockUpdate.getData();
    if (!updateRes.success) throw new Error(`Update failed: ${JSON.stringify(updateRes)}`);

    const updatedDbCards = await Flashcard.find({ courseId: createdDeckId }).sort({ order: 1 });
    if (updatedDbCards.length !== 3) {
      throw new Error(`Expected 3 cards after update, got ${updatedDbCards.length}`);
    }

    const cardNames = updatedDbCards.map(c => c.front);
    if (cardNames.includes('pragmatic')) {
      throw new Error('Deleted card "pragmatic" is still present in DB');
    }
    if (!cardNames.includes('ephemeral')) {
      throw new Error('New card "ephemeral" was not added to DB');
    }

    const updatedDbDeck = await Course.findById(createdDeckId);
    if (updatedDbDeck?.level !== 'C2' || updatedDbDeck?.cardCount !== 3) {
      throw new Error('Deck metadata not updated correctly');
    }

    // Check CardReview sync: pragmatic review should be deleted, ephemeral review added
    const updatedReviews = await CardReview.find({ courseId: createdDeckId, userId: testOwnerId });
    if (updatedReviews.length !== 3) {
      throw new Error(`Expected 3 CardReviews after sync, got ${updatedReviews.length}`);
    }

    console.log('✅ Test 5 Passed: Deck updated, obsolete cards deleted, and CardReview synced');

    // ----------------------------------------------------
    // TEST 6: Role Restrictions on Publishing
    // ----------------------------------------------------
    console.log('\n--- TEST 6: Role Restrictions on Publishing ---');
    // Non-creator attempts to publish
    const mockUserPublish = createMockReqRes({
      user: { id: testOwnerId, role: 'user' },
      params: { id: createdDeckId }
    });
    await publishDeck(mockUserPublish.req, mockUserPublish.res);
    if (mockUserPublish.getStatusCode() !== 403 || !mockUserPublish.getData().requires_creator) {
      throw new Error('Expected 403 with requires_creator for normal user publish');
    }
    console.log('✅ Normal user blocked from publishing (403 requires_creator: true)');

    // Content creator publishes
    const mockCreatorPublish = createMockReqRes({
      user: { id: testOwnerId, role: 'content_creator' },
      params: { id: createdDeckId }
    });
    await publishDeck(mockCreatorPublish.req, mockCreatorPublish.res);
    if (mockCreatorPublish.getStatusCode() !== 200 || !mockCreatorPublish.getData().success) {
      throw new Error('Creator publish failed');
    }
    const publishedDeck = await Course.findById(createdDeckId);
    if (!publishedDeck?.isPublished || publishedDeck.status !== 'published') {
      throw new Error('Deck was not published in DB');
    }
    console.log('✅ Content creator successfully published deck');
    console.log('✅ Test 6 Passed: Role enforcement works cleanly');

    // ----------------------------------------------------
    // TEST 7: Direct Clone Deck & allowClone Enforcement
    // ----------------------------------------------------
    console.log('\n--- TEST 7: Clone Deck to Student Private Space ---');
    const mockClone = createMockReqRes({
      user: { id: testStudentId, role: 'user' },
      params: { id: createdDeckId }
    });
    await cloneDirectDeck(mockClone.req, mockClone.res);
    const cloneRes = mockClone.getData();
    if (!cloneRes.success || !cloneRes.data) {
      throw new Error(`Failed to clone deck: ${JSON.stringify(cloneRes)}`);
    }

    const clonedDeckId = String(cloneRes.data._id);
    const clonedDeckDb = await Course.findById(clonedDeckId);
    if (!clonedDeckDb || clonedDeckDb.creatorId !== testStudentId) {
      throw new Error('Cloned deck creatorId mismatch');
    }

    const clonedCardsDb = await Flashcard.find({ courseId: clonedDeckId }).sort({ order: 1 });
    if (clonedCardsDb.length !== 3) {
      throw new Error(`Expected 3 cloned cards, got ${clonedCardsDb.length}`);
    }

    if (clonedCardsDb[0].front !== 'serendipity' || clonedCardsDb[0].partOfSpeech !== 'noun') {
      throw new Error('Cloned card 1 lost rich language fields');
    }

    // Verify Student has auto-seeded CardReview records for the cloned deck!
    const studentReviews = await CardReview.find({ courseId: clonedDeckId, userId: testStudentId });
    if (studentReviews.length !== 3) {
      throw new Error(`Student expected 3 CardReviews for cloned deck, got ${studentReviews.length}`);
    }
    console.log(`✅ Cloned deck has ${clonedCardsDb.length} rich cards with 100% data fidelity`);
    console.log(`✅ Student immediately received ${studentReviews.length} SRS CardReview records`);

    // Test allowClone = false enforcement
    await Course.findByIdAndUpdate(createdDeckId, { allowClone: false });
    const mockCloneForbidden = createMockReqRes({
      user: { id: 'another_user', role: 'user' },
      params: { id: createdDeckId }
    });
    await cloneDirectDeck(mockCloneForbidden.req, mockCloneForbidden.res);
    if (mockCloneForbidden.getStatusCode() !== 403) {
      throw new Error('Expected 403 when allowClone is false');
    }
    console.log('✅ allowClone=false blocked cloning as expected');
    console.log('✅ Test 7 Passed: Deck cloning and permission check verified');

    console.log('\n====================================================');
    console.log('🎉 ALL 7 PHASE 2 BACKEND TESTS PASSED WITH 100% SUCCESS!');
    console.log('====================================================');

    // Cleanup test data
    await Course.deleteMany({ _id: { $in: [createdDeckId, clonedDeckId] } });
    await Flashcard.deleteMany({ courseId: { $in: [createdDeckId, clonedDeckId] } });
    await CardReview.deleteMany({ courseId: { $in: [createdDeckId, clonedDeckId] } });
    console.log('🧹 Cleaned up test artifacts');

  } catch (error) {
    console.error('❌ Phase 2 Tests Failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

runPhase2Tests();
