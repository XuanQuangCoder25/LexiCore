import { useState } from "react";
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
import { ExamView } from "./components/dashboard/ExamView";
import { NotificationPopover } from "./components/global/NotificationPopover";
import { FriendsPanel } from "./components/global/FriendsPanel";
import { Button } from "./components/ui/button";
import { Badge } from "./components/ui/badge";
import { Coins, Users } from "lucide-react";

const TAB_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  courses: "Courses",
  flashcards: "Flashcards",
  shadowing: "Shadowing",
  practice: "Practice",
  exam: "Exam",
  arena: "PvP Arena",
  community: "Community",
  creator: "Creator Studio",
  store: "Store",
  achievements: "Achievements",
};

export default function App() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [friendsOpen, setFriendsOpen] = useState(false);
  const [coins] = useState(1250);

  const handleChallenge = () => {
    setFriendsOpen(false);
    setActiveTab("arena");
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
      case "creator": return <CreatorStudioView />;
      case "store": return <StoreView />;
      case "achievements": return <AchievementsView />;
      default: return <DashboardView />;
    }
  };

  return (
    <SidebarProvider>
      {/* MARKER-MAKE-KIT-INVOKED */}
      <div className="flex h-screen w-full overflow-hidden">
        <AppSidebar activeTab={activeTab} onTabChange={setActiveTab} coins={coins} />
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
                <Coins className="h-4 w-4 text-amber-500" />
                <span className="text-sm font-bold">{coins.toLocaleString()}</span>
              </div>
              {/* Friends Button */}
              <Button variant="ghost" size="sm" onClick={() => setFriendsOpen(true)} className="relative">
                <Users className="h-5 w-5" />
                <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-green-500 text-white text-xs flex items-center justify-center font-bold">3</span>
              </Button>
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
      />
    </SidebarProvider>
  );
}
