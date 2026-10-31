/**
 * Bản ghi bảng `messages` (MySQL).
 * id là BIGINT tăng dần nên mysql2 có thể trả về number hoặc string tuỳ cấu hình;
 * dùng làm cursor phân trang: WHERE id < :cursor ORDER BY id DESC LIMIT n.
 */
export interface IMessage {
  id: number | string;
  conversation_id: string;
  sender_id: string;
  content: string;
  is_read: boolean;
  read_at?: Date | null;
  created_at?: Date;
}

export const MESSAGE_MAX_LENGTH = 2000;
