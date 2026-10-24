import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { io as ClientIO, Socket as ClientSocket } from 'socket.io-client';
import { v4 as uuidv4 } from 'uuid';
import {
  createTestApp,
  seedTestUsers,
  cleanupTestData,
  TEST_USERS,
  TOKENS,
} from './test-helper';
import { initSocialSocket } from '../modules/social/social-socket';
import { buildPairKey } from '../database/models/Friendship';
import { orderUserPair } from '../database/models/Conversation';
import { pool } from '../config/mysql';

describe('=== KIỂM THỬ TỰ ĐỘNG: REAL-TIME WEBSOCKET (PHASE 3) ===', { timeout: 60000 }, () => {
  let httpServer: any;
  let ioServer: SocketIOServer;
  let serverPort: number;
  let conversationId = '';

  let clientA: ClientSocket;
  let clientB: ClientSocket;

  before(async () => {
    console.log('\n[SETUP] Khởi tạo Server Socket.IO & Seed dữ liệu bạn bè...');
    await seedTestUsers();

    // 1. Tạo quan hệ bạn bè đã accepted giữa User A và User B
    const pairKey = buildPairKey(TEST_USERS.USER_A.id, TEST_USERS.USER_B.id);
    await pool.query(
      `INSERT INTO friendships (id, requester_id, receiver_id, pair_key, status)
       VALUES (?, ?, ?, ?, 'accepted')
       ON DUPLICATE KEY UPDATE status = 'accepted'`,
      [uuidv4(), TEST_USERS.USER_A.id, TEST_USERS.USER_B.id, pairKey]
    );

    // 2. Tạo sẵn cuộc trò chuyện giữa User A và User B
    const [u1, u2] = orderUserPair(TEST_USERS.USER_A.id, TEST_USERS.USER_B.id);
    const [rows] = await pool.query(
      `SELECT id FROM conversations WHERE user1_id = ? AND user2_id = ?`,
      [u1, u2]
    );
    const existing = (rows as any[])[0];
    if (existing) {
      conversationId = existing.id;
    } else {
      conversationId = uuidv4();
      await pool.query(
        `INSERT INTO conversations (id, user1_id, user2_id) VALUES (?, ?, ?)`,
        [conversationId, u1, u2]
      );
    }

    // 3. Khởi tạo HTTP server + Socket.IO trên cổng tạm ngẫu nhiên (ephemeral port)
    const app = createTestApp();
    httpServer = createServer(app);
    ioServer = new SocketIOServer(httpServer, {
      cors: { origin: '*', credentials: true },
    });
    initSocialSocket(ioServer);

    await new Promise<void>((resolve) => {
      httpServer.listen(0, () => {
        serverPort = (httpServer.address() as any).port;
        console.log(`Socket.IO Test Server đang chạy trên cổng tạm: ${serverPort}`);
        resolve();
      });
    });
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

    await cleanupTestData();
    setTimeout(() => process.exit(0), 100);
  });

  // =========================================================================
  // 1. KẾT NỐI & XÁC THỰC SOCKET.IO
  // =========================================================================
  it('1.1. Chặn kết nối không có JWT Token hợp lệ -> Trả về lỗi UNAUTHORIZED', async () => {
    await new Promise<void>((resolve, reject) => {
      const unauthorizedClient = ClientIO(`http://localhost:${serverPort}/chat`, {
        transports: ['websocket'],
        forceNew: true,
      });

      unauthorizedClient.on('connect_error', (err) => {
        assert.equal(err.message, 'UNAUTHORIZED', 'Kỳ vọng lỗi UNAUTHORIZED khi thiếu token');
        unauthorizedClient.disconnect();
        resolve();
      });

      unauthorizedClient.on('connect', () => {
        unauthorizedClient.disconnect();
        reject(new Error('Lỗ hổng: Client không có token nhưng vẫn kết nối thành công!'));
      });
    });
  });

  it('1.2. User A và User B kết nối thành công với Token JWT hợp lệ', async () => {
    // Kết nối User A
    await new Promise<void>((resolve, reject) => {
      clientA = ClientIO(`http://localhost:${serverPort}/chat`, {
        auth: { token: TOKENS.USER_A },
        transports: ['websocket'],
        forceNew: true,
      });
      clientA.on('connect', () => resolve());
      clientA.on('connect_error', (err) => reject(err));
    });

    // Kết nối User B
    await new Promise<void>((resolve, reject) => {
      clientB = ClientIO(`http://localhost:${serverPort}/chat`, {
        auth: { token: TOKENS.USER_B },
        transports: ['websocket'],
        forceNew: true,
      });
      clientB.on('connect', () => resolve());
      clientB.on('connect_error', (err) => reject(err));
    });

    assert.equal(clientA.connected, true, 'User A phải ở trạng thái connected');
    assert.equal(clientB.connected, true, 'User B phải ở trạng thái connected');
  });

  // =========================================================================
  // 2. NHẮN TIN REALTIME: SEND_MESSAGE -> RECEIVE_MESSAGE
  // =========================================================================
  it('2.1. User A emit send_message -> User B nhận được event receive_message ngay lập tức', async () => {
    const testContent = `Tin nhắn realtime WebSocket: ${Date.now()}`;
    const testClientId = `ws-client-${Date.now()}`;

    // Đăng ký lắng nghe event `receive_message` ở User B
    const messagePromise = new Promise<any>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error('Quá thời gian chờ: User B không nhận được event receive_message!'));
      }, 5000);

      clientB.on('receive_message', (payload: any) => {
        clearTimeout(timer);
        resolve(payload?.message);
      });
    });

    // User A phát tin nhắn
    const ackPromise = new Promise<any>((resolve) => {
      clientA.emit(
        'send_message',
        {
          conversationId,
          content: testContent,
          clientId: testClientId,
        },
        (ack: any) => resolve(ack)
      );
    });

    const [ack, receivedMsg] = await Promise.all([ackPromise, messagePromise]);

    // Kiểm tra Server Ack cho User A
    assert.equal(ack.ok, true, `Ack thất bại: ${JSON.stringify(ack)}`);
    assert.equal(ack.client_id, testClientId);
    assert.equal(ack.message.content, testContent);

    // Kiểm tra Payload nhận được tại User B
    assert.ok(receivedMsg, 'User B phải nhận được object message');
    assert.equal(receivedMsg.content, testContent, 'Nội dung tin nhắn nhận được phải trùng khớp');
    assert.equal(receivedMsg.sender_id, TEST_USERS.USER_A.id, 'sender_id phải là User A');
    assert.equal(receivedMsg.conversation_id, conversationId, 'conversation_id phải trùng khớp');
    assert.equal(receivedMsg.is_read, false, 'Tin nhắn mới nhận phải có is_read = false');

    // ĐỐI CHIẾU TRỰC TIẾP DATABASE:
    const [rows] = await pool.query(
      'SELECT id, conversation_id, sender_id, content FROM messages WHERE id = ?',
      [receivedMsg.id]
    );
    const records = rows as any[];
    assert.equal(records.length, 1, 'Bản ghi tin nhắn phải được lưu vào DB');
    assert.equal(records[0].content, testContent);
  });

  // =========================================================================
  // 3. TYPING INDICATOR REALTIME
  // =========================================================================
  it('3.1. User A phát event typing (isTyping: true) -> User B nhận được thông báo đối phương đang gõ', async () => {
    const typingPromise = new Promise<any>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error('Quá thời gian: User B không nhận được sự kiện typing'));
      }, 5000);

      clientB.on('typing', (data: any) => {
        clearTimeout(timer);
        resolve(data);
      });
    });

    // User A phát tín hiệu đang gõ
    clientA.emit('typing', { conversationId, isTyping: true });

    const typingData = await typingPromise;
    assert.equal(typingData.conversation_id, conversationId);
    assert.equal(typingData.user_id, TEST_USERS.USER_A.id);
    assert.equal(typingData.is_typing, true);
  });

  // =========================================================================
  // 4. READ RECEIPTS REALTIME (MARK_READ -> MESSAGES_READ)
  // =========================================================================
  it('4.1. User B phát event mark_read -> User A nhận được event messages_read', async () => {
    const readPromise = new Promise<any>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error('Quá thời gian: User A không nhận được sự kiện messages_read'));
      }, 5000);

      clientA.on('messages_read', (data: any) => {
        clearTimeout(timer);
        resolve(data);
      });
    });

    // User B báo đã đọc
    const ackPromise = new Promise<any>((resolve) => {
      clientB.emit('mark_read', { conversationId }, (ack: any) => resolve(ack));
    });

    const [ack, readData] = await Promise.all([ackPromise, readPromise]);

    assert.equal(ack.ok, true, `Ack mark_read thất bại: ${JSON.stringify(ack)}`);
    assert.ok(ack.count >= 1, 'Số lượng tin nhắn đánh dấu đọc phải >= 1');

    assert.equal(readData.conversation_id, conversationId);
    assert.equal(readData.reader_id, TEST_USERS.USER_B.id);
    assert.ok(readData.count >= 1);
  });
});
