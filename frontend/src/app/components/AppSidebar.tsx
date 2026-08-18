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
  Zap,
  Swords,
  ShoppingBag,
  FileEdit,
  ClipboardList,
  Crown,
  Coins,
} from "lucide-react";
import { Badge } from "./ui/badge";
import { PremiumModal } from "./global/PremiumModal";

interface AppSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  coins: number;
}

const navigationItems = [
  { id: "dashboard", title: "Dashboard", icon: BarChart3, description: "Overview & Progress" },
  { id: "courses", title: "Courses", icon: BookOpen, description: "Learning Paths" },
  { id: "flashcards", title: "Flashcards", icon: Brain, description: "Memory Training" },
  { id: "shadowing", title: "Shadowing", icon: Youtube, description: "YouTube Practice" },
  { id: "practice", title: "Practice", icon: Zap, description: "Interactive Tools" },
  { id: "exam", title: "Exam", icon: ClipboardList, description: "Multimedia Tests" },
  { id: "arena", title: "PvP Arena", icon: Swords, description: "Battle Opponents" },
  { id: "community", title: "Community", icon: Users, description: "Connect & Share" },
  { id: "creator", title: "Creator Studio", icon: FileEdit, description: "Build Decks" },
  { id: "store", title: "Store", icon: ShoppingBag, description: "Spend Coins" },
  { id: "achievements", title: "Achievements", icon: Trophy, description: "Goals & Rewards" },
];

export function AppSidebar({ activeTab, onTabChange, coins }: AppSidebarProps) {
  const [premiumOpen, setPremiumOpen] = useState(false);

  return (
    <>
      <Sidebar>
        <SidebarHeader className="border-b p-4">
          <div className="flex items-center space-x-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground">
              <span className="text-background font-bold text-sm">EL</span>
            </div>
            <div>
              <div className="font-semibold">EnglishLearn</div>
              <div className="text-xs text-muted-foreground">Learn smarter, faster</div>
            </div>
          </div>
        </SidebarHeader>

        <SidebarContent className="p-2">
          <SidebarMenu>
            {navigationItems.map((item) => {
              const IconComponent = item.icon;
              const isActive = activeTab === item.id;

              return (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    onClick={() => onTabChange(item.id)}
                    className={`w-full justify-start p-3 h-auto ${
                      isActive
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "hover:bg-sidebar-accent/50"
                    }`}
                  >
                    <IconComponent className="h-4 w-4 mr-3 shrink-0" />
                    <div className="flex flex-col items-start min-w-0">
                      <span className="font-medium text-sm">{item.title}</span>
                      <span className="text-xs text-muted-foreground">{item.description}</span>
                    </div>
                    {item.id === "arena" && (
                      <Badge variant="secondary" className="ml-auto text-xs shrink-0">NEW</Badge>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>

          <SidebarSeparator className="my-3" />

          {/* Daily Goal */}
          <div className="p-2">
            <div className="rounded-lg border p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Trophy className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs font-medium">Daily Goal</span>
                </div>
                <span className="text-xs text-muted-foreground">1/2</span>
              </div>
              <div className="w-full bg-muted rounded-full h-1.5">
                <div className="bg-foreground h-1.5 rounded-full" style={{ width: "60%" }} />
              </div>
              <p className="text-xs text-muted-foreground">Complete 2 lessons today</p>
            </div>
          </div>

          {/* Coins Display */}
          <div className="p-2">
            <div className="rounded-lg border p-3 flex items-center gap-2">
              <Coins className="h-4 w-4 text-amber-500" />
              <span className="text-sm font-bold">{coins.toLocaleString()}</span>
              <span className="text-xs text-muted-foreground">coins</span>
            </div>
          </div>
        </SidebarContent>

        <SidebarFooter className="border-t p-3 space-y-1">
          {/* Premium Badge */}
          <button
            onClick={() => setPremiumOpen(true)}
            className="w-full flex items-center gap-2 p-2 rounded-lg border border-dashed hover:bg-muted/50 transition-colors text-left"
          >
            <Crown className="h-4 w-4 text-muted-foreground" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium">Free Plan</p>
              <p className="text-xs text-muted-foreground truncate">Upgrade to Pro</p>
            </div>
            <Badge variant="outline" className="text-xs shrink-0">PRO</Badge>
          </button>

          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton className="w-full justify-start">
                <User className="h-4 w-4 mr-3" />
                <div className="flex flex-col items-start">
                  <span className="text-sm font-medium">Sarah Johnson</span>
                  <span className="text-xs text-muted-foreground">Intermediate · B2</span>
                </div>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton className="w-full justify-start">
                <Settings className="h-4 w-4 mr-3" />
                <span className="text-sm">Settings</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>

      <PremiumModal open={premiumOpen} onClose={() => setPremiumOpen(false)} />
    </>
  );
}
