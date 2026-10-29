import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { ShieldCheck, Lightbulb, TrendingUp, Sparkles, Loader2, Hash } from 'lucide-react';
import { communityService } from '../../services/community-service';

interface RightWidgetSidebarProps {
  onSelectTag?: (tag: string) => void;
}

export const RightWidgetSidebar: React.FC<RightWidgetSidebarProps> = ({ onSelectTag }) => {
  const [trendingTags, setTrendingTags] = useState<Array<{ tag: string; count: number }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    communityService
      .getTrending()
      .then((data) => {
        setTrendingTags(data);
      })
      .catch((err) => {
        console.error('Lỗi nạp chủ đề thịnh hành:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  return (
    <div className="space-y-4">
      {/* Widget 1: Xu hướng thảo luận */}
      <Card className="border-border/60 bg-card/80 backdrop-blur-sm">
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            <span>Chủ đề thịnh hành</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-1.5">
          {loading ? (
            <div className="py-4 flex justify-center text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
          ) : trendingTags.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2 text-center">
              Chưa có dữ liệu thảo luận
            </p>
          ) : (
            trendingTags.map((item) => (
              <div
                key={item.tag}
                onClick={() => onSelectTag?.(item.tag.replace('#', ''))}
                className="flex items-center justify-between text-xs py-1.5 px-2 rounded-md hover:bg-muted/70 cursor-pointer transition-colors group"
              >
                <span className="font-medium text-foreground/90 group-hover:text-primary transition-colors flex items-center gap-1">
                  <Hash className="w-3 h-3 text-muted-foreground/60 group-hover:text-primary" />
                  {item.tag.replace('#', '')}
                </span>
                <Badge
                  variant="secondary"
                  className="text-[10px] py-0 h-4 font-normal text-muted-foreground group-hover:text-primary group-hover:bg-primary/10"
                >
                  {item.count > 0 ? `${item.count} bài` : 'Mới'}
                </Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Widget 2: Mẹo học tập */}
      <Card className="border-border/60 bg-gradient-to-br from-primary/5 via-card to-card">
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm font-semibold flex items-center gap-2 text-primary">
            <Lightbulb className="w-4 h-4 text-amber-500 fill-amber-500/20" />
            <span>Mẹo học hôm nay</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 text-xs text-muted-foreground leading-relaxed space-y-2">
          <p>
            💡 Đừng chỉ học từ vựng riêng lẻ! Hãy kèm theo <strong>Collocations</strong> và tự đặt
            1 câu ngắn thực tế vào bộ thẻ Flashcard để tăng khả năng ghi nhớ dài hạn lên 3 lần.
          </p>
        </CardContent>
      </Card>

      {/* Widget 3: Văn hóa cộng đồng */}
      <Card className="border-border/60 bg-card/80">
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm font-semibold flex items-center gap-2 text-muted-foreground">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>Quy chuẩn cộng đồng</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 text-xs text-muted-foreground space-y-1.5">
          <p>• Tôn trọng và cùng nhau tiến bộ.</p>
          <p>• Đặt tiêu đề rõ ràng kèm ngữ cảnh bài tập.</p>
          <p>• Khuyến khích giải thích chi tiết thay vì chỉ đưa đáp án.</p>
        </CardContent>
      </Card>
    </div>
  );
};
