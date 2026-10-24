import { pool } from '../../config/mysql';
import { v4 as uuidv4 } from 'uuid';
import { PoolConnection } from 'mysql2/promise';
import { IFriendship, FriendshipStatus, buildPairKey } from '../../database/models/Friendship';
import { IConversation, orderUserPair } from '../../database/models/Conversation';
import { IMessage } from '../../database/models/Message';

const toBool = (v: unknown): boolean => Boolean(v);

const mapFriendship = (row: any): IFriendship => ({ ...row });

const mapMessage = (row: any): IMessage => ({
    id: Number(row.id),
    conversation_id: row.conversation_id,
    sender_id: row.sender_id,
    content: row.content,
    is_read: toBool(row.is_read),
    read_at: row.read_at ?? null,
    created_at: row.created_at,
});

export const socialRepository = {
    // =====================================================================
    // USERS
    // =====================================================================
    async getUserBasic(userId: string) {
        const [rows] = await pool.execute(
            `SELECT id, full_name, avatar_url, status FROM users WHERE id = ? LIMIT 1`,
            [userId]
        );
        return ((rows as any[])[0] as
            | { id: string; full_name: string; avatar_url: string | null; status: string }
            | undefined) ?? null;
    },

    // Tìm user (tên chứa từ khoá hoặc email khớp chính xác), kèm trạng thái quan hệ với người tìm.
    // Ẩn những user đã chặn người tìm.
    async searchUsers(me: string, keyword: string, limit: number) {
        const likePattern = `%${keyword.replace(/[\\%_]/g, '\\$&')}%`;
        const [rows] = await pool.execute(
            `SELECT u.id, u.full_name, u.avatar_url,
                    COALESCE(w.level, 1) AS level,
                    f.id AS friendship_id, f.status AS friendship_status, f.requester_id AS friendship_requester_id
             FROM users u
             LEFT JOIN wallets w ON w.user_id = u.id
             LEFT JOIN friendships f
                    ON (f.requester_id = ? AND f.receiver_id = u.id)
                    OR (f.requester_id = u.id AND f.receiver_id = ?)
             WHERE u.id <> ?
               AND u.status = 'ACTIVE'
               AND (u.full_name LIKE ? OR u.email = ?)
               AND NOT (f.status = 'blocked' AND f.requester_id = u.id)
             ORDER BY u.full_name ASC
             LIMIT ?`,
            [me, me, me, likePattern, keyword, String(limit)]
        );
        return rows as any[];
    },

    // =====================================================================
    // FRIENDSHIPS
    // =====================================================================
    async findFriendshipByPair(userA: string, userB: string): Promise<IFriendship | null> {
        const [rows] = await pool.execute(
            `SELECT id, requester_id, receiver_id, pair_key, status, created_at, updated_at
             FROM friendships WHERE pair_key = ? LIMIT 1`,
            [buildPairKey(userA, userB)]
        );
        const row = (rows as any[])[0];
        return row ? mapFriendship(row) : null;
    },

    async findFriendshipById(id: string): Promise<IFriendship | null> {
        const [rows] = await pool.execute(
            `SELECT id, requester_id, receiver_id, pair_key, status, created_at, updated_at
             FROM friendships WHERE id = ? LIMIT 1`,
            [id]
        );
        const row = (rows as any[])[0];
        return row ? mapFriendship(row) : null;
    },

    // Ném lỗi ER_DUP_ENTRY nếu cặp user đã có quan hệ (race condition) -> service xử lý
    async createFriendship(requesterId: string, receiverId: string, status: FriendshipStatus = 'pending'): Promise<string> {
        const id = uuidv4();
        await pool.execute(
            `INSERT INTO friendships (id, requester_id, receiver_id, pair_key, status) VALUES (?, ?, ?, ?, ?)`,
            [id, requesterId, receiverId, buildPairKey(requesterId, receiverId), status]
        );
        return id;
    },

    // Cập nhật có điều kiện trạng thái hiện tại để tránh ghi đè khi có request song song
    async updateFriendship(
        id: string,
        expectedStatus: FriendshipStatus,
        data: { status: FriendshipStatus; requester_id?: string; receiver_id?: string }
    ): Promise<boolean> {
        const fields = ['status = ?'];
        const values: any[] = [data.status];
        if (data.requester_id !== undefined) {
            fields.push('requester_id = ?');
            values.push(data.requester_id);
        }
        if (data.receiver_id !== undefined) {
            fields.push('receiver_id = ?');
            values.push(data.receiver_id);
        }
        values.push(id, expectedStatus);
        const [result] = await pool.execute(
            `UPDATE friendships SET ${fields.join(', ')} WHERE id = ? AND status = ?`,
            values
        );
        return (result as any).affectedRows > 0;
    },

    async deleteFriendship(id: string, expectedStatus: FriendshipStatus): Promise<boolean> {
        const [result] = await pool.execute(`DELETE FROM friendships WHERE id = ? AND status = ?`, [id, expectedStatus]);
        return (result as any).affectedRows > 0;
    },

    async listFriends(me: string, keyword?: string) {
        const params: any[] = [me, me, me];
        let filter = '';
        if (keyword) {
            filter = `AND u.full_name LIKE ?`;
            params.push(`%${keyword.replace(/[\\%_]/g, '\\$&')}%`);
        }
        const [rows] = await pool.execute(
            `SELECT u.id, u.full_name, u.avatar_url,
                    COALESCE(w.level, 1) AS level,
                    COALESCE(w.current_streak, 0) AS current_streak,
                    COALESCE(w.arena_rank, 'BRONZE') AS arena_rank,
                    f.id AS friendship_id, f.updated_at AS friends_since
             FROM friendships f
             JOIN users u ON u.id = IF(f.requester_id = ?, f.receiver_id, f.requester_id)
             LEFT JOIN wallets w ON w.user_id = u.id
             WHERE f.status = 'accepted' AND (f.requester_id = ? OR f.receiver_id = ?)
             ${filter}
             ORDER BY u.full_name ASC`,
            params
        );
        return rows as any[];
    },

    // direction = 'received': lời mời gửi tới tôi; 'sent': lời mời tôi đã gửi
    async listPendingRequests(me: string, direction: 'received' | 'sent') {
        const myColumn = direction === 'received' ? 'f.receiver_id' : 'f.requester_id';
        const otherColumn = direction === 'received' ? 'f.requester_id' : 'f.receiver_id';
        const [rows] = await pool.execute(
            `SELECT f.id AS request_id, f.created_at,
                    u.id, u.full_name, u.avatar_url, COALESCE(w.level, 1) AS level
             FROM friendships f
             JOIN users u ON u.id = ${otherColumn}
             LEFT JOIN wallets w ON w.user_id = u.id
             WHERE ${myColumn} = ? AND f.status = 'pending'
             ORDER BY f.created_at DESC`,
            [me]
        );
        return rows as any[];
    },

    async countPendingReceived(me: string): Promise<number> {
        const [rows] = await pool.execute(
            `SELECT COUNT(*) AS total FROM friendships WHERE receiver_id = ? AND status = 'pending'`,
            [me]
        );
        return Number((rows as any[])[0]?.total || 0);
    },

    // =====================================================================
    // CONVERSATIONS
    // =====================================================================
    async findConversationById(id: string): Promise<IConversation | null> {
        const [rows] = await pool.execute(
            `SELECT id, user1_id, user2_id, last_message_at, created_at FROM conversations WHERE id = ? LIMIT 1`,
            [id]
        );
        return ((rows as any[])[0] as IConversation | undefined) ?? null;
    },

    async findConversationByPair(userA: string, userB: string): Promise<IConversation | null> {
        const [u1, u2] = orderUserPair(userA, userB);
        const [rows] = await pool.execute(
            `SELECT id, user1_id, user2_id, last_message_at, created_at
             FROM conversations WHERE user1_id = ? AND user2_id = ? LIMIT 1`,
            [u1, u2]
        );
        return ((rows as any[])[0] as IConversation | undefined) ?? null;
    },

    async createConversation(userA: string, userB: string): Promise<string> {
        const [u1, u2] = orderUserPair(userA, userB);
        const id = uuidv4();
        await pool.execute(`INSERT INTO conversations (id, user1_id, user2_id) VALUES (?, ?, ?)`, [id, u1, u2]);
        return id;
    },

    // Danh sách hội thoại của tôi (chỉ với những người vẫn đang là bạn), kèm tin cuối + số tin chưa đọc
    async listConversations(me: string) {
        const [rows] = await pool.execute(
            `SELECT c.id, c.last_message_at,
                    u.id AS friend_id, u.full_name AS friend_name, u.avatar_url AS friend_avatar,
                    lm.id AS last_id, lm.content AS last_content, lm.sender_id AS last_sender_id,
                    lm.created_at AS last_created_at, lm.is_read AS last_is_read,
                    (SELECT COUNT(*) FROM messages m
                      WHERE m.conversation_id = c.id AND m.sender_id <> ? AND m.is_read = FALSE) AS unread_count
             FROM conversations c
             JOIN users u ON u.id = IF(c.user1_id = ?, c.user2_id, c.user1_id)
             JOIN friendships f ON f.pair_key = CONCAT(c.user1_id, ':', c.user2_id) AND f.status = 'accepted'
             LEFT JOIN messages lm ON lm.id = (SELECT MAX(id) FROM messages WHERE conversation_id = c.id)
             WHERE c.user1_id = ? OR c.user2_id = ?
             ORDER BY (c.last_message_at IS NULL) ASC, c.last_message_at DESC, c.created_at DESC`,
            [me, me, me, me]
        );
        return rows as any[];
    },

    // =====================================================================
    // MESSAGES
    // =====================================================================
    // Cursor-based: lấy `limit` tin cũ hơn `cursor` (id), mới nhất trước. Lấy dư 1 bản ghi để biết còn trang tiếp không.
    async getMessagesPage(conversationId: string, cursor: number | null, limit: number): Promise<{ messages: IMessage[]; hasMore: boolean }> {
        const params: any[] = [conversationId];
        let cursorFilter = '';
        if (cursor !== null) {
            cursorFilter = 'AND id < ?';
            params.push(String(cursor));
        }
        params.push(String(limit + 1));
        const [rows] = await pool.execute(
            `SELECT id, conversation_id, sender_id, content, is_read, read_at, created_at
             FROM messages
             WHERE conversation_id = ? ${cursorFilter}
             ORDER BY id DESC
             LIMIT ?`,
            params
        );
        const list = (rows as any[]).map(mapMessage);
        const hasMore = list.length > limit;
        return { messages: hasMore ? list.slice(0, limit) : list, hasMore };
    },

    // Ghi tin nhắn + cập nhật last_message_at trong 1 transaction
    async insertMessage(conversationId: string, senderId: string, content: string): Promise<IMessage> {
        const connection: PoolConnection = await pool.getConnection();
        try {
            await connection.beginTransaction();
            const [result] = await connection.execute(
                `INSERT INTO messages (conversation_id, sender_id, content) VALUES (?, ?, ?)`,
                [conversationId, senderId, content]
            );
            const insertId = Number((result as any).insertId);
            await connection.execute(
                `UPDATE conversations
                 SET last_message_at = (SELECT created_at FROM messages WHERE id = ?)
                 WHERE id = ?`,
                [String(insertId), conversationId]
            );
            const [rows] = await connection.execute(
                `SELECT id, conversation_id, sender_id, content, is_read, read_at, created_at FROM messages WHERE id = ?`,
                [String(insertId)]
            );
            await connection.commit();
            return mapMessage((rows as any[])[0]);
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    },

    // Đánh dấu đã đọc mọi tin của người kia trong hội thoại. Trả về số tin được cập nhật.
    async markConversationRead(conversationId: string, readerId: string): Promise<number> {
        const [result] = await pool.execute(
            `UPDATE messages SET is_read = TRUE, read_at = CURRENT_TIMESTAMP(3)
             WHERE conversation_id = ? AND sender_id <> ? AND is_read = FALSE`,
            [conversationId, readerId]
        );
        return Number((result as any).affectedRows || 0);
    },

    async countUnreadMessages(me: string): Promise<number> {
        const [rows] = await pool.execute(
            `SELECT COUNT(*) AS total
             FROM messages m
             JOIN conversations c ON c.id = m.conversation_id
             WHERE (c.user1_id = ? OR c.user2_id = ?) AND m.sender_id <> ? AND m.is_read = FALSE`,
            [me, me, me]
        );
        return Number((rows as any[])[0]?.total || 0);
    },
};
