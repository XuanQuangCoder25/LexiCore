export interface ActiveSession {
  id: string;
  device: string;
  browser: string;
  location: string;
  ip: string;
  lastActive: string;
  isCurrent: boolean;
}

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
  twoFactorEnabled: boolean;
  activeSessions: ActiveSession[];

  // Learning Preferences
  dailyGoalMinutes: number;
  srsNewCardsPerDay: number;
  srsAutoPlayAudio: boolean;
  srsAudioSpeed: number;
  srsAccent: "en-US" | "en-GB";
  shadowingBilingual: boolean;
  shadowingAutoPause: boolean;
  micSensitivity: number;

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
  language: "vi" | "en";
  fontSize: "small" | "medium" | "large";
  reduceMotion: boolean;

  // Billing & Wallet
  currentPlan: "free" | "pro";
  planExpiryDate: string;
  coinsBalance: number;
  billingHistory: BillingHistoryItem[];

  // Creator Settings
  creatorDisplayName: string;
  creatorHeadline: string;
  creatorBio: string;
  creatorWebsite: string;
  creatorYoutube: string;
  notifyCourseReviews: boolean;
  notifyExamCompletions: boolean;
}

export const initialSettingsMock: SettingsState = {
  // Account & Security
  email: "sergioramos@lexicore.edu.vn",
  isEmailVerified: true,
  twoFactorEnabled: false,
  activeSessions: [
    {
      id: "sess_1",
      device: "Windows PC (Desktop)",
      browser: "Chrome 124.0",
      location: "Hà Nội, Việt Nam",
      ip: "118.70.192.45",
      lastActive: "Đang hoạt động",
      isCurrent: true,
    },
    {
      id: "sess_2",
      device: "iPhone 15 Pro",
      browser: "Safari Mobile",
      location: "TP. Hồ Chí Minh, Việt Nam",
      ip: "14.161.22.8",
      lastActive: "2 giờ trước",
      isCurrent: false,
    },
    {
      id: "sess_3",
      device: "MacBook Air M2",
      browser: "Arc Browser",
      location: "Đà Nẵng, Việt Nam",
      ip: "27.72.61.109",
      lastActive: "3 ngày trước",
      isCurrent: false,
    },
  ],

  // Learning Preferences
  dailyGoalMinutes: 30,
  srsNewCardsPerDay: 20,
  srsAutoPlayAudio: true,
  srsAudioSpeed: 1.0,
  srsAccent: "en-US",
  shadowingBilingual: true,
  shadowingAutoPause: true,
  micSensitivity: 75,

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
  language: "vi",
  fontSize: "medium",
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

  // Creator Settings
  creatorDisplayName: "Sergio Ramos",
  creatorHeadline: "IELTS 8.5 & Giảng viên Ngữ âm Anh - Mỹ",
  creatorBio: "Đam mê chia sẻ phương pháp phản xạ tự nhiên và phương pháp học từ vựng Spaced Repetition cho người mới bắt đầu.",
  creatorWebsite: "https://lexicore.edu.vn/creators/sergioramos",
  creatorYoutube: "https://youtube.com/@SergioEnglishOfficial",
  notifyCourseReviews: true,
  notifyExamCompletions: true,
};
