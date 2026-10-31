import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import {
  createTestApp,
  seedTestUsers,
  cleanupTestData,
  TEST_USERS,
  TOKENS,
} from './test-helper';
import { pool } from '../config/mysql';

const app = createTestApp();

describe('=== KIỂM THỬ TỰ ĐỘNG: FRIENDSHIP & DIRECT MESSAGING (PHASE 2) ===', { timeout: 60000 }, () => {
  let createdRequestId = '';
  let conversationId = '';

  before(async () => {
    console.log('\n[SETUP] Khởi tạo môi trường test & Seed Data cho User A, B, C...');
    await seedTestUsers();
  });

  after(async () => {
    console.log('\n[TEARDOWN] Dọn dẹp sạch toàn bộ dữ liệu test sau khi hoàn tất...');
    await cleanupTestData();
    setTimeout(() => process.exit(0), 100);
  });

  // =========================================================================
  // 1. LUỒNG KẾT BẠN (FRIENDSHIP FLOW)
  // =========================================================================
  it('1.1. User A gửi lời mời kết bạn cho User B -> DB tạo bản ghi pending (201)', async () => {
    const res = await request(app)
      .post('/api/social/friends/requests')
      .set('Authorization', `Bearer ${TOKENS.USER_A}`)
      .send({ receiverId: TEST_USERS.USER_B.id });

    assert.equal(res.status, 201, `Kỳ vọng status 201: ${JSON.stringify(res.body)}`);
    assert.equal(res.body.status, 'success');
    assert.equal(res.body.data.status, 'pending');
    assert.ok(res.body.data.request_id, 'Phải có request_id trả về');
    createdRequestId = res.body.data.request_id;

    // KIỂM TRA TRỰC TIẾP DATABASE:
    const [rows] = await pool.query(
      'SELECT id, requester_id, receiver_id, status FROM friendships WHERE id = ?',
      [createdRequestId]
    );
    const records = rows as any[];
    assert.equal(records.length, 1, 'Bản ghi phải tồn tại trong bảng friendships');
    assert.equal(records[0].requester_id, TEST_USERS.USER_A.id);
    assert.equal(records[0].receiver_id, TEST_USERS.USER_B.id);
    assert.equal(records[0].status, 'pending', 'Trạng thái trong DB phải là pending');
  });

  it('1.2. User A cố tình gửi lại lời mời kết bạn cho User B -> Chặn gửi trùng lặp (409 Conflict)', async () => {
    const res = await request(app)
      .post('/api/social/friends/requests')
      .set('Authorization', `Bearer ${TOKENS.USER_A}`)
      .send({ receiverId: TEST_USERS.USER_B.id });

    assert.equal(res.status, 409, 'Kỳ vọng status 409 khi gửi trùng lặp yêu cầu đang chờ');
    assert.equal(res.body.status, 'error');

    // Đảm bảo DB không bị sinh thêm bản ghi
    const [rows] = await pool.query(
      'SELECT COUNT(*) as count FROM friendships WHERE requester_id = ? AND receiver_id = ?',
      [TEST_USERS.USER_A.id, TEST_USERS.USER_B.id]
    );
    const count = (rows as any[])[0].count;
    assert.equal(count, 1, 'Chỉ duy nhất 1 bản ghi được phép tồn tại trong DB');
  });

  it('1.3. User B lấy danh sách lời mời chờ (Pending list) -> Thấy yêu cầu từ User A', async () => {
    const res = await request(app)
      .get('/api/social/friends/requests?direction=received')
      .set('Authorization', `Bearer ${TOKENS.USER_B}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'success');
    assert.ok(Array.isArray(res.body.data), 'data phải là một mảng');

    const found = res.body.data.find((item: any) => item.request_id === createdRequestId);
    assert.ok(found, 'Danh sách lời mời chờ của User B phải chứa yêu cầu từ User A');
    assert.equal(found.user.id, TEST_USERS.USER_A.id);
    assert.equal(found.user.full_name, TEST_USERS.USER_A.full_name);
  });

  it('1.4. User B Chấp nhận lời mời kết bạn -> DB cập nhật status = accepted', async () => {
    assert.ok(createdRequestId, 'createdRequestId phải hợp lệ từ bước 1.1');
    const res = await request(app)
      .post(`/api/social/friends/requests/${createdRequestId}/accept`)
      .set('Authorization', `Bearer ${TOKENS.USER_B}`);

    assert.equal(res.status, 200, `Accept API thất bại: ${JSON.stringify(res.body)}`);
    assert.equal(res.body.status, 'success');

    // KIỂM TRA TRỰC TIẾP DATABASE:
    const [rows] = await pool.query(
      'SELECT status FROM friendships WHERE id = ?',
      [createdRequestId]
    );
    const records = rows as any[];
    assert.equal(records[0].status, 'accepted', 'Trạng thái trong DB phải chuyển thành accepted');
  });

  it('1.5. Cả 2 kiểm tra danh sách bạn bè -> Thấy nhau trong danh sách bạn bè chính thức', async () => {
    // User A kiểm tra
    const resA = await request(app)
      .get('/api/social/friends')
      .set('Authorization', `Bearer ${TOKENS.USER_A}`);
    assert.equal(resA.status, 200);
    assert.ok(resA.body.data.some((f: any) => f.id === TEST_USERS.USER_B.id));

    // User B kiểm tra
    const resB = await request(app)
      .get('/api/social/friends')
      .set('Authorization', `Bearer ${TOKENS.USER_B}`);
    assert.equal(resB.status, 200);
    assert.ok(resB.body.data.some((f: any) => f.id === TEST_USERS.USER_A.id));
  });

  it('1.6. User C (chưa kết bạn với User A) cố tình tạo cuộc trò chuyện -> Backend chặn lại (403)', async () => {
    const res = await request(app)
      .post('/api/social/conversations')
      .set('Authorization', `Bearer ${TOKENS.USER_C}`)
      .send({ friendId: TEST_USERS.USER_A.id });

    assert.equal(res.status, 403, 'Kỳ vọng 403 Forbidden khi chưa là bạn bè');
    assert.equal(res.body.status, 'error');
  });

  // =========================================================================
  // 2. LUỒNG NHẮN TIN & DATABASE (MESSAGING & DB FLOW)
  // =========================================================================
  it('2.1. User A tạo hoặc mở cuộc trò chuyện với User B (đã là bạn bè) -> Thành công', async () => {
    const res = await request(app)
      .post('/api/social/conversations')
      .set('Authorization', `Bearer ${TOKENS.USER_A}`)
      .send({ friendId: TEST_USERS.USER_B.id });

    assert.equal(res.status, 200, `Không thể tạo cuộc trò chuyện: ${JSON.stringify(res.body)}`);
    assert.equal(res.body.status, 'success');
    assert.ok(res.body.data.id, 'Phải trả về id cuộc trò chuyện');
    conversationId = res.body.data.id;

    // KIỂM TRA TRỰC TIẾP DATABASE:
    const [rows] = await pool.query(
      'SELECT id, user1_id, user2_id FROM conversations WHERE id = ?',
      [conversationId]
    );
    const records = rows as any[];
    assert.equal(records.length, 1);
    assert.ok(records[0].user1_id < records[0].user2_id, 'Quy tắc user1_id < user2_id phải được tuân thủ');
  });

  it('2.2. User C (người ngoài) cố tình gửi tin nhắn vào cuộc trò chuyện của A và B -> Backend chặn lại (404/403 bảo mật)', async () => {
    assert.ok(conversationId, 'conversationId phải hợp lệ từ bước 2.1');
    const res = await request(app)
      .post(`/api/social/conversations/${conversationId}/messages`)
      .set('Authorization', `Bearer ${TOKENS.USER_C}`)
      .send({ content: 'Tin nhắn spam/hack trái phép' });

    assert.ok(
      res.status === 404 || res.status === 403,
      `Kỳ vọng 404/403 khi người ngoài cố gửi tin nhắn, nhận được ${res.status}`
    );
  });

  it('2.3. User A gửi tin nhắn cho User B -> DB lưu bản ghi tin nhắn chính xác (201)', async () => {
    assert.ok(conversationId, 'conversationId phải hợp lệ từ bước 2.1');
    const content = 'Chào User B! Đây là tin nhắn kiểm thử tự động.';
    const res = await request(app)
      .post(`/api/social/conversations/${conversationId}/messages`)
      .set('Authorization', `Bearer ${TOKENS.USER_A}`)
      .send({ content });

    assert.equal(res.status, 201, `Gửi tin nhắn trả về status ${res.status}: ${JSON.stringify(res.body)}`);
    assert.equal(res.body.status, 'success');
    assert.equal(res.body.data.content, content);
    assert.equal(res.body.data.sender_id, TEST_USERS.USER_A.id);
    assert.equal(res.body.data.is_read, false);

    const messageId = res.body.data.id;

    // KIỂM TRA TRỰC TIẾP DATABASE:
    const [rows] = await pool.query(
      'SELECT id, conversation_id, sender_id, content, is_read FROM messages WHERE id = ?',
      [messageId]
    );
    const records = rows as any[];
    assert.equal(records.length, 1, 'Tin nhắn phải được lưu trong bảng messages');
    assert.equal(records[0].conversation_id, conversationId);
    assert.equal(records[0].sender_id, TEST_USERS.USER_A.id);
    assert.equal(records[0].content, content);
    assert.equal(records[0].is_read, 0, 'Tin nhắn mới gửi phải có is_read = 0');

    // Kiểm tra conversations.last_message_at đã được cập nhật
    const [convRows] = await pool.query(
      'SELECT last_message_at FROM conversations WHERE id = ?',
      [conversationId]
    );
    assert.ok((convRows as any[])[0].last_message_at, 'last_message_at phải được gán timestamp');
  });

  it('2.4. Phân trang tin nhắn (Pagination): Giới hạn 20 tin nhắn mỗi lần cuộn & kiểm tra con trỏ cursor', async () => {
    assert.ok(conversationId, 'conversationId phải hợp lệ');
    console.log('    --> Đang chèn thêm 25 tin nhắn hàng loạt (Bulk insert) để kiểm thử phân trang...');
    
    // Bulk insert 25 tin nhắn trong 1 truy vấn duy nhất (siêu tốc, không nghẽn mạng)
    const placeholders = Array.from({ length: 25 }, () => '(?, ?, ?, 0)').join(', ');
    const params: any[] = [];
    for (let i = 1; i <= 25; i++) {
      params.push(conversationId, TEST_USERS.USER_A.id, `Tin nhắn lịch sử số ${i}`);
    }
    await pool.query(
      `INSERT INTO messages (conversation_id, sender_id, content, is_read) VALUES ${placeholders}`,
      params
    );

    // Lần cuộn 1: Lấy 20 tin nhắn đầu tiên (limit = 20)
    const resPage1 = await request(app)
      .get(`/api/social/conversations/${conversationId}/messages?limit=20`)
      .set('Authorization', `Bearer ${TOKENS.USER_B}`);

    assert.equal(resPage1.status, 200);
    assert.equal(resPage1.body.status, 'success');
    assert.equal(resPage1.body.data.messages.length, 20, 'Trang 1 phải trả về đúng 20 tin nhắn');
    assert.equal(resPage1.body.data.has_more, true, 'has_more phải là true vì còn tin nhắn cũ');
    assert.ok(resPage1.body.data.next_cursor, 'next_cursor phải tồn tại để cuộn trang tiếp');

    const nextCursor = resPage1.body.data.next_cursor;

    // Lần cuộn 2: Lấy tiếp bằng cursor (limit = 20)
    const resPage2 = await request(app)
      .get(`/api/social/conversations/${conversationId}/messages?cursor=${nextCursor}&limit=20`)
      .set('Authorization', `Bearer ${TOKENS.USER_B}`);

    assert.equal(resPage2.status, 200);
    assert.equal(resPage2.body.status, 'success');
    // Tổng số tin: 1 (gửi ở 2.3) + 25 = 26 tin. Trang 1 lấy 20, trang 2 lấy còn lại 6 tin.
    assert.equal(resPage2.body.data.messages.length, 6, 'Trang 2 phải trả về nốt 6 tin nhắn còn lại');
    assert.equal(resPage2.body.data.has_more, false, 'has_more phải là false khi đã tải hết tin cũ');
    assert.equal(resPage2.body.data.next_cursor, null, 'next_cursor phải là null');
  });

  it('2.5. User B đọc tin nhắn -> API markRead cập nhật DB is_read = 1', async () => {
    assert.ok(conversationId, 'conversationId phải hợp lệ');
    const res = await request(app)
      .post(`/api/social/conversations/${conversationId}/read`)
      .set('Authorization', `Bearer ${TOKENS.USER_B}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'success');
    assert.ok(res.body.data.count > 0, `Kỳ vọng có tin nhắn được đánh dấu, nhận được ${res.body.data.count}`);

    // KIỂM TRA TRỰC TIẾP DATABASE:
    const [rows] = await pool.query(
      'SELECT COUNT(*) as unread_count FROM messages WHERE conversation_id = ? AND sender_id != ? AND is_read = 0',
      [conversationId, TEST_USERS.USER_B.id]
    );
    const unreadCount = (rows as any[])[0].unread_count;
    assert.equal(unreadCount, 0, 'Tất cả tin nhắn gửi cho User B trong hội thoại phải có is_read = 1');
  });
});
