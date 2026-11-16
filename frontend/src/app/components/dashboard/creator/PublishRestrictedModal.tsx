import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../ui/dialog';
import { Button } from '../../ui/button';
import { Crown, Lightbulb, ShieldAlert } from 'lucide-react';

export interface PublishRestrictedModalProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  isOpen?: boolean;
  onClose?: () => void;
  onNavigateToApplication?: () => void;
  onNavigateTab?: (tab: string) => void;
  contentType?: 'khóa học' | 'bài kiểm tra' | 'bộ thẻ' | 'nội dung';
  reason?: 'creator_required' | 'creator_suspended';
  creatorStatus?: string | null;
  userRole?: string;
}

export const PublishRestrictedModal: React.FC<PublishRestrictedModalProps> = ({
  open,
  onOpenChange,
  isOpen,
  onClose,
  onNavigateToApplication,
  onNavigateTab,
  contentType = 'khóa học',
  reason,
  creatorStatus,
  userRole
}) => {
  const resolvedOpen = open ?? isOpen ?? false;
  const [detectedSuspended, setDetectedSuspended] = useState<boolean>(() => {
    const cachedRole = (userRole || localStorage.getItem('lexicore_user_role') || '').toLowerCase();
    const cachedStatus = (creatorStatus || localStorage.getItem('lexicore_creator_status') || '').toUpperCase();
    return cachedRole === 'content_creator' && cachedStatus === 'SUSPENDED';
  });

  useEffect(() => {
    if (!resolvedOpen) return;

    const cachedRole = (userRole || localStorage.getItem('lexicore_user_role') || '').toLowerCase();
    const cachedStatus = (creatorStatus || localStorage.getItem('lexicore_creator_status') || '').toUpperCase();
    if (reason === 'creator_suspended' || (cachedRole === 'content_creator' && cachedStatus === 'SUSPENDED')) {
      setDetectedSuspended(true);
    } else if (reason === 'creator_required' && cachedRole === 'user') {
      setDetectedSuspended(false);
    }

    // Luôn kiểm tra trạng thái mới nhất từ /api/auth/me khi mở modal
    fetch('/api/auth/me', { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data) return;
        const freshRole = String(data.role || '').toLowerCase();
        const freshCreatorStatus = String(data.creator_status || '').toUpperCase();
        if (freshRole) localStorage.setItem('lexicore_user_role', freshRole);
        localStorage.setItem('lexicore_creator_status', freshCreatorStatus);
        setDetectedSuspended(freshRole === 'content_creator' && freshCreatorStatus === 'SUSPENDED');
      })
      .catch(() => {});
  }, [resolvedOpen, reason, creatorStatus, userRole]);

  const isSuspended = reason === 'creator_suspended' || detectedSuspended;

  const handleOpenChange = (nextOpen: boolean) => {
    if (onOpenChange) {
      onOpenChange(nextOpen);
    } else if (!nextOpen && onClose) {
      onClose();
    }
  };

  return (
    <Dialog open={resolvedOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md animate-in fade-in zoom-in-95 duration-200" aria-describedby={undefined}>
        {isSuspended ? (
          <>
            <DialogHeader>
              <div className="mx-auto w-14 h-14 rounded-2xl bg-rose-500/10 text-rose-600 flex items-center justify-center mb-3 shadow-inner border border-rose-500/20">
                <ShieldAlert className="w-7 h-7" />
              </div>
              <DialogTitle className="text-center text-xl font-bold text-zinc-900">
                Tài khoản Creator đang bị đình chỉ
              </DialogTitle>
            </DialogHeader>

            <div className="text-center py-2 text-sm text-muted-foreground space-y-3 leading-relaxed">
              <p>
                Quyền <strong className="text-foreground font-semibold">Content Creator</strong> của tài khoản bạn hiện đang trong trạng thái{' '}
                <strong className="text-rose-600 font-semibold">Tạm đình chỉ (Suspended)</strong>, do đó bạn không thể xuất bản {contentType} công khai ra Cộng đồng lúc này.
              </p>
              <div className="p-3.5 bg-muted/50 rounded-xl border border-border/60 text-xs text-foreground/80 space-y-1 text-left">
                <p className="font-medium text-foreground inline-flex items-center gap-1.5">
                  <Lightbulb className="w-3.5 h-3.5 text-foreground shrink-0" strokeWidth={1.75} />
                  <span>Bạn vẫn hoàn toàn yên tâm:</span>
                </p>
                <p>
                  Mọi nội dung của bạn vẫn được lưu an toàn dưới dạng Bản nháp trong <strong className="text-primary font-semibold">Private Space</strong> để bạn tự do học tập và chỉnh sửa bất kỳ lúc nào.
                </p>
              </div>
              <p className="text-xs text-rose-600 font-medium">
                Vui lòng liên hệ Quản trị viên (Admin) nếu bạn cần hỗ trợ kiểm tra hoặc khôi phục quyền xuất bản.
              </p>
            </div>

            <DialogFooter className="flex flex-col sm:flex-row sm:justify-center gap-2 pt-2">
              <Button
                className="bg-[#161616] hover:bg-black text-white font-medium px-6 rounded-xl"
                onClick={() => handleOpenChange(false)}
              >
                Đã hiểu (Giữ làm bản nháp)
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <div className="mx-auto w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mb-3 shadow-inner border border-amber-500/20">
                <Crown className="w-7 h-7" />
              </div>
              <DialogTitle className="text-center text-xl font-bold">Tính năng dành riêng cho Creator</DialogTitle>
            </DialogHeader>

            <div className="text-center py-2 text-sm text-muted-foreground space-y-3 leading-relaxed">
              <p>
                Tính năng xuất bản {contentType} công khai chỉ dành riêng cho <strong className="text-foreground font-semibold">Content Creator chính thức</strong>.
              </p>
              <div className="p-3.5 bg-muted/50 rounded-xl border border-border/60 text-xs text-foreground/80 space-y-1 text-left">
                <p className="font-medium text-foreground inline-flex items-center gap-1.5">
                  <Lightbulb className="w-3.5 h-3.5 text-foreground shrink-0" strokeWidth={1.75} />
                  <span>Bạn vẫn hoàn toàn yên tâm:</span>
                </p>
                <p>
                  Nội dung của bạn được tự động lưu an toàn trong <strong className="text-primary font-semibold">Private Space</strong> để bạn tự do học tập, làm bài tập và ôn luyện bất kỳ lúc nào.
                </p>
              </div>
              <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                Hãy nâng cấp tài khoản Creator để chia sẻ kiến thức hữu ích và nhận thêm nhiều quyền lợi từ LexiCore!
              </p>
            </div>

            <DialogFooter className="flex flex-col sm:flex-row sm:justify-center gap-2 pt-2">
              <Button variant="outline" onClick={() => handleOpenChange(false)}>
                Để sau (Giữ làm bản nháp)
              </Button>
              <Button
                className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-medium gap-2 shadow-md shadow-amber-500/20"
                onClick={() => {
                  if (onNavigateToApplication) {
                    onNavigateToApplication();
                    return;
                  }
                  handleOpenChange(false);
                  if (onNavigateTab) {
                    onNavigateTab('profile');
                  }
                }}
              >
                <Crown className="w-4 h-4" /> Đăng ký làm Creator ngay
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
