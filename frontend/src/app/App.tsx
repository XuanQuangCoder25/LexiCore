import { useState, useEffect } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "./components/ui/sidebar";
import { AppSidebar } from "./components/AppSidebar";
import { DashboardView } from "./components/dashboard/DashboardView";
import { CoursesView } from "./components/dashboard/CoursesView";
import { FlashcardsView } from "./components/dashboard/FlashcardsView";
import { ShadowingView } from "./components/dashboard/ShadowingView";
import { PracticeView } from "./components/dashboard/PracticeView";
import { CommunityView } from "./components/dashboard/CommunityView";
import { AchievementsView } from "./components/dashboard/AchievementsView";
import { ArenaView } from "./components/dashboard/ArenaView";
import { CreatorStudioView } from "./components/dashboard/CreatorStudioView";
import { StoreView } from "./components/dashboard/StoreView";
import { PrivateSpaceView } from "./components/dashboard/PrivateSpaceView";
import { AdminView } from "./components/dashboard/AdminEconomyView";
import { AdminDashboardView } from "./components/dashboard/AdminDashboardView";
import { AdminHRView } from "./components/dashboard/AdminHRView";
import { AdminArenaView } from "./components/dashboard/AdminArenaView";
import { AdminModerationView } from "./components/dashboard/AdminModerationView";
import { AdminMarketingView } from "./components/dashboard/AdminMarketingView";
import { ExamView } from "./components/dashboard/ExamView";
import { ProfileView } from "./components/dashboard/ProfileView";
import { SettingsView } from "./components/dashboard/SettingsView";
import { SubscriptionView } from "./components/dashboard/SubscriptionView";
import { NotificationPopover } from "./components/global/NotificationPopover";
import { FriendsPanel } from "./components/global/FriendsPanel";
import { FriendsButton } from "./components/global/FriendsButton";
import { FriendlyInviteToast } from "./components/dashboard/arena/FriendlyInviteToast";
import { FriendlyInviteModal } from "./components/dashboard/arena/FriendlyInviteModal";
import { MatchedPayload } from "./services/arena-socket.service";
import { ChatButton } from "./components/global/ChatButton";
import { ChatDialog } from "./components/global/ChatDialog";
import { SocialProvider, useSocial } from "./features/social/SocialContext";
import { Badge } from "./components/ui/badge";
import { CircleDollarSign, Flame, ShieldCheck } from "lucide-react";
import { MaintenancePage } from "./components/global/MaintenancePage";

const TAB_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  courses: "Courses",
  flashcards: "Flashcards",
  shadowing: "Shadowing",
  practice: "Practice",
  exam: "Exam",
  arena: "PvP Arena",
  community: "Community",
  "private-space": "Private Space",
  creator: "Creator Studio",
  store: "Store",
  achievements: "Achievements",
  admin: "Admin Panel",
  "admin-dashboard": "Admin Dashboard",
  "admin-hr": "Admin - Human Resources",
  "admin-economy": "Admin - Economy",
  "admin-moderation": "Admin - Moderation",
  "admin-marketing": "Admin - Marketing & Campaigns",
  "admin-arena": "Admin - Arena Words",
  profile: "Profile",
  settings: "Settings",
  subscription: "Gói Hội viên",
};

