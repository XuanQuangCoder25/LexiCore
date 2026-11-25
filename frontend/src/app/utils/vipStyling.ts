export type VipTier = 'FREE' | 'STARTER' | 'PRO' | 'ELITE' | string | null | undefined;

function normalizeTier(tier?: VipTier): 'FREE' | 'STARTER' | 'PRO' | 'ELITE' {
  const upper = String(tier || 'FREE').toUpperCase().trim();
  if (upper === 'ELITE') return 'ELITE';
  if (upper === 'PRO') return 'PRO';
  if (upper === 'STARTER') return 'STARTER';
  return 'FREE';
}

// Trả về class gradient chữ cho tên người dùng theo tier (chỉ áp dụng PRO và ELITE)
export function getNameGradientClass(tier?: VipTier): string {
  switch (normalizeTier(tier)) {
    case 'PRO':
      // Xanh Dương Đại Dương (Ocean Blue)
      return 'bg-gradient-to-r from-sky-400 via-blue-500 to-indigo-600 bg-clip-text text-transparent font-bold';
    case 'ELITE':
      // Vàng Kim Hoàng Gia (Royal Gold)
      return 'bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-600 bg-clip-text text-transparent font-bold drop-shadow-sm';
    default:
      return '';
  }
}

// Trả về class khung viền Avatar mạ vàng phát sáng độc quyền cho gói ELITE
export function getEliteAvatarFrameClass(tier?: VipTier): string {
  if (normalizeTier(tier) === 'ELITE') {
    return 'ring-2 ring-amber-400 border-amber-300 shadow-[0_0_16px_rgba(251,191,36,0.55)]';
  }
  return '';
}

// Trả về class làm nổi bật nhẹ dòng bảng xếp hạng của hội viên ELITE
export function getEliteRowHighlightClass(tier?: VipTier): string {
  if (normalizeTier(tier) === 'ELITE') {
    return 'bg-amber-500/5 hover:bg-amber-500/10';
  }
  return '';
}

// Trả về nhãn VIP ngắn gọn cho gói PRO / ELITE (trả về null với FREE / STARTER)
export function getVipBadgeLabel(tier?: VipTier): 'PRO' | 'ELITE' | null {
  const normalized = normalizeTier(tier);
  if (normalized === 'PRO' || normalized === 'ELITE') return normalized;
  return null;
}
