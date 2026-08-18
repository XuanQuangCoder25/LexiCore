import { Sheet, SheetContent, SheetHeader, SheetTitle } from "../ui/sheet";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Avatar, AvatarFallback } from "../ui/avatar";
import { Separator } from "../ui/separator";
import { Input } from "../ui/input";
import {
  Swords,
  Flame,
  Search,
  UserPlus,
  Circle,
} from "lucide-react";

interface FriendsPanelProps {
  open: boolean;
  onClose: () => void;
  onChallenge: () => void;
}

const friends = [
  { id: 1, name: "Alex Kim", initials: "AK", level: "B2", streak: 12, rating: 1450, isOnline: true },
  { id: 2, name: "Maria Santos", initials: "MS", level: "C1", streak: 25, rating: 1680, isOnline: true },
  { id: 3, name: "Jin Park", initials: "JP", level: "B1", streak: 5, rating: 1210, isOnline: true },
  { id: 4, name: "Tom Wright", initials: "TW", level: "C2", streak: 42, rating: 1920, isOnline: false },
  { id: 5, name: "Linh Nguyen", initials: "LN", level: "A2", streak: 3, rating: 980, isOnline: false },
  { id: 6, name: "Carlos Rivera", initials: "CR", level: "B2", streak: 18, rating: 1380, isOnline: false },
];

export function FriendsPanel({ open, onClose, onChallenge }: FriendsPanelProps) {
  const online = friends.filter((f) => f.isOnline);
  const offline = friends.filter((f) => !f.isOnline);

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="right" className="w-80 p-0">
        <SheetHeader className="px-4 py-3 border-b">
          <SheetTitle className="flex items-center gap-2">
            Friends
            <Badge variant="secondary" className="text-xs">
              <Circle className="h-2 w-2 fill-green-500 text-green-500 mr-1" />
              {online.length} online
            </Badge>
          </SheetTitle>
        </SheetHeader>

        <div className="px-4 py-3 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search friends..." />
          </div>
        </div>

        <div className="overflow-y-auto h-full pb-20">
          {/* Online */}
          <div className="px-4 pt-4 pb-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Online — {online.length}
            </p>
            <div className="space-y-2">
              {online.map((friend) => (
                <div key={friend.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="relative">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="text-xs">{friend.initials}</AvatarFallback>
                    </Avatar>
                    <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background bg-green-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{friend.name}</p>
                    <div className="flex items-center gap-1.5">
                      <Badge variant="outline" className="text-xs h-4 px-1">{friend.level}</Badge>
                      <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                        <Flame className="h-3 w-3 text-orange-400" />{friend.streak}d
                      </span>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" className="h-7 px-2" onClick={onChallenge}>
                    <Swords className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Offline */}
          <div className="px-4 pt-3 pb-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Offline — {offline.length}
            </p>
            <div className="space-y-2">
              {offline.map((friend) => (
                <div key={friend.id} className="flex items-center gap-3 p-2 rounded-lg opacity-60">
                  <div className="relative">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="text-xs">{friend.initials}</AvatarFallback>
                    </Avatar>
                    <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background bg-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{friend.name}</p>
                    <div className="flex items-center gap-1.5">
                      <Badge variant="outline" className="text-xs h-4 px-1">{friend.level}</Badge>
                      <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                        <Flame className="h-3 w-3" />{friend.streak}d
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t bg-background">
          <Button variant="outline" className="w-full" size="sm">
            <UserPlus className="h-4 w-4 mr-2" /> Add Friend
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