function AppContent() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const initialTab =
    (location.state as any)?.tab ||
    searchParams.get("tab") ||
    "dashboard";
  const [activeTab, setActiveTab] = useState(initialTab);
  const [friendsOpen, setFriendsOpen] = useState(false);
  const [coins, setCoins] = useState(0);
  const [userStreak, setUserStreak] = useState(0);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [creatorStatus, setCreatorStatus] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>("Guest");
  const [userId, setUserId] = useState<string | undefined>(undefined);
  const [userTier, setUserTier] = useState<"STARTER" | "PRO" | "ELITE" | null>(() => {
    return (localStorage.getItem("lexicore_user_tier") as any) || null;
  });
  const [pendingArenaMatch, setPendingArenaMatch] = useState<MatchedPayload | null>(null);
  const [initialArenaTab, setInitialArenaTab] = useState<"hub" | "history" | "leaderboard" | "analytics">("hub");
  const [isFriendlyModalOpen, setIsFriendlyModalOpen] = useState<boolean>(false);
  const [targetFriendForInvite, setTargetFriendForInvite] = useState<{ id: string; fullName: string; avatarUrl?: string | null } | null>(null);
  const [friendlyRestoreTick, setFriendlyRestoreTick] = useState<number>(0);
  const [maintenance, setMaintenance] = useState<{
    active: boolean;
    title?: string;
    message?: string;
    estimatedEnd?: string | null;
  }>({ active: false });

  // Kiểm tra tình trạng bảo trì hệ thống
  useEffect(() => {
    const checkSystemStatus = () => {
      fetch("/api/system/status")
        .then((res) => res.json())
        .then((data) => {
          if (data && data.success) {
            setMaintenance({
              active: Boolean(data.active),
              title: data.title,
              message: data.message,
              estimatedEnd: data.estimatedEnd,
            });
          }
        })
        .catch(() => {});
    };

    checkSystemStatus();
    const interval = setInterval(checkSystemStatus, 45000);
    return () => clearInterval(interval);
  }, []);

  // Sync tab khi location state hoặc search params thay đổi
  useEffect(() => {
    const tabFromState = (location.state as any)?.tab || searchParams.get("tab");
    if (tabFromState && TAB_LABELS[tabFromState]) {
      setActiveTab(tabFromState);
    }
  }, [location.state, searchParams]);


  const { isChatOpen, setIsChatOpen, openChatWithFriend } = useSocial();

  useEffect(() => {
    fetch("/api/auth/me", { credentials: "include" })
      .then((res) => {
        if (!res.ok) return null;
        return res.json();
      })
      .then((data) => {
        if (!data) return;
        if (data?.coin_balance !== undefined) setCoins(data.coin_balance);
        if (data?.current_streak !== undefined) setUserStreak(Number(data.current_streak || 0));
        if (data?.role) {
          const normalizedRole = data.role.toLowerCase();
          setUserRole(normalizedRole);
          localStorage.setItem("lexicore_user_role", normalizedRole);
        }
        const statusVal = data?.creator_status ?? null;
        setCreatorStatus(statusVal);
        localStorage.setItem("lexicore_creator_status", statusVal || "");
        if (data?.id) setUserId(data.id);
        if (data?.full_name) setUserName(data.full_name);
        if (data?.tier !== undefined) {
          setUserTier(data.tier);
          if (data.tier) localStorage.setItem("lexicore_user_tier", data.tier);
        }
      })
      .catch(() => { });
  }, []);

  // Lắng nghe sự kiện chuyển hướng tab toàn cục (ví dụ từ Chat chuyển sang Community)
  useEffect(() => {
    const handleNavigateTab = (e: any) => {
      if (e.detail?.arenaTab) {
        setInitialArenaTab(e.detail.arenaTab);
      }
      if (e.detail?.tab) {
        setActiveTab(e.detail.tab);
      }
    };
    const handleTierChange = (e: any) => {
      if (e.detail?.tier !== undefined) {
        setUserTier(e.detail.tier);
        if (e.detail.tier) localStorage.setItem("lexicore_user_tier", e.detail.tier);
        else localStorage.removeItem("lexicore_user_tier");
      }
    };
    const handleWalletChange = (e: any) => {
      if (e.detail?.coinBalance !== undefined) {
        setCoins(Number(e.detail.coinBalance));
      }
    };
    const handleOpenFriendlyInvite = () => {
      setTargetFriendForInvite(null);
      setFriendlyRestoreTick((prev) => prev + 1);
      setIsFriendlyModalOpen(true);
    };
    const handleChallengeUser = (e: any) => {
      const friend = e.detail;
      if (friend) {
        setTargetFriendForInvite({
          id: friend.id,
          fullName: friend.full_name || friend.fullName,
          avatarUrl: friend.avatar_url || friend.avatarUrl,
        });
      } else {
        setTargetFriendForInvite(null);
      }
      setFriendlyRestoreTick((prev) => prev + 1);
      setIsFriendlyModalOpen(true);
    };
    const handleCloseFriendlyInvite = () => {
      setIsFriendlyModalOpen(false);
    };
    window.addEventListener("navigate-tab", handleNavigateTab);
    window.addEventListener("membership-tier-change", handleTierChange);
    window.addEventListener("wallet-balance-change", handleWalletChange);
    window.addEventListener("arena:open_friendly_invite", handleOpenFriendlyInvite);
    window.addEventListener("arena:challenge_user", handleChallengeUser);
    window.addEventListener("arena:close_friendly_invite", handleCloseFriendlyInvite);
    return () => {
      window.removeEventListener("navigate-tab", handleNavigateTab);
      window.removeEventListener("membership-tier-change", handleTierChange);
      window.removeEventListener("wallet-balance-change", handleWalletChange);
      window.removeEventListener("arena:open_friendly_invite", handleOpenFriendlyInvite);
      window.removeEventListener("arena:challenge_user", handleChallengeUser);
      window.removeEventListener("arena:close_friendly_invite", handleCloseFriendlyInvite);
    };
  }, []);

  const handleChallenge = (friend?: any) => {
    setFriendsOpen(false);
    setIsChatOpen(false);
    setActiveTab("arena");
    if (friend) {
      setTargetFriendForInvite({
        id: friend.id,
        fullName: friend.full_name || friend.fullName,
        avatarUrl: friend.avatar_url || friend.avatarUrl,
      });
    } else {
      setTargetFriendForInvite(null);
    }
    setFriendlyRestoreTick((prev) => prev + 1);
    setIsFriendlyModalOpen(true);
  };

  const handleOpenChatWithFriend = (friend: { id: string; full_name: string; avatar_url: string | null }) => {
    setFriendsOpen(false);
    openChatWithFriend(friend);
  };

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard": return <DashboardView onNavigateTab={setActiveTab} userName={userName} />;
      case "courses": return <CoursesView />;
      case "flashcards": return <FlashcardsView />;
      case "shadowing": return <ShadowingView />;
      case "practice": return <PracticeView />;
      case "exam": return <ExamView />;
      case "arena": return (
        <ArenaView
          initialPendingMatch={pendingArenaMatch}
          onClearPendingMatch={() => setPendingArenaMatch(null)}
          initialTab={initialArenaTab}
          onConsumeInitialTab={() => setInitialArenaTab("hub")}
        />
      );
      case "community": return <CommunityView />;
      case "private-space": return <PrivateSpaceView onNavigateTab={setActiveTab} userRole={userRole || "user"} creatorStatus={creatorStatus} />;
      case "creator": return <CreatorStudioView onNavigateTab={setActiveTab} userRole={userRole || "user"} creatorStatus={creatorStatus} />;
      case "store": return <StoreView />;
      case "achievements": return <AchievementsView />;
      case "admin":
      case "admin-economy": return <AdminView />;
      case "admin-dashboard": return <AdminDashboardView />;
      case "admin-hr": return <AdminHRView />;
      case "admin-moderation": return <AdminModerationView />;
      case "admin-marketing": return <AdminMarketingView />;
      case "admin-arena": return <AdminArenaView />;
      case "profile": return <ProfileView />;
      case "settings": return <SettingsView onNavigateTab={setActiveTab} userRole={userRole || "user"} />;
      case "subscription": return <SubscriptionView />;
      default: return <DashboardView onNavigateTab={setActiveTab} userName={userName} />;
    }
  };

  if (maintenance.active && userRole !== "admin") {
    return (
      <MaintenancePage
        title={maintenance.title}
        message={maintenance.message}
        estimatedEnd={maintenance.estimatedEnd}
      />
    );
  }

  return (
    <SidebarProvider>
      {/* MARKER-MAKE-KIT-INVOKED */}
      <div className="flex h-screen w-full overflow-hidden">
        <AppSidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          coins={coins}
          isAdmin={userRole === "admin"}
          userName={userName}
          userRole={userRole || "user"}
          userTier={userTier}
        />
        <SidebarInset className="flex-1 overflow-hidden flex flex-col">
          {/* Top Header */}
          <header className="border-b px-6 py-3 flex items-center justify-between shrink-0 bg-background">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="h-8 w-8" />
              <div className="h-4 w-px bg-border" />
              <h2 className="font-semibold">{TAB_LABELS[activeTab]}</h2>
            </div>
            <div className="flex items-center gap-2">
              {/* Coins Balance */}
              <div className="flex items-center gap-1.5 bg-muted rounded-lg px-3 py-1.5">
                <CircleDollarSign className="h-4 w-4 text-emerald-600" />
                <span className="text-sm font-bold">{coins.toLocaleString()}</span>
              </div>
              {/* Friends Button */}
              <FriendsButton onClick={() => setFriendsOpen(true)} />
              {/* Chat Button */}
              <ChatButton onClick={() => setIsChatOpen(true)} />
              {/* Notifications */}
              <NotificationPopover />
              {/* User badge */}
              <Badge
                variant="secondary"
                className={`text-xs px-2.5 py-1 inline-flex items-center gap-1.5 font-medium ${
                  userTier === "ELITE"
                    ? "border border-amber-400/60 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                    : ""
                }`}
                title={
                  userTier === "ELITE"
                    ? "Chuỗi Streak được bảo vệ tự động bởi gói ELITE"
                    : "Chuỗi ngày học liên tục"
                }
              >
                <Flame className="w-3.5 h-3.5 shrink-0 text-zinc-900 dark:text-zinc-100" strokeWidth={1.75} />
                <span>{userStreak} day streak</span>
                {userTier === "ELITE" && (
                  <ShieldCheck className="w-3.5 h-3.5 shrink-0 text-amber-500" />
                )}
              </Badge>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 overflow-auto p-6">
            {renderContent()}
          </main>
        </SidebarInset>
      </div>

      <FriendsPanel
        open={friendsOpen}
        onClose={() => setFriendsOpen(false)}
        onChallenge={handleChallenge}
        onMessage={handleOpenChatWithFriend}
      />

      <ChatDialog
        open={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        onChallenge={handleChallenge}
      />

      {/* Thông báo thách đấu giao hữu trượt từ mép phải dưới header */}
      <FriendlyInviteToast
        onNavigateArena={() => setActiveTab("arena")}
        onAcceptMatched={(matchData) => {
          setPendingArenaMatch(matchData);
          setActiveTab("arena");
        }}
      />

      {/* Modal mời đấu giao hữu (render cấp App để toast thu nhỏ luôn tồn tại khi chuyển tab) */}
      <FriendlyInviteModal
        isOpen={isFriendlyModalOpen}
        onClose={() => {
          setIsFriendlyModalOpen(false);
          setTargetFriendForInvite(null);
        }}
        currentUserId={userId}
        initialTargetFriend={targetFriendForInvite}
        restoreTrigger={friendlyRestoreTick}
        onFriendlyMatched={(matchData) => {
          setPendingArenaMatch(matchData);
          setActiveTab("arena");
        }}
      />
    </SidebarProvider>
  );
}

export default function App() {
  return (
    <SocialProvider>
      <AppContent />
    </SocialProvider>
  );
}
