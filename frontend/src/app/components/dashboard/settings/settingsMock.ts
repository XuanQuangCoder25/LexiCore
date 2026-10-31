export interface BillingHistoryItem {
  id: string;
  date: string;
  description: string;
  amount: string;
  status: "Completed" | "Pending" | "Failed";
  receiptUrl?: string;
}

export interface SettingsState {
  // Account & Security
  email: string;
  isEmailVerified: boolean;

  // Notifications
  streakReminderEnabled: boolean;
  streakReminderTime: string;
  emailWeeklyDigest: boolean;
  emailNewCourses: boolean;
  emailPromotions: boolean;
  pushPvPChallenges: boolean;
  pushDueCards: boolean;
  pushExamGraded: boolean;
  soundEffectsEnabled: boolean;

  // Appearance
  theme: "light" | "dark" | "system";
  reduceMotion: boolean;

  // Billing & Wallet
  currentPlan: "free" | "pro";
  planExpiryDate: string;
  coinsBalance: number;
  billingHistory: BillingHistoryItem[];
}

export const initialSettingsMock: SettingsState = {
  // Account & Security
  email: "sergioramos@lexicore.edu.vn",
  isEmailVerified: true,

  // Notifications
  streakReminderEnabled: true,
  streakReminderTime: "20:00",
  emailWeeklyDigest: true,
  emailNewCourses: true,
  emailPromotions: false,
  pushPvPChallenges: true,
  pushDueCards: true,
  pushExamGraded: true,
  soundEffectsEnabled: true,

  // Appearance
  theme: "system",
  reduceMotion: false,

  // Billing & Wallet
  currentPlan: "free",
  planExpiryDate: "Không thời hạn",
  coinsBalance: 1000,
  billingHistory: [
    {
      id: "inv_1001",
      date: "10/10/2026",
      description: "Thưởng chuỗi 7 ngày Streak",
      amount: "+100 Coins",
      status: "Completed",
    },
    {
      id: "inv_1002",
      date: "05/10/2026",
      description: "Đổi vật phẩm Avatar Frame",
      amount: "-300 Coins",
      status: "Completed",
    },
    {
      id: "inv_1003",
      date: "01/10/2026",
      description: "Nạp gói Tân Thủ 1,200 Coins",
      amount: "49,000₫",
      status: "Completed",
    },
  ],
};
