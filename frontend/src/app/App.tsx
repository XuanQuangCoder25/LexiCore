import { useState, useEffect } from "react";
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
import { AdminModerationView } from "./components/dashboard/AdminModerationView";
import { AdminMarketingView } from "./components/dashboard/AdminMarketingView";
import { ExamView } from "./components/dashboard/ExamView";
import { ProfileView } from "./components/dashboard/ProfileView";
import { SettingsView } from "./components/dashboard/SettingsView";
import { NotificationPopover } from "./components/global/NotificationPopover";
import { FriendsPanel } from "./components/global/FriendsPanel";
import { FriendsButton } from "./components/global/FriendsButton";
import { ChatButton } from "./components/global/ChatButton";
import { ChatDialog } from "./components/global/ChatDialog";
import { SocialProvider, useSocial } from "./features/social/SocialContext";
import { Badge } from "./components/ui/badge";
import { CircleDollarSign } from "lucide-react";

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
  profile: "Profile",
  settings: "Settings",
};

function AppContent() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [friendsOpen, setFriendsOpen] = useState(false);
  const [coins, setCoins] = useState(0);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>("Guest");

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
        if (data?.role) setUserRole(data.role.toLowerCase());
        if (data?.full_name) setUserName(data.full_name);
      })
      .catch(() => { });
  }, []);

  const handleChallenge = () => {
    setFriendsOpen(false);
    setIsChatOpen(false);
    setActiveTab("arena");
  };

  const handleOpenChatWithFriend = (friend: { id: string; full_name: string; avatar_url: string | null }) => {
    setFriendsOpen(false);
    openChatWithFriend(friend);
  };

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard": return <DashboardView />;
      case "courses": return <CoursesView />;
      case "flashcards": return <FlashcardsView />;
      case "shadowing": return <ShadowingView />;
      case "practice": return <PracticeView />;
      case "exam": return <ExamView />;
      case "arena": return <ArenaView />;
      case "community": return <CommunityView />;
      case "private-space": return <PrivateSpaceView onNavigateTab={setActiveTab} userRole={userRole || "user"} />;
      case "creator": return <CreatorStudioView onNavigateTab={setActiveTab} userRole={userRole || "user"} />;
      case "store": return <StoreView />;
      case "achievements": return <AchievementsView />;
      case "admin":
      case "admin-economy": return <AdminView />;
      case "admin-dashboard": return <AdminDashboardView />;
      case "admin-hr": return <AdminHRView />;
      case "admin-moderation": return <AdminModerationView />;
      case "admin-marketing": return <AdminMarketingView />;
      case "profile": return <ProfileView />;
      case "settings": return <SettingsView onNavigateTab={setActiveTab} userRole={userRole || "user"} />;
      default: return <DashboardView />;
    }
  };

  return (
    <SidebarProvider>
      {/* MARKER-MAKE-KIT-INVOKED */}
      <div className="flex h-screen w-full overflow-hidden">
        <AppSidebar activeTab={activeTab} onTabChange={setActiveTab} coins={coins} isAdmin={userRole === "admin"} userName={userName} userRole={userRole || "user"} />
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
              <Badge variant="secondary" className="text-xs px-2 py-1">
                🔥 7 day streak
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
