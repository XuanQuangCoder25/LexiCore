import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { ShieldCheck, Lightbulb, TrendingUp, Sparkles } from 'lucide-react';

interface RightWidgetSidebarProps {
  onSelectTag?: (tag: string) => void;
}

const trendingTags = [
  { tag: '#IELTSSpeaking', count: '48 bài' },
  { tag: '#PhrasalVerbs', count: '35 bài' },
  { tag: '#ShadowingTips', count: '29 bài' },
  { tag: '#StreakChallenge', count: '52 bài' },
  { tag: '#GrammarQnA', count: '21 bài' },
];

export const RightWidgetSidebar: React.FC<RightWidgetSidebarProps> = ({ onSelectTag }) => {
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
        <CardContent className="px-4 pb-4 space-y-2">
          {trendingTags.map((item) => (
            <div
              key={item.tag}
              onClick={() => onSelectTag?.(item.tag.replace('#', ''))}
              className="flex items-center justify-between text-xs py-1.5 px-2 rounded-md hover:bg-muted/60 cursor-pointer transition-colors"
            >
              <span className="font-medium text-foreground hover:text-primary transition-colors">
                {item.tag}
              </span>
              <span className="text-muted-foreground text-[11px]">{item.count}</span>
            </div>
          ))}
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
