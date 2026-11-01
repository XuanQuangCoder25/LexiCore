import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../ui/dialog';
import { Button } from '../../ui/button';
import { Crown } from 'lucide-react';

interface PublishRestrictedModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigateTab?: (tab: string) => void;
  contentType?: 'khóa học' | 'bài kiểm tra' | 'bộ thẻ';
}

export const PublishRestrictedModal: React.FC<PublishRestrictedModalProps> = ({
  open,
  onOpenChange,
  onNavigateTab,
  contentType = 'khóa học'
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md animate-in fade-in zoom-in-95 duration-200" aria-describedby={undefined}>
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
            <p className="font-medium text-foreground">💡 Bạn vẫn hoàn toàn yên tâm:</p>
            <p>
              Nội dung của bạn được tự động lưu an toàn trong <strong className="text-primary font-semibold">Private Space</strong> để bạn tự do học tập, làm bài tập và ôn luyện bất kỳ lúc nào.
            </p>
          </div>
          <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
            Hãy nâng cấp tài khoản Creator để chia sẻ kiến thức hữu ích và nhận thêm nhiều quyền lợi từ LexiCore!
          </p>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row sm:justify-center gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Để sau (Giữ làm bản nháp)
          </Button>
          <Button
            className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-medium gap-2 shadow-md shadow-amber-500/20"
            onClick={() => {
              onOpenChange(false);
              if (onNavigateTab) {
                onNavigateTab("profile");
              }
            }}
          >
            <Crown className="w-4 h-4" /> Đăng ký làm Creator ngay
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
