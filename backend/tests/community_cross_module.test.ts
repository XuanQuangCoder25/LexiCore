import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import {
  createCommunityTestApp,
  seedCommunityTestUsers,
  cleanupCommunityTestData,
  TEST_USERS,
  TOKENS,
} from './community-test-helper';
import CommunityPost from '../database/models/CommunityPost';
import CommunityComment from '../database/models/CommunityComment';
import Course from '../database/models/Course';
import Flashcard from '../database/models/Flashcard';
import { pool } from '../config/mysql';

const app = createCommunityTestApp();

describe('=== KIỂM THỬ TỰ ĐỘNG: COMMUNITY MODULE - PHASE 2 (CROSS-MODULE ECOSYSTEM) ===', { timeout: 60000 }, () => {
  let creatorDeckId = '';
  let sharedPostId = '';
  let clonedDeckId = '';
  let milestoneCourseId = '';
  const testCourseIds: any[] = [];

  before(async () => {
    console.log('\n[SETUP] Khởi tạo môi trường test & Seed Data cho Hệ sinh thái...');
    await seedCommunityTestUsers();

    // 1. Tạo trước 1 bộ Flashcard Deck thuộc sở hữu của Creator trong Private Space
    const deck = await Course.create({
      title: '3000 Từ vựng IELTS Nâng cao C1/C2',
      description: 'Bộ từ vựng học thuật tuyển chọn cho band 7.5+',
      creatorId: TEST_USERS.CREATOR.id,
      type: 'flashcard',
      level: 'C1 Advanced',
      tags: ['ielts', 'academic', 'c1'],
      price: 0,
    });
    creatorDeckId = deck._id.toString();
    testCourseIds.push(deck._id);

    // 2. Tạo 3 thẻ flashcards mẫu cho bộ deck
    const cards = await Flashcard.insertMany([
      { courseId: deck._id, front: 'ubiquitous', back: 'có mặt ở khắp nơi, phổ biến', order: 1 },
      { courseId: deck._id, front: 'ephemeral', back: 'phù du, chóng tàn, ngắn ngủi', order: 2 },
      { courseId: deck._id, front: 'pragmatic', back: 'thực dụng, thực tế', order: 3 },
    ]);

    // 3. Tạo 1 Course thông thường để test Course Milestone
    const course = await Course.create({
      title: 'Khóa học Chinh phục IELTS Writing Task 2 Masterclass',
      description: 'Giáo trình toàn diện viết luận IELTS từ A-Z',
      creatorId: TEST_USERS.CREATOR.id,
      type: 'course',
      level: 'All Levels',
    });
    milestoneCourseId = course._id.toString();
    testCourseIds.push(course._id);
  });

  after(async () => {
    console.log('\n[TEARDOWN] Dọn dẹp sạch toàn bộ dữ liệu test hệ sinh thái...');
    await cleanupCommunityTestData();

    // Dọn dẹp Course và Flashcard được tạo trong quá trình test
    try {
      const allDeckIds = [...testCourseIds];
      if (clonedDeckId) allDeckIds.push(clonedDeckId);

      await Flashcard.deleteMany({ courseId: { $in: allDeckIds } });
      await Course.deleteMany({ _id: { $in: allDeckIds } });
      await Course.deleteMany({
        creatorId: { $in: [TEST_USERS.CREATOR.id, TEST_USERS.USER_A.id, TEST_USERS.USER_B.id] },
      });
    } catch (err) {
      console.error('[TEARDOWN] Lỗi dọn Course/Flashcard:', err);
    }

    setTimeout(() => process.exit(0), 100);
  });

  // =========================================================================
  // 1. TÍCH HỢP PRIVATE SPACE: CHIA SẺ & CLONE BỘ FLASHCARD
  // =========================================================================
  describe('1. Tích hợp Private Space (Chia sẻ & Clone bộ Flashcard)', () => {
    it('1.1. Creator chia sẻ bộ Flashcard từ Private Space lên Community -> Tạo bài viết shared_flashcard (201)', async () => {
      const res = await request(app)
        .post('/api/community/share-deck')
        .set('Authorization', `Bearer ${TOKENS.CREATOR}`)
        .send({
          deckId: creatorDeckId,
          topic: 'vocabulary',
          caption: 'Mình vừa tổng hợp bộ từ vựng C1 này, chia sẻ cho các bạn luyện thi nhé!',
        });

      assert.equal(res.status, 201, `Kỳ vọng 201: ${JSON.stringify(res.body)}`);
      assert.equal(res.body.status, 'success');
      assert.equal(res.body.data.type, 'shared_flashcard');
      assert.equal(res.body.data.topic, 'vocabulary');
      assert.equal(res.body.data.referenceId, creatorDeckId);

      // Kiểm tra referenceMeta được trích xuất tự động từ bộ deck gốc
      assert.ok(res.body.data.referenceMeta, 'Phải có referenceMeta');
      assert.equal(res.body.data.referenceMeta.title, '3000 Từ vựng IELTS Nâng cao C1/C2');
      assert.equal(res.body.data.referenceMeta.cardCount, 3, 'Phải đếm đúng 3 thẻ');
      assert.equal(res.body.data.referenceMeta.sampleCards.length, 3, 'Phải có 3 thẻ mẫu xem thử');
      assert.equal(res.body.data.referenceMeta.sampleCards[0].front, 'ubiquitous');

      sharedPostId = res.body.data.id;
    });

    it('1.2. Bảo mật: User A cố chia sẻ bộ thẻ không thuộc sở hữu của mình -> Bị từ chối (403 Forbidden)', async () => {
      const res = await request(app)
        .post('/api/community/share-deck')
        .set('Authorization', `Bearer ${TOKENS.USER_A}`)
        .send({
          deckId: creatorDeckId, // Bộ thẻ của Creator, không phải của User A
          topic: 'vocabulary',
        });

      assert.equal(res.status, 403);
      assert.match(res.body.message, /thuộc quyền sở hữu của mình/);
    });

    it('1.3. User B xem bài viết và bấm "Clone Deck" về Private Space -> Nhân bản chính xác Course & Flashcards (200)', async () => {
      assert.ok(sharedPostId, 'Cần bài viết shared_flashcard hợp lệ');

      const res = await request(app)
        .post(`/api/community/posts/${sharedPostId}/clone-deck`)
        .set('Authorization', `Bearer ${TOKENS.USER_B}`);

      assert.equal(res.status, 200, `Kỳ vọng 200: ${JSON.stringify(res.body)}`);
      assert.equal(res.body.status, 'success');
      assert.ok(res.body.data.newDeckId, 'Phải trả về newDeckId');
      assert.equal(res.body.data.cardCount, 3, 'Phải sao chép đủ 3 thẻ');
      assert.match(res.body.data.title, /Bản sao/);
      assert.equal(res.body.data.clonesCount, 1, 'Số lượt clone trên bài viết phải là 1');

      clonedDeckId = res.body.data.newDeckId;

      // KIỂM TRA TRỰC TIẾP DATABASE:
      // 1. Kiểm tra Course mới được tạo cho User B
      const clonedCourse = await Course.findById(clonedDeckId);
      assert.ok(clonedCourse, 'Bộ thẻ nhân bản phải tồn tại trong MongoDB');
      assert.equal(clonedCourse.creatorId, TEST_USERS.USER_B.id, 'Chủ sở hữu mới phải là User B');
      assert.equal(clonedCourse.type, 'flashcard');

      // 2. Kiểm tra các Flashcard con được nhân bản sang newDeckId
      const clonedCards = await Flashcard.find({ courseId: clonedDeckId }).sort({ order: 1 });
      assert.equal(clonedCards.length, 3, 'Phải có đúng 3 flashcard mới thuộc clonedDeckId');
      assert.equal(clonedCards[0].front, 'ubiquitous');
      assert.equal(clonedCards[1].front, 'ephemeral');
      assert.equal(clonedCards[2].front, 'pragmatic');

      // 3. Kiểm tra bài viết gốc trên MongoDB tăng stats.clonesCount
      const postInDb = await CommunityPost.findById(sharedPostId);
      assert.equal(postInDb?.stats?.clonesCount, 1, 'stats.clonesCount trong MongoDB phải tăng lên 1');
    });

    it('1.4. Clone trên bài viết không phải shared_flashcard -> Bị từ chối (400 Bad Request)', async () => {
      // Tạo một bài discussion thông thường
      const discPost = await CommunityPost.create({
        authorId: TEST_USERS.USER_A.id,
        authorRole: 'USER',
        type: 'discussion',
        topic: 'general',
        title: 'Bài viết thảo luận bình thường không có Flashcard',
        content: 'Nội dung thảo luận thông thường để kiểm tra lỗi clone.',
      });

      const res = await request(app)
        .post(`/api/community/posts/${discPost._id}/clone-deck`)
        .set('Authorization', `Bearer ${TOKENS.USER_B}`);

      assert.equal(res.status, 400);
      assert.match(res.body.message, /không phải là bộ thẻ Flashcard/);

      await CommunityPost.deleteOne({ _id: discPost._id });
    });
  });

  // =========================================================================
  // 2. TÍCH HỢP KHÓA HỌC: VINH DANH HOÀN THÀNH (COURSE MILESTONE)
  // =========================================================================
  describe('2. Tích hợp Khóa học (Course Milestone Celebration)', () => {
    it('2.1. User A hoàn thành khóa học và chia sẻ vinh danh -> Tạo bài course_milestone (201)', async () => {
      const res = await request(app)
        .post('/api/community/milestone')
        .set('Authorization', `Bearer ${TOKENS.USER_A}`)
        .send({
          courseId: milestoneCourseId,
          caption: 'Sau 3 tuần kiên trì, mình đã hoàn thành 100% khóa học Writing này! Cảm ơn thầy cô LexiCore rất nhiều!',
        });

      assert.equal(res.status, 201, `Kỳ vọng 201: ${JSON.stringify(res.body)}`);
      assert.equal(res.body.status, 'success');
      assert.equal(res.body.data.type, 'course_milestone');
      assert.equal(res.body.data.referenceId, milestoneCourseId);
      assert.equal(
        res.body.data.referenceMeta?.title,
        'Khóa học Chinh phục IELTS Writing Task 2 Masterclass'
      );
      assert.ok(res.body.data.tags.includes('milestone'), 'Phải tự động gắn tag milestone');
      assert.ok(res.body.data.tags.includes('graduation'), 'Phải tự động gắn tag graduation');
    });

    it('2.2. Chia sẻ thành tích với courseId không tồn tại -> Bị từ chối (404 Not Found)', async () => {
      const nonExistentId = '654321654321654321654321';
      const res = await request(app)
        .post('/api/community/milestone')
        .set('Authorization', `Bearer ${TOKENS.USER_A}`)
        .send({ courseId: nonExistentId });

      assert.equal(res.status, 404);
      assert.match(res.body.message, /Khóa học không tồn tại/);
    });
  });

  // =========================================================================
  // 3. HỆ THỐNG KINH TẾ & TÍNH ĐIỂM (BEST ANSWER WALLET REWARD)
  // =========================================================================
  describe('3. Hệ thống Kinh tế & Tính điểm (Best Answer Coin & Exp Accrual)', () => {
    let questionPostId = '';
    let goodAnswerCommentId = '';
    let initialUserBCoins = 0;
    let initialUserBExp = 0;

    it('3.1. Ghi nhận số dư ví ban đầu của User B trong MySQL', async () => {
      const [rows] = await pool.query(
        'SELECT coin_balance, exp FROM wallets WHERE user_id = ?',
        [TEST_USERS.USER_B.id]
      );
      const wallet = (rows as any[])[0];
      assert.ok(wallet, 'User B phải có ví trong MySQL');
      initialUserBCoins = Number(wallet.coin_balance);
      initialUserBExp = Number(wallet.exp);
    });

    it('3.2. User A đăng câu hỏi bài tập và User B vào giải đáp', async () => {
      // 1. User A tạo câu hỏi
      const post = await CommunityPost.create({
        authorId: TEST_USERS.USER_A.id,
        authorRole: 'USER',
        type: 'discussion',
        topic: 'homework',
        title: 'Hỏi bài tập: Phân biệt "affect" và "effect" trong ngữ cảnh kinh tế',
        content: 'Trong câu: "Inflation will seriously ... the consumer spending", nên điền từ nào?',
      });
      questionPostId = post._id.toString();

      // 2. User B gửi bình luận giải thích
      const comment = await CommunityComment.create({
        postId: post._id,
        authorId: TEST_USERS.USER_B.id,
        authorRole: 'USER',
        content: 'Chỗ này cần một động từ nên phải dùng "affect" bạn nhé! "Effect" thường là danh từ mang nghĩa tác động/hậu quả.',
      });
      goodAnswerCommentId = comment._id.toString();

      assert.ok(questionPostId);
      assert.ok(goodAnswerCommentId);
    });

    it('3.3. User A chọn bình luận của User B làm Best Answer -> Ví User B được cộng +10 Xu và +20 Exp', async () => {
      const res = await request(app)
        .post(`/api/community/posts/${questionPostId}/comments/${goodAnswerCommentId}/best-answer`)
        .set('Authorization', `Bearer ${TOKENS.USER_A}`);

      assert.equal(res.status, 200, `Kỳ vọng 200: ${JSON.stringify(res.body)}`);
      assert.equal(res.body.status, 'success');
      assert.equal(res.body.data.isBestAnswer, true);
      assert.equal(res.body.data.isSolved, true);

      // KIỂM TRA TRỰC TIẾP DATABASE MYSQL WALLETS:
      const [walletRows] = await pool.query(
        'SELECT coin_balance, exp FROM wallets WHERE user_id = ?',
        [TEST_USERS.USER_B.id]
      );
      const updatedWallet = (walletRows as any[])[0];

      // Đảm bảo tính toán chính xác tuyệt đối
      assert.equal(
        Number(updatedWallet.coin_balance),
        initialUserBCoins + 10,
        `Ví Xu phải tăng đúng 10 (từ ${initialUserBCoins} lên ${initialUserBCoins + 10})`
      );
      assert.equal(
        Number(updatedWallet.exp),
        initialUserBExp + 20,
        `Exp phải tăng đúng 20 (từ ${initialUserBExp} lên ${initialUserBExp + 20})`
      );

      // KIỂM TRA LỊCH SỬ GIAO DỊCH (BILLING_TRANSACTIONS):
      const [txRows] = await pool.query(
        `SELECT amount, transaction_type, metadata FROM billing_transactions
         WHERE user_id = ? ORDER BY created_at DESC LIMIT 1`,
        [TEST_USERS.USER_B.id]
      );
      const tx = (txRows as any[])[0];
      assert.ok(tx, 'Phải có bản ghi giao dịch trong billing_transactions');
      assert.equal(tx.amount, 10, 'Số tiền giao dịch thưởng là 10');
      assert.equal(tx.transaction_type, 'EARN_ACHIEVEMENT');
      const meta = typeof tx.metadata === 'string' ? JSON.parse(tx.metadata) : tx.metadata;
      assert.equal(meta.reason, 'BEST_ANSWER_REWARD');
      assert.equal(meta.postId, questionPostId);
    });
  });
});
