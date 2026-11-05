import { useState } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  SidebarSeparator,
} from "./ui/sidebar";
import {
  BookOpen,
  Users,
  BarChart3,
  Brain,
  Trophy,
  Settings,
  User,
  Youtube,
  Swords,
  Store,
  FileEdit,
  ClipboardList,
  Crown,
  CircleDollarSign,
  PieChart,
  ShieldAlert,
  Megaphone,
  FolderLock,
  BookMarked,
} from "lucide-react";
import { Badge } from "./ui/badge";
import { PremiumModal } from "./global/PremiumModal";

interface AppSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  coins: number;
  isAdmin: boolean;
  userName?: string;
  userRole?: string;
}

const navigationItems = [
  { id: "dashboard", title: "Dashboard", icon: BarChart3, description: "Overview & Progress" },
  { id: "courses", title: "Courses", icon: BookOpen, description: "Learning Paths" },
  { id: "flashcards", title: "Flashcards", icon: Brain, description: "Memory Training" },
  { id: "shadowing", title: "Shadowing", icon: Youtube, description: "YouTube Practice" },
  { id: "exam", title: "Exam", icon: ClipboardList, description: "Multimedia Tests" },
  { id: "arena", title: "PvP Arena", icon: Swords, description: "Battle Opponents" },
  { id: "community", title: "Community", icon: Users, description: "Connect & Share" },
  { id: "private-space", title: "Private Space", icon: FolderLock, description: "Personal Library" },
  { id: "creator", title: "Creator Studio", icon: FileEdit, description: "Build Decks" },
  { id: "store", title: "Store", icon: Store, description: "Spend Coins" },
  { id: "achievements", title: "Achievements", icon: Trophy, description: "Goals & Rewards" },
];

