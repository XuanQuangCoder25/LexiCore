/**
 * Bản ghi bảng `conversations` (MySQL) - phòng chat 1-1.
 * Luôn lưu user1_id < user2_id (dùng orderUserPair) để mỗi cặp user chỉ có đúng 1 phòng.
 */
export interface IConversation {
  id: string;
  user1_id: string;
  user2_id: string;
  last_message_at?: Date | null;
  created_at?: Date;
}

/** Chuẩn hoá thứ tự cặp user trước khi tìm/tạo conversation. */
export function orderUserPair(userA: string, userB: string): [string, string] {
  return userA < userB ? [userA, userB] : [userB, userA];
}
