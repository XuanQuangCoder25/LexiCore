export type FriendshipStatus = 'pending' | 'accepted' | 'rejected' | 'blocked';

/**
 * Bản ghi bảng `friendships` (MySQL).
 * Với status 'blocked', requester_id là người thực hiện chặn.
 */
export interface IFriendship {
  id: string;
  requester_id: string;
  receiver_id: string;
  pair_key: string; // "<id nhỏ>:<id lớn>" - chặn trùng quan hệ hai chiều
  status: FriendshipStatus;
  created_at?: Date;
  updated_at?: Date;
}

/** Tạo pair_key chuẩn hoá, không phụ thuộc chiều lời mời. */
export function buildPairKey(userA: string, userB: string): string {
  return userA < userB ? `${userA}:${userB}` : `${userB}:${userA}`;
}