export function AppSidebar({ activeTab, onTabChange, coins, isAdmin, userName = "Guest", userRole = "user" }: AppSidebarProps) {
  const [premiumOpen, setPremiumOpen] = useState(false);

  return (
    <>
      <Sidebar className="overflow-x-hidden border-r">
        {/* ===== BRAND HEADER: LEXICORE ===== */}
        <SidebarHeader className="border-b px-4 py-3.5 shrink-0">
          <div className="flex items-center space-x-2">
            <div className="shrink-0 flex items-center justify-center">
              <img src="/assets/logo_whale.png" alt="LexiCore" className="h-12 w-12 object-contain" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-semibold text-base tracking-tight text-foreground leading-tight">LexiCore</span>
              <span className="text-[11px] text-muted-foreground font-medium truncate">AI-Powered Learning</span>
            </div>
          </div>
        </SidebarHeader>

        {/* ===== SIDEBAR CONTENT (scrollable) ===== */}
        <SidebarContent className="px-2.5 py-3 flex flex-col flex-1 overflow-x-hidden overflow-y-auto [scrollbar-width:thin] [scrollbar-color:hsl(var(--border))_transparent]">

          {/* ===== ADMIN HUB — hiện ở TRÊN CÙNG, chỉ khi là ADMIN ===== */}
          {isAdmin && (
            <div className="mb-2 pb-2 border-b shrink-0">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-1.5">ADMIN HUB</p>
              <SidebarMenu className="gap-1">
                {/* Dashboard */}
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => onTabChange("admin-dashboard")}
                    className={`w-full justify-start px-3 py-2 h-auto rounded-xl ${activeTab === "admin-dashboard" ? "bg-sidebar-accent text-sidebar-accent-foreground" : "hover:bg-sidebar-accent/50"}`}
                  >
                    <PieChart className="h-4 w-4 mr-2.5 shrink-0" />
                    <div className="flex flex-col items-start min-w-0 text-left">
                      <span className="font-medium text-xs">Dashboard</span>
                      <span className="text-[10px] text-muted-foreground">Tổng quan & Số liệu</span>
                    </div>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                {/* Human Resources */}
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => onTabChange("admin-hr")}
                    className={`w-full justify-start px-3 py-2 h-auto rounded-xl ${activeTab === "admin-hr" ? "bg-sidebar-accent text-sidebar-accent-foreground" : "hover:bg-sidebar-accent/50"}`}
                  >
                    <Users className="h-4 w-4 mr-2.5 shrink-0" />
                    <div className="flex flex-col items-start min-w-0 text-left">
                      <span className="font-medium text-xs">Human Resources</span>
                      <span className="text-[10px] text-muted-foreground">Quản lý User & Creator</span>
                    </div>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                {/* Economy */}
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => onTabChange("admin-economy")}
                    className={`w-full justify-start px-3 py-2 h-auto rounded-xl ${activeTab === "admin-economy" || activeTab === "admin" ? "bg-sidebar-accent text-sidebar-accent-foreground" : "hover:bg-sidebar-accent/50"}`}
                  >
                    <CircleDollarSign className="h-4 w-4 mr-2.5 shrink-0" />
                    <div className="flex flex-col items-start min-w-0 text-left">
                      <span className="font-medium text-xs">Economy</span>
                      <span className="text-[10px] text-muted-foreground">Cửa hàng & Gamification</span>
                    </div>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                {/* Moderation */}
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => onTabChange("admin-moderation")}
                    className={`w-full justify-start px-3 py-2 h-auto rounded-xl ${activeTab === "admin-moderation" ? "bg-sidebar-accent text-sidebar-accent-foreground" : "hover:bg-sidebar-accent/50"}`}
                  >
                    <ShieldAlert className="h-4 w-4 mr-2.5 shrink-0" />
                    <div className="flex flex-col items-start min-w-0 text-left">
                      <span className="font-medium text-xs">Moderation</span>
                      <span className="text-[10px] text-muted-foreground">Kiểm duyệt & Report</span>
                    </div>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                {/* Marketing & Campaigns */}
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => onTabChange("admin-marketing")}
                    className={`w-full justify-start px-3 py-2 h-auto rounded-xl ${activeTab === "admin-marketing" ? "bg-sidebar-accent text-sidebar-accent-foreground" : "hover:bg-sidebar-accent/50"}`}
                  >
                    <Megaphone className="h-4 w-4 mr-2.5 shrink-0" />
                    <div className="flex flex-col items-start min-w-0 text-left">
                      <span className="font-medium text-xs">Marketing</span>
                      <span className="text-[10px] text-muted-foreground">Sự kiện & Chiến dịch</span>
                    </div>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                {/* Arena Words */}
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => onTabChange("admin-arena")}
                    className={`w-full justify-start px-3 py-2 h-auto rounded-xl ${activeTab === "admin-arena" ? "bg-sidebar-accent text-sidebar-accent-foreground" : "hover:bg-sidebar-accent/50"}`}
                  >
                    <BookMarked className="h-4 w-4 mr-2.5 shrink-0" />
                    <div className="flex flex-col items-start min-w-0 text-left">
                      <span className="font-medium text-xs">Arena Words</span>
                      <span className="text-[10px] text-muted-foreground">Từ vựng PvP Arena</span>
                    </div>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </div>
          )}

          {/* ===== MAIN NAVIGATION MENU ===== */}
          <div className="flex-1">
            <SidebarMenu className="gap-1 py-0.5">
              {navigationItems.map((item) => {
                const IconComponent = item.icon;
                const isActive = activeTab === item.id;

                return (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      onClick={() => onTabChange(item.id)}
                      className={`w-full justify-start px-3 py-2 h-auto rounded-xl transition-all duration-150 ${isActive
                        ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium shadow-xs"
                        : "hover:bg-sidebar-accent/50 text-foreground/80 hover:text-foreground"
                        }`}
                    >
                      <IconComponent className="h-4 w-4 mr-2.5 shrink-0 opacity-80" />
                      <div className="flex flex-col items-start min-w-0 text-left">
                        <span className="font-medium text-[13.5px] leading-snug">{item.title}</span>
                        <span className="text-[11px] text-muted-foreground leading-tight truncate">{item.description}</span>
                      </div>
                      {item.id === "arena" && (
                        <Badge variant="secondary" className="ml-auto text-[10px] px-1.5 py-0 font-semibold tracking-wider shrink-0 bg-[#99B6D2]/20 text-[#151515] border-none">NEW</Badge>
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </div>

          {/* ===== BOTTOM WIDGETS: DAILY GOAL & COINS ===== */}
          <div className="mt-3 pt-3 border-t space-y-2 shrink-0">
            {/* Daily Goal */}
            <div className="rounded-xl border bg-card/60 p-2.5 space-y-1.5 shadow-2xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Trophy className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs font-medium">Daily Goal</span>
                </div>
                <span className="text-xs text-muted-foreground font-medium">1/2</span>
              </div>
              <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                <div className="bg-[#151515] h-1.5 rounded-full transition-all duration-300" style={{ width: "60%" }} />
              </div>
              <p className="text-[11px] text-muted-foreground leading-tight">Complete 2 lessons today</p>
            </div>

            {/* Coins Display */}
            <div className="rounded-xl border bg-card/60 p-2.5 flex items-center justify-between shadow-2xs">
              <div className="flex items-center gap-2">
                <CircleDollarSign className="h-4 w-4 text-emerald-600 shrink-0" />
                <span className="text-xs text-muted-foreground font-medium">Total Balance</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-sm font-bold text-foreground">{coins.toLocaleString()}</span>
                <span className="text-[10px] text-muted-foreground uppercase font-semibold">coins</span>
              </div>
            </div>
          </div>
        </SidebarContent>

        {/* ===== SIDEBAR FOOTER ===== */}
        <SidebarFooter className="border-t p-3 space-y-1.5 shrink-0 overflow-hidden">
          {/* Premium Badge */}
          <button
            onClick={() => setPremiumOpen(true)}
            className="w-full flex items-center gap-2.5 p-2 rounded-xl border border-dashed hover:bg-muted/60 transition-colors text-left"
          >
            <Crown className="h-4 w-4 text-amber-500 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium leading-tight">Free Plan</p>
              <p className="text-[11px] text-muted-foreground truncate leading-tight">Upgrade to Pro</p>
            </div>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-semibold tracking-wider shrink-0 bg-amber-500/10 text-amber-700 border-amber-500/20">PRO</Badge>
          </button>

          <SidebarMenu className="gap-1">
            <SidebarMenuItem>
              <SidebarMenuButton className="w-full justify-start rounded-xl px-2.5 py-2" onClick={() => onTabChange("profile")}>
                <User className="h-4 w-4 mr-2.5 shrink-0 opacity-80" />
                <div className="flex flex-col items-start min-w-0 text-left">
                  <span className="text-xs font-medium truncate">{userName}</span>
                  <span className="text-[10px] text-muted-foreground capitalize leading-tight">{userRole}</span>
                </div>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                className={`w-full justify-start rounded-xl px-2.5 py-2 ${activeTab === "settings" ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" : "hover:bg-sidebar-accent/50"}`}
                onClick={() => onTabChange("settings")}
              >
                <Settings className="h-4 w-4 mr-2.5 shrink-0 opacity-80" />
                <span className="text-xs font-medium">Settings</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>

      <PremiumModal open={premiumOpen} onClose={() => setPremiumOpen(false)} />
    </>
  );
}

export default AppSidebar;
