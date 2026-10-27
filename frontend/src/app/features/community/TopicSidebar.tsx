import React from 'react';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import {
  Globe,
  Users,
  HelpCircle,
  Trophy,
  Sparkles,
  Brain,
  Mic,
  MessageSquare,
  Flame,
} from 'lucide-react';
import { COMMUNITY_TOPICS_LIST, TopicId } from '../../services/community-service';

interface TopicSidebarProps {
  activeTab: 'all' | 'friends' | 'unanswered';
  onTabChange: (tab: 'all' | 'friends' | 'unanswered') => void;
  activeTopic: string;
  onTopicChange: (topic: string) => void;
}

const topicIcons: Record<string, React.ReactNode> = {
  all: <Globe className="w-4 h-4" />,
  ielts: <Trophy className="w-4 h-4 text-amber-500" />,
  grammar: <Sparkles className="w-4 h-4 text-purple-500" />,
  vocabulary: <Brain className="w-4 h-4 text-pink-500" />,
  speaking: <Mic className="w-4 h-4 text-emerald-500" />,
  homework: <HelpCircle className="w-4 h-4 text-blue-500" />,
  general: <MessageSquare className="w-4 h-4 text-muted-foreground" />,
};

export const TopicSidebar: React.FC<TopicSidebarProps> = ({
  activeTab,
  onTabChange,
  activeTopic,
  onTopicChange,
}) => {
  return (
    <div className="space-y-4">
      {/* Bộ lọc luồng chính */}
      <Card className="border-border/60 bg-card/80 backdrop-blur-sm">
        <CardContent className="p-3 space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-2 py-1">
            Bảng tin
          </p>
          <Button
            variant={activeTab === 'all' ? 'secondary' : 'ghost'}
            size="sm"
            className="w-full justify-start gap-2.5 font-medium text-sm h-9"
            onClick={() => onTabChange('all')}
          >
            <Globe className="w-4 h-4 text-primary" />
            <span>Tất cả thảo luận</span>
          </Button>

          <Button
            variant={activeTab === 'friends' ? 'secondary' : 'ghost'}
            size="sm"
            className="w-full justify-start gap-2.5 font-medium text-sm h-9"
            onClick={() => onTabChange('friends')}
          >
            <Users className="w-4 h-4 text-blue-500" />
            <span>Bài viết từ Bạn bè</span>
          </Button>

          <Button
            variant={activeTab === 'unanswered' ? 'secondary' : 'ghost'}
            size="sm"
            className="w-full justify-start gap-2.5 font-medium text-sm h-9"
            onClick={() => onTabChange('unanswered')}
          >
            <HelpCircle className="w-4 h-4 text-orange-500" />
            <span>Chưa có lời giải</span>
          </Button>
        </CardContent>
      </Card>

      {/* Danh mục chủ đề chuyên sâu */}
      <Card className="border-border/60 bg-card/80 backdrop-blur-sm">
        <CardContent className="p-3 space-y-1">
          <div className="flex items-center justify-between px-2 py-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Chủ đề học tập
            </p>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 text-muted-foreground">
              6 Kênh
            </Badge>
          </div>

          {COMMUNITY_TOPICS_LIST.map((topic) => {
            const isSelected = activeTopic === topic.id;
            return (
              <Button
                key={topic.id}
                variant={isSelected ? 'secondary' : 'ghost'}
                size="sm"
                className={`w-full justify-start gap-2.5 font-medium text-sm h-9 transition-colors ${
                  isSelected ? 'font-semibold text-primary' : 'text-foreground/80 hover:text-foreground'
                }`}
                onClick={() => onTopicChange(topic.id)}
              >
                {topicIcons[topic.id] || <MessageSquare className="w-4 h-4" />}
                <span className="truncate">{topic.label}</span>
              </Button>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
};
