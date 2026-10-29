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
        <SidebarHeader className="border-b px-4 py-3.5">
          <div className="flex items-center space-x-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#151515] text-white shadow-sm ring-1 ring-black/10 shrink-0">
              {/* LexiCore Crystal Logo Icon */}
              <svg className="h-5 w-5" viewBox="0 0 16 16" fill="none">
                <path d="M8 1.5L14 5V11L8 14.5L2 11V5L8 1.5Z" stroke="#99B6D2" strokeWidth="1.2" fill="rgba(153,182,210,0.18)" />
                <circle cx="8" cy="8" r="2.2" fill="#FFFFFF" />
                <path d="M8 1.5V5.8M8 10.2V14.5M2 5L5.8 6.9M10.2 9.1L14 11M14 5L10.2 6.9M5.8 9.1L2 11" stroke="#99B6D2" strokeWidth="0.8" strokeOpacity="0.8" />
              </svg>
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-semibold text-base tracking-tight text-foreground leading-tight">LexiCore</span>
              <span className="text-[11px] text-muted-foreground font-medium truncate">AI-Powered Learning</span>
            </div>
          </div>
        </SidebarHeader>

        {/* ===== SIDEBAR CONTENT (NO SCROLLBARS, BALANCED DISTRIBUTION) ===== */}
        <SidebarContent className="px-2.5 py-3 flex flex-col flex-1 justify-between overflow-x-hidden overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {/* Main Navigation Menu - Evenly spaced across available height */}
          <div className="flex-1 flex flex-col min-h-0">
            <SidebarMenu className="flex-1 flex flex-col justify-between py-0.5 gap-1 min-h-0">
              {navigationItems.map((item) => {
                const IconComponent = item.icon;
                const isActive = activeTab === item.id;

                return (
                  <SidebarMenuItem key={item.id} className="flex-1 flex items-center min-h-[38px]">
                    <SidebarMenuButton
                      onClick={() => onTabChange(item.id)}
                      className={`w-full justify-start px-3 py-2 h-full rounded-xl transition-all duration-150 ${isActive
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

            {/* Admin Section — chỉ hiện khi là ADMIN */}
            {isAdmin && (
              <div className="mt-2 pt-2 border-t">
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
                        <span className="text-[10px] text-muted-foreground">Tổng quan &amp; Số liệu</span>
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
                        <span className="text-[10px] text-muted-foreground">Quản lý User &amp; Creator</span>
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
                        <span className="text-[10px] text-muted-foreground">Cửa hàng &amp; Gamification</span>
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
                        <span className="text-[10px] text-muted-foreground">Kiểm duyệt &amp; Report</span>
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
                        <span className="text-[10px] text-muted-foreground">Sự kiện &amp; Chiến dịch</span>
                      </div>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </div>
            )}
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
