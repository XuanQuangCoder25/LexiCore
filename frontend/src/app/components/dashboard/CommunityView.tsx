import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Skeleton } from '../ui/skeleton';
import {
  MessageSquare,
  Sparkles,
  Loader2,
  RefreshCw,
  Globe,
  HelpCircle,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  communityService,
  PostItem,
  getCommunityErrorMessage,
  COMMUNITY_TOPICS_LIST,
} from '../../services/community-service';
import { TopicSidebar } from '../../features/community/TopicSidebar';
import { RightWidgetSidebar } from '../../features/community/RightWidgetSidebar';
import { PostComposer } from '../../features/community/PostComposer';
import { PostCard } from '../../features/community/PostCard';

export function CommunityView() {
  const [currentUser, setCurrentUser] = useState<{
    id: string;
    full_name: string;
    avatar_url: string | null;
    role: string;
  } | null>(null);

  const [activeTab, setActiveTab] = useState<'all' | 'friends' | 'unanswered'>('all');
  const [activeTopic, setActiveTopic] = useState<string>('all');

  const [pinnedPosts, setPinnedPosts] = useState<PostItem[]>([]);
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // Lấy thông tin người dùng hiện tại
  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.id) {
          setCurrentUser({
            id: data.id,
            full_name: data.full_name || 'Học viên',
            avatar_url: data.avatar_url || null,
            role: data.role || 'USER',
          });
        }
      })
      .catch(() => {});
  }, []);

  // Tải feed từ Backend với Cursor Pagination
  const fetchFeed = useCallback(
    async (cursor: string | null = null, append = false) => {
      try {
        if (!append) setLoading(true);
        else setLoadingMore(true);

        const res = await communityService.getFeed({
          tab: activeTab,
          topic: activeTopic,
          cursor,
          limit: 10,
        });

        if (append) {
          setPosts((prev) => [...prev, ...res.posts]);
        } else {
          setPinnedPosts(res.pinnedPosts || []);
          setPosts(res.posts || []);
        }

        setNextCursor(res.nextCursor);
        setHasMore(res.hasMore);
      } catch (error) {
        toast.error(getCommunityErrorMessage(error, 'Không thể tải bảng tin cộng đồng.'));
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [activeTab, activeTopic]
  );

  useEffect(() => {
    fetchFeed(null, false);
  }, [fetchFeed]);

  const handleLoadMore = () => {
    if (nextCursor && !loadingMore) {
      fetchFeed(nextCursor, true);
    }
  };

  const handlePostCreated = (newPost: PostItem) => {
    setPosts((prev) => [newPost, ...prev]);
  };

  const handlePostDeleted = (postId: string) => {
    setPinnedPosts((prev) => prev.filter((p) => p.id !== postId));
    setPosts((prev) => prev.filter((p) => p.id !== postId));
  };

  const currentTopicLabel =
    COMMUNITY_TOPICS_LIST.find((t) => t.id === activeTopic)?.label || 'Tất cả chủ đề';

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Tiêu đề trang */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <MessageSquare className="w-7 h-7 text-primary" />
            <span>Cộng đồng học tập (Community Hub)</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Không gian hỏi đáp bài tập, thảo luận phương pháp và kết nối cùng cộng đồng LexiCore
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          className="self-start sm:self-auto text-xs gap-1.5 h-8 text-muted-foreground hover:text-foreground"
          onClick={() => fetchFeed(null, false)}
          disabled={loading}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Làm mới</span>
        </Button>
      </div>

      {/* Bố cục 3 cột (Responsive 3-Column Layout) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* CỘT TRÁI: Navigation & Topics (lg: 3/12 cols) */}
        <div className="lg:col-span-3 space-y-4">
          <TopicSidebar
            activeTab={activeTab}
            onTabChange={(tab) => {
              setActiveTab(tab);
            }}
            activeTopic={activeTopic}
            onTopicChange={(topic) => {
              setActiveTopic(topic);
            }}
          />
        </div>

        {/* CỘT GIỮA: Central Feed Stream (lg: 6/12 cols hoặc 9/12 cols) */}
        <div className="lg:col-span-9 xl:col-span-6 space-y-4">
          {/* Smart Composer */}
          <PostComposer onPostCreated={handlePostCreated} currentUser={currentUser} />

          {/* Banner bộ lọc hiện tại */}
          <div className="flex items-center justify-between text-xs text-muted-foreground px-1 py-0.5">
            <span className="flex items-center gap-1.5 font-medium">
              {activeTab === 'all' && <Globe className="w-3.5 h-3.5 text-primary" />}
              {activeTab === 'friends' && <Users className="w-3.5 h-3.5 text-blue-500" />}
              {activeTab === 'unanswered' && <HelpCircle className="w-3.5 h-3.5 text-orange-500" />}
              <span>
                {activeTab === 'all' && 'Bảng tin chung'}
                {activeTab === 'friends' && 'Bài viết từ bạn bè'}
                {activeTab === 'unanswered' && 'Câu hỏi chờ giải đáp'}
              </span>
              <span>·</span>
              <strong className="text-foreground">{currentTopicLabel}</strong>
            </span>

            <span>{posts.length + pinnedPosts.length} bài viết</span>
          </div>

          {/* Trạng thái Loading ban đầu */}
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="p-5 space-y-3">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="space-y-1.5 flex-1">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  </div>
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-16 w-full" />
                </Card>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Danh sách bài ghim */}
              {pinnedPosts.length > 0 && (
                <div className="space-y-4">
                  {pinnedPosts.map((post) => (
                    <PostCard
                      key={post.id}
                      post={post}
                      currentUser={currentUser}
                      onPostDeleted={handlePostDeleted}
                    />
                  ))}
                </div>
              )}

              {/* Danh sách bài đăng thông thường */}
              {posts.length === 0 && pinnedPosts.length === 0 ? (
                <Card className="border-dashed bg-muted/20">
                  <CardContent className="flex flex-col items-center justify-center py-16 text-center space-y-3">
                    <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                      <MessageSquare className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="font-semibold text-base text-foreground">
                        Chưa có bài viết nào trong mục này
                      </h3>
                      <p className="text-xs text-muted-foreground max-w-sm">
                        {activeTab === 'friends'
                          ? 'Bạn bè của bạn chưa đăng bài nào. Hãy kết bạn thêm hoặc chuyển sang Bảng tin chung!'
                          : 'Hãy là người đầu tiên đặt câu hỏi hoặc chia sẻ tài liệu học tập bổ ích.'}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {posts.map((post) => (
                    <PostCard
                      key={post.id}
                      post={post}
                      currentUser={currentUser}
                      onPostDeleted={handlePostDeleted}
                    />
                  ))}
                </div>
              )}

              {/* Phân trang Cursor (Nút Tải thêm) */}
              {hasMore && (
                <div className="text-center pt-2 pb-6">
                  <Button
                    variant="outline"
                    className="text-xs font-medium gap-2 px-6"
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                  >
                    {loadingMore ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Đang tải thêm...</span>
                      </>
                    ) : (
                      <span>Xem thêm bài viết cũ hơn</span>
                    )}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* CỘT PHẢI: Widgets & Guidelines (xl: 3/12 cols, ẩn trên màn hình vừa) */}
        <div className="hidden xl:block xl:col-span-3 space-y-4">
          <RightWidgetSidebar
            onSelectTag={(tag) => {
              // Lọc theo tag nếu click
              setActiveTopic('all');
            }}
          />
        </div>
      </div>
    </div>
  );
}
