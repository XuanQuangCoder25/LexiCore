import { useEffect, useMemo, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "../ui/sheet";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Input } from "../ui/input";
import { Skeleton } from "../ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog";
import {
  Ban,
  Check,
  Flame,
  Loader2,
  MessageCircle,
  MoreVertical,
  Search,
  Swords,
  UserMinus,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useSocial } from "../../features/social/SocialContext";
import { getInitials, formatRelativeTime } from "../../features/social/utils";
import {
  socialService,
  getSocialErrorMessage,
  FriendItem,
  SearchResultUser,
} from "../../services/social-service";

interface FriendsPanelProps {
  open: boolean;
  onClose: () => void;
  onChallenge: () => void;
  /** Mở khung chat với một người bạn (được nối ở Phase 5). Nếu không truyền thì ẩn nút nhắn tin. */
  onMessage?: (friend: { id: string; full_name: string; avatar_url: string | null }) => void;
}

type ConfirmState = { type: "remove" | "block"; user: { id: string; full_name: string } } | null;

function UserAvatar({
  user,
  online,
  className = "h-10 w-10",
}: {
  user: { full_name: string; avatar_url: string | null };
  online?: boolean | null;
  className?: string;
}) {
  return (
    <div className="relative shrink-0">
      <Avatar className={className}>
        {user.avatar_url && <AvatarImage src={user.avatar_url} alt={user.full_name} />}
        <AvatarFallback className="text-xs font-semibold">{getInitials(user.full_name)}</AvatarFallback>
      </Avatar>
      {online !== undefined && online !== null && (
        <span
          className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background ${
            online ? "bg-green-500" : "bg-muted-foreground/60"
          }`}
        />
      )}
    </div>
  );
}

function EmptyState({ icon: Icon, title, hint }: { icon: typeof Users; title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted/60">
        <Icon className="h-6 w-6 text-muted-foreground/60" />
      </div>
      <p className="text-sm font-medium">{title}</p>
      {hint && <p className="max-w-[240px] text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="space-y-3 px-4 py-4">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function FriendsPanel({ open, onClose, onChallenge, onMessage }: FriendsPanelProps) {
  const {
    friends,
    receivedRequests,
    sentRequests,
    summary,
    loading,
    onlineUserIds,
    refreshAll,
    sendFriendRequest,
    acceptRequest,
    rejectRequest,
    cancelRequest,
    removeFriend,
    blockUser,
    unblockUser,
  } = useSocial();

  const [tab, setTab] = useState("friends");
  const [filter, setFilter] = useState("");
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<ConfirmState>(null);

  // Tìm người dùng mới
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResultUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchVersion, setSearchVersion] = useState(0);

  // Mỗi lần mở panel: đồng bộ lại dữ liệu từ server
  useEffect(() => {
    if (open) refreshAll();
  }, [open, refreshAll]);

  // Tìm kiếm có debounce 400ms (tối thiểu 2 ký tự)
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const data = await socialService.searchUsers(q);
        if (!cancelled) setResults(data);
      } catch (error) {
        if (!cancelled) {
          setResults([]);
          toast.error(getSocialErrorMessage(error, "Không thể tìm kiếm người dùng."));
        }
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, searchVersion]);

  const run = async (key: string, fn: () => Promise<unknown>) => {
    setBusyKey(key);
    try {
      await fn();
    } finally {
      setBusyKey(null);
    }
  };

  const bumpSearch = () => setSearchVersion((v) => v + 1);

  // Bạn bè: lọc theo tên, người đang online xếp trước
  const visibleFriends = useMemo(() => {
    const keyword = filter.trim().toLowerCase();
    return friends
      .filter((f) => !keyword || f.full_name.toLowerCase().includes(keyword))
      .sort((a, b) => {
        const diff = Number(onlineUserIds.has(b.id)) - Number(onlineUserIds.has(a.id));
        return diff !== 0 ? diff : a.full_name.localeCompare(b.full_name, "vi");
      });
  }, [friends, filter, onlineUserIds]);

  const onlineCount = friends.filter((f) => onlineUserIds.has(f.id)).length;

  const renderFriend = (friend: FriendItem) => {
    const online = onlineUserIds.has(friend.id);
    return (
      <div
        key={friend.id}
        className={`flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-muted/50 ${online ? "" : "opacity-80"}`}
      >
        <UserAvatar user={friend} online={online} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{friend.full_name}</p>
          <div className="flex items-center gap-1.5">
            <Badge variant="outline" className="h-4 px-1 text-xs">
              Lv {friend.level}
            </Badge>
            <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
              <Flame className={`h-3 w-3 ${friend.current_streak > 0 ? "text-orange-400" : ""}`} />
              {friend.current_streak}d
            </span>
          </div>
        </div>
        {onMessage && (
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2"
            title="Nhắn tin"
            onClick={() => onMessage({ id: friend.id, full_name: friend.full_name, avatar_url: friend.avatar_url })}
          >
            <MessageCircle className="h-4 w-4" />
          </Button>
        )}
        <Button size="sm" variant="outline" className="h-7 px-2" title="Thách đấu" onClick={onChallenge}>
          <Swords className="h-3.5 w-3.5" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" aria-label="Thêm tùy chọn">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setConfirm({ type: "remove", user: friend })}>
              <UserMinus className="mr-2 h-4 w-4" /> Hủy kết bạn
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => setConfirm({ type: "block", user: friend })}
            >
              <Ban className="mr-2 h-4 w-4" /> Chặn
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  };

  const renderSearchAction = (user: SearchResultUser) => {
    switch (user.relationship) {
      case "friends":
        return (
          <Badge variant="secondary" className="gap-1 text-xs">
            <Check className="h-3 w-3" /> Bạn bè
          </Badge>
        );
      case "request_sent":
        return (
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2 text-xs"
            disabled={busyKey === `cancel:${user.id}` || !user.request_id}
            onClick={() =>
              run(`cancel:${user.id}`, async () => {
                if (user.request_id && (await cancelRequest(user.request_id))) bumpSearch();
              })
            }
          >
            {busyKey === `cancel:${user.id}` ? <Loader2 className="h-3 w-3 animate-spin" /> : "Hủy lời mời"}
          </Button>
        );
      case "request_received":
        return (
          <Button
            size="sm"
            className="h-7 px-2 text-xs"
            disabled={busyKey === `accept:${user.id}` || !user.request_id}
            onClick={() =>
              run(`accept:${user.id}`, async () => {
                if (user.request_id && (await acceptRequest(user.request_id))) bumpSearch();
              })
            }
          >
            {busyKey === `accept:${user.id}` ? <Loader2 className="h-3 w-3 animate-spin" /> : "Chấp nhận"}
          </Button>
        );
      case "blocked":
        return (
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2 text-xs"
            disabled={busyKey === `unblock:${user.id}`}
            onClick={() =>
              run(`unblock:${user.id}`, async () => {
                if (await unblockUser(user.id)) bumpSearch();
              })
            }
          >
            {busyKey === `unblock:${user.id}` ? <Loader2 className="h-3 w-3 animate-spin" /> : "Bỏ chặn"}
          </Button>
        );
      default:
        return (
          <Button
            size="sm"
            className="h-7 gap-1 px-2 text-xs"
            disabled={busyKey === `add:${user.id}`}
            onClick={() =>
              run(`add:${user.id}`, async () => {
                if (await sendFriendRequest(user.id)) bumpSearch();
              })
            }
          >
            {busyKey === `add:${user.id}` ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <>
                <UserPlus className="h-3 w-3" /> Kết bạn
              </>
            )}
          </Button>
        );
    }
  };

  const confirmCopy =
    confirm?.type === "block"
      ? {
          title: "Chặn người dùng này?",
          description: `${confirm.user.full_name} sẽ bị xóa khỏi danh sách bạn bè và không thể gửi lời mời hay nhắn tin cho bạn.`,
          action: "Chặn",
        }
      : {
          title: "Hủy kết bạn?",
          description: confirm ? `Bạn sẽ không còn là bạn bè với ${confirm.user.full_name} và không thể nhắn tin cho nhau.` : "",
          action: "Hủy kết bạn",
        };

  return (
    <>
      <Sheet open={open} onOpenChange={onClose}>
        <SheetContent side="right" className="flex w-[26rem] flex-col gap-0 p-0 sm:max-w-[26rem]">
          <SheetHeader className="border-b px-4 py-3">
            <SheetTitle className="flex items-center gap-2">
              Bạn bè
              <Badge variant="secondary" className="text-xs">
                <span className="mr-1 inline-block h-2 w-2 rounded-full bg-green-500" />
                {onlineCount} online
              </Badge>
            </SheetTitle>
            <SheetDescription className="sr-only">Quản lý bạn bè, lời mời kết bạn và tìm người dùng mới</SheetDescription>
          </SheetHeader>

          <Tabs value={tab} onValueChange={setTab} className="flex min-h-0 flex-1 flex-col gap-0">
            <TabsList className="mx-4 mt-3 w-auto">
              <TabsTrigger value="friends" id="friends-tab-list">
                Bạn bè
                {friends.length > 0 && <span className="text-xs text-muted-foreground">({friends.length})</span>}
              </TabsTrigger>
              <TabsTrigger value="requests" id="friends-tab-requests">
                Lời mời
                {summary.pending_requests > 0 && (
                  <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
                    {summary.pending_requests}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="add" id="friends-tab-add">
                Thêm bạn
              </TabsTrigger>
            </TabsList>

            {/* ---------------------------------------------------- BẠN BÈ */}
            <TabsContent value="friends" className="mt-3 flex min-h-0 flex-1 flex-col">
              <div className="px-4 pb-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="friends-filter-input"
                    className="pl-9"
                    placeholder="Tìm trong danh sách bạn bè..."
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                  />
                </div>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-4">
                {loading ? (
                  <ListSkeleton />
                ) : friends.length === 0 ? (
                  <EmptyState
                    icon={Users}
                    title="Bạn chưa có người bạn nào"
                    hint="Chuyển sang tab “Thêm bạn” để tìm và gửi lời mời kết bạn."
                  />
                ) : visibleFriends.length === 0 ? (
                  <EmptyState icon={Search} title="Không tìm thấy bạn bè phù hợp" />
                ) : (
                  <div className="space-y-1">{visibleFriends.map(renderFriend)}</div>
                )}
              </div>
            </TabsContent>

            {/* ---------------------------------------------------- LỜI MỜI */}
            <TabsContent value="requests" className="mt-3 min-h-0 flex-1 overflow-y-auto px-2 pb-4">
              {loading ? (
                <ListSkeleton />
              ) : receivedRequests.length === 0 && sentRequests.length === 0 ? (
                <EmptyState icon={UserPlus} title="Không có lời mời nào" hint="Lời mời kết bạn sẽ hiển thị tại đây." />
              ) : (
                <div className="space-y-4">
                  {receivedRequests.length > 0 && (
                    <section>
                      <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Lời mời nhận được — {receivedRequests.length}
                      </p>
                      <div className="space-y-1">
                        {receivedRequests.map((req) => (
                          <div key={req.request_id} className="flex items-center gap-3 rounded-lg p-2 hover:bg-muted/50">
                            <UserAvatar user={req.user} />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium">{req.user.full_name}</p>
                              <p className="text-xs text-muted-foreground">
                                Lv {req.user.level} · {formatRelativeTime(req.created_at)}
                              </p>
                            </div>
                            <Button
                              size="sm"
                              className="h-7 px-2"
                              title="Chấp nhận"
                              disabled={busyKey === `accept:${req.request_id}`}
                              onClick={() => run(`accept:${req.request_id}`, () => acceptRequest(req.request_id))}
                            >
                              {busyKey === `accept:${req.request_id}` ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Check className="h-3.5 w-3.5" />
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2"
                              title="Từ chối"
                              disabled={busyKey === `reject:${req.request_id}`}
                              onClick={() => run(`reject:${req.request_id}`, () => rejectRequest(req.request_id))}
                            >
                              {busyKey === `reject:${req.request_id}` ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <X className="h-3.5 w-3.5" />
                              )}
                            </Button>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  {sentRequests.length > 0 && (
                    <section>
                      <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Lời mời đã gửi — {sentRequests.length}
                      </p>
                      <div className="space-y-1">
                        {sentRequests.map((req) => (
                          <div key={req.request_id} className="flex items-center gap-3 rounded-lg p-2 hover:bg-muted/50">
                            <UserAvatar user={req.user} />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium">{req.user.full_name}</p>
                              <p className="text-xs text-muted-foreground">Đã gửi {formatRelativeTime(req.created_at)}</p>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2 text-xs"
                              disabled={busyKey === `cancel:${req.request_id}`}
                              onClick={() => run(`cancel:${req.request_id}`, () => cancelRequest(req.request_id))}
                            >
                              {busyKey === `cancel:${req.request_id}` ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                "Hủy"
                              )}
                            </Button>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}
                </div>
              )}
            </TabsContent>

            {/* --------------------------------------------------- THÊM BẠN */}
            <TabsContent value="add" className="mt-3 flex min-h-0 flex-1 flex-col">
              <div className="px-4 pb-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="friends-search-input"
                    className="pl-9"
                    placeholder="Nhập tên hoặc email chính xác..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                  {searching && (
                    <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
                  )}
                </div>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-4">
                {query.trim().length < 2 ? (
                  <EmptyState
                    icon={Search}
                    title="Tìm bạn mới"
                    hint="Nhập ít nhất 2 ký tự của tên, hoặc email chính xác của người bạn muốn kết nối."
                  />
                ) : results.length === 0 && !searching ? (
                  <EmptyState icon={Users} title="Không tìm thấy người dùng" hint="Hãy thử từ khóa khác." />
                ) : (
                  <div className="space-y-1">
                    {results.map((user) => (
                      <div key={user.id} className="flex items-center gap-3 rounded-lg p-2 hover:bg-muted/50">
                        <UserAvatar user={user} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{user.full_name}</p>
                          <Badge variant="outline" className="h-4 px-1 text-xs">
                            Lv {user.level}
                          </Badge>
                        </div>
                        {renderSearchAction(user)}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </SheetContent>
      </Sheet>

      {/* Xác nhận hủy kết bạn / chặn */}
      <AlertDialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmCopy.title}</AlertDialogTitle>
            <AlertDialogDescription>{confirmCopy.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy bỏ</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const target = confirm;
                setConfirm(null);
                if (!target) return;
                run(`confirm:${target.user.id}`, () =>
                  target.type === "block" ? blockUser(target.user.id) : removeFriend(target.user.id)
                );
              }}
            >
              {confirmCopy.action}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
