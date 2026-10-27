import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { io as ClientIO, Socket as ClientSocket } from 'socket.io-client';
import request from 'supertest';
import {
  createCommunityTestApp,
  seedCommunityTestUsers,
  cleanupCommunityTestData,
  TEST_USERS,
  TOKENS,
} from './community-test-helper';
import { initSocialSocket } from '../modules/social/social-socket';
import CommunityPost from '../database/models/CommunityPost';
import CommunityComment from '../database/models/CommunityComment';
import CommunityReaction from '../database/models/CommunityReaction';

describe('=== KIỂM THỬ TỰ ĐỘNG: COMMUNITY MODULE - PHASE 3 (REAL-TIME WEBSOCKETS & ANTI-SPAM) ===', { timeout: 60000 }, () => {
  let httpServer: any;
  let ioServer: SocketIOServer;
  let serverPort: number;

  let clientA: ClientSocket;
  let clientB: ClientSocket;

  let testPostId = '';
  let testCommentId = '';

  before(async () => {
    console.log('\n[SETUP] Khởi tạo Server Socket.IO & Seed dữ liệu kiểm thử...');
    await seedCommunityTestUsers();

    // 1. Khởi tạo Express App + HTTP Server + Socket.IO
    const app = createCommunityTestApp();
    httpServer = createServer(app);
    ioServer = new SocketIOServer(httpServer, {
      cors: { origin: '*', credentials: true },
    });
    initSocialSocket(ioServer);

    // 2. Lắng nghe trên cổng tạm ngẫu nhiên
    await new Promise<void>((resolve) => {
      httpServer.listen(0, () => {
        serverPort = (httpServer.address() as any).port;
        console.log(`Socket.IO Community Test Server đang chạy trên cổng tạm: ${serverPort}`);
        resolve();
      });
    });

    // 3. Kết nối Client A (User A)
    await new Promise<void>((resolve, reject) => {
      clientA = ClientIO(`http://localhost:${serverPort}/chat`, {
        auth: { token: TOKENS.USER_A },
        transports: ['websocket'],
        forceNew: true,
      });
      clientA.on('connect', () => resolve());
      clientA.on('connect_error', (err) => reject(err));
    });

    // 4. Kết nối Client B (User B)
    await new Promise<void>((resolve, reject) => {
      clientB = ClientIO(`http://localhost:${serverPort}/chat`, {
        auth: { token: TOKENS.USER_B },
        transports: ['websocket'],
        forceNew: true,
      });
      clientB.on('connect', () => resolve());
      clientB.on('connect_error', (err) => reject(err));
    });

    // 5. Tạo sẵn 1 bài viết của User A
    const post = await CommunityPost.create({
      authorId: TEST_USERS.USER_A.id,
      authorRole: 'USER',
      type: 'discussion',
      topic: 'general',
      title: 'Bài viết kiểm thử thông báo Real-time WebSocket',
      content: 'Nội dung bài viết để kiểm tra sự kiện bắn thông báo sang client.',
    });
    testPostId = post._id.toString();
  });

  after(async () => {
    console.log('\n[TEARDOWN] Đóng kết nối WebSocket và dọn dẹp...');
    if (clientA?.connected) clientA.disconnect();
    if (clientB?.connected) clientB.disconnect();

    await new Promise<void>((resolve) => {
      ioServer.close(() => {
        httpServer.close(() => resolve());
      });
    });

    await cleanupCommunityTestData();
    setTimeout(() => process.exit(0), 100);
  });

  // =========================================================================
  // 1. REAL-TIME NOTIFICATIONS KHI CÓ TƯƠNG TÁC BÀI VIẾT
  // =========================================================================
  describe('1. Bắn thông báo Real-time qua WebSocket (/chat namespace)', () => {
    it('1.1. User B bình luận bài của User A -> Client A nhận event "notification" type: community_comment', async () => {
      // Đăng ký lắng nghe sự kiện notification trên Client A
      const notificationPromise = new Promise<any>((resolve) => {
        clientA.once('notification', (data) => resolve(data));
      });

      // User B bắn API comment vào bài của User A
      const res = await request(httpServer)
        .post(`/api/community/posts/${testPostId}/comments`)
        .set('Authorization', `Bearer ${TOKENS.USER_B}`)
        .send({ content: 'Bình luận kiểm tra Real-time notification!' });

      assert.equal(res.status, 201);
      testCommentId = res.body.data.id;

      // Chờ nhận event từ Socket.IO
      const received = await notificationPromise;
      assert.ok(received?.notification, 'Phải có payload notification');
      assert.equal(received.notification.type, 'community_comment');
      assert.match(received.notification.title, /Bình luận mới/);
      const text = received.notification.content || received.notification.body;
      assert.match(text, /Student Lan/); // Tên của User B
    });

    it('1.2. User A phản hồi bình luận của User B -> Client B nhận event "notification" type: community_reply', async () => {
      assert.ok(testCommentId);

      const notificationPromise = new Promise<any>((resolve) => {
        clientB.once('notification', (data) => resolve(data));
      });

      // User A reply bình luận của User B
      const res = await request(httpServer)
        .post(`/api/community/posts/${testPostId}/comments`)
        .set('Authorization', `Bearer ${TOKENS.USER_A}`)
        .send({
          content: 'Phản hồi lại User B!',
          parentId: testCommentId,
          replyToUserId: TEST_USERS.USER_B.id,
        });

      assert.equal(res.status, 201);

      const received = await notificationPromise;
      assert.ok(received?.notification);
      assert.equal(received.notification.type, 'community_reply');
      assert.match(received.notification.title, /Phản hồi mới/);
    });

    it('1.3. User B thả tim bài của User A -> Client A nhận event "notification" type: community_like', async () => {
      const notificationPromise = new Promise<any>((resolve) => {
        clientA.once('notification', (data) => resolve(data));
      });

      // User B thả tim bài viết của User A
      const res = await request(httpServer)
        .post(`/api/community/posts/${testPostId}/like`)
        .set('Authorization', `Bearer ${TOKENS.USER_B}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.data.added, true);

      const received = await notificationPromise;
      assert.ok(received?.notification);
      assert.equal(received.notification.type, 'community_like');
      assert.match(received.notification.title, /Lượt thích mới/);
    });

    it('1.4. User A chọn bình luận của User B làm Best Answer -> Client B nhận event type: community_best_answer', async () => {
      assert.ok(testCommentId);

      const notificationPromise = new Promise<any>((resolve) => {
        clientB.once('notification', (data) => resolve(data));
      });

      // User A chọn Best Answer
      const res = await request(httpServer)
        .post(`/api/community/posts/${testPostId}/comments/${testCommentId}/best-answer`)
        .set('Authorization', `Bearer ${TOKENS.USER_A}`);

      assert.equal(res.status, 200);

      const received = await notificationPromise;
      assert.ok(received?.notification);
      assert.equal(received.notification.type, 'community_best_answer');
      const text = received.notification.content || received.notification.body;
      assert.match(text, /\+10 Xu/);
      assert.match(text, /\+20 Exp/);
    });
  });

  // =========================================================================
  // 2. KIỂM THỬ TẢI & CHỐNG SPAM / ĐỒNG THỜI (ANTI-SPAM & CONCURRENCY)
  // =========================================================================
  describe('2. Kiểm thử tải & Cơ chế chống spam (Concurrent Requests & Anti-Spam)', () => {
    it('2.1. Giả lập spam 30 lượt thả tim dồn dập cùng lúc -> Hệ thống không sập, dữ liệu MongoDB nhất quán', async () => {
      // Tạo một bài viết mới chuyên để test spam Like
      const spamTestPost = await CommunityPost.create({
        authorId: TEST_USERS.CREATOR.id,
        authorRole: 'CONTENT_CREATOR',
        type: 'discussion',
        topic: 'general',
        title: 'Bài viết kiểm thử chống spam thả tim',
        content: 'Nội dung kiểm thử tính nhất quán khi có 30 request like gửi cùng mili-giây.',
      });
      const spamPostId = spamTestPost._id.toString();

      // Bắn 30 request like đồng thời từ User B
      const requests = Array.from({ length: 30 }, () =>
        request(httpServer)
          .post(`/api/community/posts/${spamPostId}/like`)
          .set('Authorization', `Bearer ${TOKENS.USER_B}`)
      );

      const results = await Promise.allSettled(requests);

      // Kiểm tra tất cả request đều được xử lý mà không làm sập server
      const successfulResponses = results.filter((r) => r.status === 'fulfilled');
      assert.equal(
        successfulResponses.length,
        30,
        'Tất cả 30 requests đều phải được server phản hồi trơn tru'
      );

      // KIỂM TRA TRỰC TIẾP DATABASE:
      // Index unique ({ targetType: 1, targetId: 1, userId: 1 }) đảm bảo User B chỉ có tối đa 1 hoặc 0 reaction
      const reactions = await CommunityReaction.find({
        targetType: 'post',
        targetId: spamPostId,
        userId: TEST_USERS.USER_B.id,
      });

      assert.ok(
        reactions.length <= 1,
        `Số lượng reaction của User B trong DB phải là 0 hoặc 1 (thực tế: ${reactions.length})`
      );

      // Kiểm tra bộ đếm stats.likesCount trong Post không bao giờ bị âm
      const postInDb = await CommunityPost.findById(spamPostId);
      const likesCount = postInDb?.stats?.likesCount ?? 0;
      assert.ok(likesCount >= 0, `likesCount không được phép âm (thực tế: ${likesCount})`);

      // Dọn dẹp
      await CommunityPost.deleteOne({ _id: spamPostId });
      await CommunityReaction.deleteMany({ targetId: spamPostId });
    });
  });
});
