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
import { pool } from '../config/mysql';

const app = createCommunityTestApp();

describe('=== KIỂM THỬ TỰ ĐỘNG: COMMUNITY MODULE - PHASE 1 (CORE API & DB) ===', { timeout: 60000 }, () => {
  let createdDiscussionPostId = '';
  let createdPollPostId = '';
  let rootCommentId = '';
  let replyCommentId = '';

  before(async () => {
    console.log('\n[SETUP] Khởi tạo môi trường test & Seed Data cho Creator, User A, User B...');
    await seedCommunityTestUsers();
  });

  after(async () => {
    console.log('\n[TEARDOWN] Dọn dẹp sạch toàn bộ dữ liệu test sau khi hoàn tất...');
    await cleanupCommunityTestData();
    setTimeout(() => process.exit(0), 100);
  });

  // =========================================================================
  // 1. KIỂM THỬ PHÂN TRANG CON TRỎ (CURSOR-BASED PAGINATION)
  // =========================================================================
  describe('1. Phân trang con trỏ (Cursor-based Pagination)', () => {
    const seededPostIds: string[] = [];

    before(async () => {
      // Seed 10 bài viết cách nhau 1 giây để kiểm tra thứ tự sắp xếp và phân trang
      const now = Date.now();
      for (let i = 1; i <= 10; i++) {
        const post = await CommunityPost.create({
          authorId: TEST_USERS.USER_A.id,
          authorRole: 'USER',
          type: 'discussion',
          topic: 'general',
          title: `Bài viết kiểm thử số ${i.toString().padStart(2, '0')}`,
          content: `Nội dung chi tiết cho bài viết số ${i} để kiểm tra Cursor Pagination`,
          tags: ['test', 'pagination'],
          createdAt: new Date(now - (11 - i) * 1000), // Bài 10 mới nhất, bài 1 cũ nhất
        });
        seededPostIds.push(post._id.toString());
      }
    });

    after(async () => {
      await CommunityPost.deleteMany({ _id: { $in: seededPostIds } });
    });

    let nextCursorPage1: string | null = null;
    let page1PostIds: string[] = [];

    it('1.1. Lấy trang 1 với limit=5 -> Trả về 5 bài mới nhất và nextCursor hợp lệ', async () => {
      const res = await request(app)
        .get('/api/community/posts?limit=5')
        .set('Authorization', `Bearer ${TOKENS.USER_A}`);

      assert.equal(res.status, 200, `Kỳ vọng status 200: ${JSON.stringify(res.body)}`);
      assert.equal(res.body.status, 'success');
      assert.ok(Array.isArray(res.body.data.posts), 'data.posts phải là mảng');
      assert.equal(res.body.data.posts.length, 5, 'Trang 1 phải có đúng 5 bài');
      assert.equal(res.body.data.hasMore, true, 'hasMore phải là true');
      assert.ok(res.body.data.nextCursor, 'nextCursor phải tồn tại');

      nextCursorPage1 = res.body.data.nextCursor;
      page1PostIds = res.body.data.posts.map((p: any) => p.id);

      // Bài viết đầu tiên phải là bài mới nhất (Bài 10)
      assert.match(res.body.data.posts[0].title, /số 10/);
    });

    it('1.2. Lấy trang 2 bằng nextCursor -> Không trùng lặp bất kỳ bài nào của trang 1', async () => {
      assert.ok(nextCursorPage1, 'Phải có nextCursor từ trang 1');

      const res = await request(app)
        .get(`/api/community/posts?limit=5&cursor=${encodeURIComponent(nextCursorPage1)}`)
        .set('Authorization', `Bearer ${TOKENS.USER_A}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.status, 'success');
      assert.equal(res.body.data.posts.length, 5, 'Trang 2 phải có 5 bài tiếp theo');

      const page2PostIds = res.body.data.posts.map((p: any) => p.id);

      // Đảm bảo không trùng lặp (Zero duplication)
      for (const id of page2PostIds) {
        assert.ok(!page1PostIds.includes(id), `Bài viết ID ${id} bị trùng lặp giữa trang 1 và 2`);
      }

      // Bài cuối cùng của trang 2 phải là bài cũ nhất (Bài 01)
      assert.match(res.body.data.posts[4].title, /số 01/);
    });

    it('1.3. Lọc theo Topic cụ thể -> Chỉ trả về các bài thuộc topic đó', async () => {
      const res = await request(app)
        .get('/api/community/posts?topic=ielts')
        .set('Authorization', `Bearer ${TOKENS.USER_A}`);

      assert.equal(res.status, 200);
      for (const p of res.body.data.posts) {
        assert.equal(p.topic, 'ielts', 'Tất cả bài viết phải thuộc topic ielts');
      }
    });
  });

  // =========================================================================
  // 2. TẠO BÀI VIẾT ĐA HÌNH & VALIDATION (POLYMORPHIC POSTS)
  // =========================================================================
  describe('2. Tạo bài viết đa hình & Kiểm tra ràng buộc dữ liệu (Polymorphic Posts)', () => {
    it('2.1. User A tạo bài thảo luận thường (type: discussion) -> Thành công (201)', async () => {
      const payload = {
        title: 'Hỏi về cách dùng mệnh đề quan hệ trong IELTS Writing Task 2',
        content: 'Mọi người cho mình hỏi khi nào dùng which khi nào dùng that trong bài essay task 2?',
        topic: 'grammar',
        tags: ['grammar', 'ielts', 'writing'],
      };

      const res = await request(app)
        .post('/api/community/posts')
        .set('Authorization', `Bearer ${TOKENS.USER_A}`)
        .send(payload);

      assert.equal(res.status, 201, `Kỳ vọng 201: ${JSON.stringify(res.body)}`);
      assert.equal(res.body.status, 'success');
      assert.equal(res.body.data.title, payload.title);
      assert.equal(res.body.data.type, 'discussion');
      assert.equal(res.body.data.topic, 'grammar');
      assert.equal(res.body.data.author.id, TEST_USERS.USER_A.id);
      assert.equal(res.body.data.author.full_name, TEST_USERS.USER_A.full_name);

      createdDiscussionPostId = res.body.data.id;
    });

    it('2.2. Giảng viên (Creator) tạo bài bình chọn (type: poll) với 4 phương án -> Thành công (201)', async () => {
      const payload = {
        title: 'Thăm dò ý kiến: Kỹ năng nào trong IELTS bạn thấy khó nhất?',
        content: 'Chào các bạn học viên, hãy bình chọn kỹ năng bạn thấy thử thách nhất nhé!',
        topic: 'ielts',
        tags: ['poll', 'ielts'],
        pollOptions: ['Listening', 'Speaking', 'Writing', 'Reading'],
      };

      const res = await request(app)
        .post('/api/community/posts')
        .set('Authorization', `Bearer ${TOKENS.CREATOR}`)
        .send(payload);

      assert.equal(res.status, 201, `Kỳ vọng 201: ${JSON.stringify(res.body)}`);
      assert.equal(res.body.data.type, 'poll');
      assert.ok(Array.isArray(res.body.data.pollOptions), 'pollOptions phải là mảng');
      assert.equal(res.body.data.pollOptions.length, 4, 'Phải có 4 phương án bình chọn');
      assert.equal(res.body.data.authorRole, 'CONTENT_CREATOR');

      createdPollPostId = res.body.data.id;
    });

    it('2.3. Ràng buộc dữ liệu: Tiêu đề quá ngắn (< 3 ký tự) -> Bị từ chối (400)', async () => {
      const res = await request(app)
        .post('/api/community/posts')
        .set('Authorization', `Bearer ${TOKENS.USER_A}`)
        .send({
          title: 'Hi',
          content: 'Nội dung hợp lệ trên năm ký tự',
          topic: 'general',
        });

      assert.equal(res.status, 400);
      assert.match(res.body.message, /từ 3 đến 200 ký tự/);
    });

    it('2.4. Ràng buộc dữ liệu: Chủ đề không hợp lệ -> Bị từ chối (400)', async () => {
      const res = await request(app)
        .post('/api/community/posts')
        .set('Authorization', `Bearer ${TOKENS.USER_A}`)
        .send({
          title: 'Tiêu đề câu hỏi hợp lệ',
          content: 'Nội dung hợp lệ trên năm ký tự',
          topic: 'astrology_unknown_topic',
        });

      assert.equal(res.status, 400);
      assert.match(res.body.message, /Chủ đề không hợp lệ/);
    });

    it('2.5. Bảo mật: Người dùng chưa đăng nhập tạo bài viết -> Bị chặn (401 Unauthorized)', async () => {
      const res = await request(app)
        .post('/api/community/posts')
        .send({
          title: 'Tiêu đề câu hỏi hợp lệ',
          content: 'Nội dung hợp lệ trên năm ký tự',
          topic: 'general',
        });

      assert.equal(res.status, 401);
    });
  });

  // =========================================================================
  // 3. KIỂM THỬ BÌNH LUẬN ĐA CẤP (NESTED COMMENTS - STRICT 2-TIER)
  // =========================================================================
  describe('3. Bình luận đa cấp (Nested Comments - Giới hạn nghiêm ngặt 2 cấp)', () => {
    it('3.1. User B gửi bình luận gốc (Tier 1) vào bài viết của User A -> Thành công (201)', async () => {
      assert.ok(createdDiscussionPostId, 'Cần bài viết hợp lệ');

      const res = await request(app)
        .post(`/api/community/posts/${createdDiscussionPostId}/comments`)
        .set('Authorization', `Bearer ${TOKENS.USER_B}`)
        .send({
          content: 'Bạn dùng "which" cho mệnh đề quan hệ không xác định (có dấu phẩy) nhé!',
        });

      assert.equal(res.status, 201, `Kỳ vọng 201: ${JSON.stringify(res.body)}`);
      assert.equal(res.body.status, 'success');
      assert.equal(res.body.data.parentId, null, 'Bình luận gốc parentId phải là null');
      assert.equal(res.body.data.author.id, TEST_USERS.USER_B.id);

      rootCommentId = res.body.data.id;
    });

    it('3.2. User A phản hồi (Tier 2) vào bình luận của User B -> Thành công (201)', async () => {
      assert.ok(rootCommentId, 'Cần rootCommentId hợp lệ');

      const res = await request(app)
        .post(`/api/community/posts/${createdDiscussionPostId}/comments`)
        .set('Authorization', `Bearer ${TOKENS.USER_A}`)
        .send({
          content: 'Cảm ơn bạn nhiều, giải thích rất dễ hiểu!',
          parentId: rootCommentId,
          replyToUserId: TEST_USERS.USER_B.id,
        });

      assert.equal(res.status, 201);
      assert.equal(res.body.data.parentId, rootCommentId, 'parentId phải trỏ về rootComment');
      assert.ok(res.body.data.replyToUser, 'Phải có thông tin người nhận reply');
      assert.equal(res.body.data.replyToUser.id, TEST_USERS.USER_B.id);

      replyCommentId = res.body.data.id;
    });

    it('3.3. Creator cố ý reply vào bình luận Tier 2 -> Hệ thống tự gán parentId về Tier 1 (Không sinh Tier 3)', async () => {
      assert.ok(replyCommentId, 'Cần replyCommentId');
      assert.ok(rootCommentId, 'Cần rootCommentId');

      // Giả lập gửi parentId là replyCommentId (cố tình lồng cấp 3)
      const res = await request(app)
        .post(`/api/community/posts/${createdDiscussionPostId}/comments`)
        .set('Authorization', `Bearer ${TOKENS.CREATOR}`)
        .send({
          content: 'Chuẩn rồi, các em nhớ thêm ví dụ để nhớ lâu hơn nhé!',
          parentId: replyCommentId, // Cố tình trỏ vào Tier 2
          replyToUserId: TEST_USERS.USER_A.id,
        });

      assert.equal(res.status, 201);
      // KIỂM TRA QUAN TRỌNG: parentId trong database PHẢI là rootCommentId (Tier 1), không thể là replyCommentId
      assert.equal(
        res.body.data.parentId,
        rootCommentId,
        'Hệ thống phải tự ép parentId về rootCommentId để bảo vệ cấu trúc 2 tầng'
      );
    });

    it('3.4. Lấy danh sách replies của rootComment -> Trả về danh sách phản hồi', async () => {
      const res = await request(app)
        .get(`/api/community/comments/${rootCommentId}/replies`)
        .set('Authorization', `Bearer ${TOKENS.USER_A}`);

      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.body.data.replies));
      assert.equal(res.body.data.replies.length, 2, 'Phải có 2 phản hồi thuộc rootComment này');
    });
  });

  // =========================================================================
  // 4. PHÂN QUYỀN & QUYỀN THAO TÁC (AUTHORIZATION & ROLES)
  // =========================================================================
  describe('4. Phân quyền & Quyền thao tác (Authorization & Roles)', () => {
    it('4.1. Creator ghim bài viết của chính mình -> Thành công (200, isPinned = true)', async () => {
      assert.ok(createdPollPostId, 'Cần bài viết của Creator');

      const res = await request(app)
        .patch(`/api/community/posts/${createdPollPostId}/pin`)
        .set('Authorization', `Bearer ${TOKENS.CREATOR}`);

      assert.equal(res.status, 200, `Kỳ vọng 200: ${JSON.stringify(res.body)}`);
      assert.equal(res.body.data.isPinned, true, 'isPinned phải là true');

      // Kiểm tra trong DB
      const postInDb = await CommunityPost.findById(createdPollPostId);
      assert.equal(postInDb?.isPinned, true);
    });

    it('4.2. User thường (User A) cố ghim bài của Creator -> Bị từ chối (403 Forbidden)', async () => {
      assert.ok(createdPollPostId);

      const res = await request(app)
        .patch(`/api/community/posts/${createdPollPostId}/pin`)
        .set('Authorization', `Bearer ${TOKENS.USER_A}`);

      assert.equal(res.status, 403, 'User thường không được ghim bài');
      assert.match(res.body.message, /Chỉ Giảng viên hoặc Quản trị viên/);
    });

    it('4.3. User thường (User B) cố tình chọn Best Answer trên bài viết của User A -> Bị từ chối (403 Forbidden)', async () => {
      assert.ok(createdDiscussionPostId);
      assert.ok(rootCommentId);

      const res = await request(app)
        .post(`/api/community/posts/${createdDiscussionPostId}/comments/${rootCommentId}/best-answer`)
        .set('Authorization', `Bearer ${TOKENS.USER_B}`); // User B không phải chủ bài

      assert.equal(res.status, 403);
      assert.match(res.body.message, /Chỉ người đăng bài mới có quyền/);
    });

    it('4.4. Chủ bài viết (User A) chọn bình luận của User B làm Best Answer -> Thành công (200)', async () => {
      assert.ok(createdDiscussionPostId);
      assert.ok(rootCommentId);

      const res = await request(app)
        .post(`/api/community/posts/${createdDiscussionPostId}/comments/${rootCommentId}/best-answer`)
        .set('Authorization', `Bearer ${TOKENS.USER_A}`); // User A là chủ bài

      assert.equal(res.status, 200, `Kỳ vọng 200: ${JSON.stringify(res.body)}`);
      assert.equal(res.body.data.success, true);
      assert.equal(res.body.data.isSolved, true);
      assert.equal(res.body.data.isBestAnswer, true);

      // Kiểm tra trạng thái trong MongoDB
      const updatedPost = await CommunityPost.findById(createdDiscussionPostId);
      const updatedComment = await CommunityComment.findById(rootCommentId);
      assert.equal(updatedPost?.isSolved, true, 'Post phải có isSolved = true');
      assert.equal(updatedComment?.isBestAnswer, true, 'Comment phải có isBestAnswer = true');
    });

    it('4.5. Đánh dấu lại Best Answer trên bình luận đã là Best Answer -> Báo lỗi (400 Bad Request)', async () => {
      const res = await request(app)
        .post(`/api/community/posts/${createdDiscussionPostId}/comments/${rootCommentId}/best-answer`)
        .set('Authorization', `Bearer ${TOKENS.USER_A}`);

      assert.equal(res.status, 400);
      assert.match(res.body.message, /đã được chọn là câu trả lời hay nhất/);
    });
  });
});
