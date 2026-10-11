import {
  Sparkles,
  Award,
  Globe,
  Youtube,
  GraduationCap,
  BellRing,
  BookOpen,
  ArrowRight,
  TrendingUp,
  DollarSign,
  Users,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../ui/card";
import { Input } from "../../ui/input";
import { Textarea } from "../../ui/textarea";
import { Label } from "../../ui/label";
import { Button } from "../../ui/button";
import { Switch } from "../../ui/switch";
import { Badge } from "../../ui/badge";
import { toast } from "sonner";
import { SettingsState } from "./settingsMock";

interface CreatorSettingsSectionProps {
  settings: SettingsState;
  updateSetting: <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => void;
  userRole?: string;
  onNavigateTab?: (tab: string) => void;
}

export function CreatorSettingsSection({
  settings,
  updateSetting,
  userRole = "content_creator",
  onNavigateTab,
}: CreatorSettingsSectionProps) {
  const isCreator = userRole === "content_creator";

  const handleApplyCreator = () => {
    toast.success("Đã ghi nhận đơn đăng ký Creator!", {
      description: "Đội ngũ học thuật LexiCore sẽ xem xét hồ sơ và liên hệ bạn trong vòng 24 giờ làm việc.",
    });
  };

  if (!isCreator) {
    return (
      <div className="space-y-6">
        <Card className="relative overflow-hidden border-2 border-primary/20 bg-gradient-to-br from-primary/5 via-background to-amber-500/5">
          <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl -z-10 pointer-events-none" />

          <CardHeader className="text-center sm:text-left">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-tr from-primary to-violet-600 flex items-center justify-center text-primary-foreground shadow-lg shadow-primary/20 shrink-0">
                <GraduationCap className="h-8 w-8" />
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <CardTitle className="text-2xl font-bold">
                    Trở thành Nhà Sáng Tạo (Creator) trên LexiCore
                  </CardTitle>
                  <Badge className="bg-primary/20 text-primary border-primary/30">
                    Chương trình đối tác
                  </Badge>
                </div>
                <CardDescription className="text-sm max-w-2xl">
                  Lan tỏa kiến thức, xuất bản bộ flashcard, khóa học và đề thi chuẩn quốc tế tới hàng ngàn học viên năng động trên khắp cả nước.
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl border bg-background/80 backdrop-blur-xs space-y-2">
                <div className="h-9 w-9 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                  <DollarSign className="h-5 w-5" />
                </div>
                <h4 className="font-semibold text-sm">Gia tăng thu nhập thụ động</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Hưởng tỷ lệ chia sẻ doanh thu hấp dẫn lên đến 70% từ mỗi lượt mua khóa học hoặc thẻ cao cấp của học viên.
                </p>
              </div>

              <div className="p-4 rounded-xl border bg-background/80 backdrop-blur-xs space-y-2">
                <div className="h-9 w-9 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center">
                  <Users className="h-5 w-5" />
                </div>
                <h4 className="font-semibold text-sm">Xây dựng thương hiệu cá nhân</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Sở hữu trang hồ sơ Giảng viên chuyên nghiệp, tích hợp huy hiệu Verified Creator cùng liên kết mạng xã hội cá nhân.
                </p>
              </div>

              <div className="p-4 rounded-xl border bg-background/80 backdrop-blur-xs space-y-2">
                <div className="h-9 w-9 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <h4 className="font-semibold text-sm">Bộ công cụ sáng tạo mạnh mẽ</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Công cụ Course Studio & Exam Builder chuẩn bị sẵn, tự động chấm điểm bài thi và phân tích Spaced Repetition cho học viên.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-muted/60 border">
              <div className="text-sm text-center sm:text-left">
                <span className="font-semibold">Bạn đã có chứng chỉ IELTS 7.0+ hoặc chuyên môn tiếng Anh?</span>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Thủ tục phê duyệt xét duyệt hồ sơ nhanh chóng chỉ trong vòng 24 giờ làm việc.
                </p>
              </div>
              <Button
                onClick={handleApplyCreator}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shrink-0"
              >
                <Sparkles className="h-4 w-4 mr-2" /> Đăng ký ngay hôm nay
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Quick Creator Studio Jump */}
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shrink-0">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold">Creator Studio Dashboard</h4>
                <Badge variant="default" className="text-[10px] h-4 px-1.5 bg-emerald-600">
                  Verified Creator
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Quản lý các Khóa học, Bộ Flashcard Spaced Repetition và Đề thi đang xuất bản của bạn
              </p>
            </div>
          </div>

          {onNavigateTab && (
            <Button
              onClick={() => onNavigateTab("creator")}
              className="shrink-0 font-medium"
              size="sm"
            >
              Mở Creator Studio <ArrowRight className="h-4 w-4 ml-1.5" />
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Public Profile Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Award className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-lg">Hồ sơ Tác giả Công khai (Public Profile)</CardTitle>
              <CardDescription>
                Thông tin này sẽ được hiển thị công khai trên trang chi tiết khóa học và đề thi của bạn
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold" htmlFor="creator-display-name">
                Tên hiển thị giảng viên
              </Label>
              <Input
                id="creator-display-name"
                value={settings.creatorDisplayName}
                onChange={(e) => updateSetting("creatorDisplayName", e.target.value)}
                placeholder="Ví dụ: Thầy Đặng Trần Tùng"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold" htmlFor="creator-headline">
                Tiêu đề ngắn & Chứng chỉ (Headline)
              </Label>
              <Input
                id="creator-headline"
                value={settings.creatorHeadline}
                onChange={(e) => updateSetting("creatorHeadline", e.target.value)}
                placeholder="Ví dụ: IELTS 8.5 • 6 năm kinh nghiệm giảng dạy"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold" htmlFor="creator-bio">
              Tiểu sử & Giới thiệu bản thân (Bio)
            </Label>
            <Textarea
              id="creator-bio"
              rows={4}
              value={settings.creatorBio}
              onChange={(e) => updateSetting("creatorBio", e.target.value)}
              placeholder="Chia sẻ về phong cách giảng dạy, mục tiêu giúp đỡ người học..."
            />
            <p className="text-[11px] text-muted-foreground">
              Tối đa 500 ký tự. Xuất hiện tại đầu trang danh mục tác phẩm của bạn.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold flex items-center gap-1.5" htmlFor="creator-website">
                <Globe className="h-3.5 w-3.5 text-muted-foreground" /> Website / Portfolio cá nhân
              </Label>
              <Input
                id="creator-website"
                value={settings.creatorWebsite}
                onChange={(e) => updateSetting("creatorWebsite", e.target.value)}
                placeholder="https://yourwebsite.com"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold flex items-center gap-1.5" htmlFor="creator-youtube">
                <Youtube className="h-3.5 w-3.5 text-red-500" /> Kênh Youtube / TikTok
              </Label>
              <Input
                id="creator-youtube"
                value={settings.creatorYoutube}
                onChange={(e) => updateSetting("creatorYoutube", e.target.value)}
                placeholder="https://youtube.com/@channel"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Creator Notifications */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500">
              <BellRing className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-lg">Thông báo Nhà sáng tạo</CardTitle>
              <CardDescription>
                Nhận cập nhật về phản hồi của học viên và số liệu hoạt động nội dung
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3.5 rounded-lg border bg-card">
            <div className="space-y-0.5 max-w-[80%]">
              <Label className="text-sm font-semibold cursor-pointer" htmlFor="notify-reviews">
                Đánh giá và bình luận mới
              </Label>
              <p className="text-xs text-muted-foreground">
                Gửi thông báo tức thì khi có học viên để lại đánh giá sao hoặc câu hỏi thắc mắc trên khóa học của bạn
              </p>
            </div>
            <Switch
              id="notify-reviews"
              checked={settings.notifyCourseReviews}
              onCheckedChange={(checked) => updateSetting("notifyCourseReviews", checked)}
            />
          </div>

          <div className="flex items-center justify-between p-3.5 rounded-lg border bg-card">
            <div className="space-y-0.5 max-w-[80%]">
              <Label className="text-sm font-semibold cursor-pointer" htmlFor="notify-exams">
                Lượt nộp bài thi thử (Exam submissions)
              </Label>
              <p className="text-xs text-muted-foreground">
                Thông báo tổng kết hàng ngày khi học viên hoàn thành các đề thi do bạn biên soạn
              </p>
            </div>
            <Switch
              id="notify-exams"
              checked={settings.notifyExamCompletions}
              onCheckedChange={(checked) => updateSetting("notifyExamCompletions", checked)}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
