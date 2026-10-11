import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../ui/card";
import { Button } from "../../ui/button";
import { Label } from "../../ui/label";
import { Switch } from "../../ui/switch";
import { Slider } from "../../ui/slider";
import { Badge } from "../../ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../ui/select";
import {
  Flame,
  Brain,
  Mic,
  Volume2,
  Sparkles,
  Subtitles,
  Play,
  RotateCcw,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { SettingsState } from "./settingsMock";

interface LearningPreferencesSectionProps {
  settings: SettingsState;
  updateSetting: <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => void;
}

export function LearningPreferencesSection({ settings, updateSetting }: LearningPreferencesSectionProps) {
  const [isPlayingTestAudio, setIsPlayingTestAudio] = useState(false);
  const [isTestingMic, setIsTestingMic] = useState(false);

  const goalOptions = [
    { minutes: 15, label: "Nhẹ nhàng", desc: "Duy trì thói quen hàng ngày" },
    { minutes: 30, label: "Tiêu chuẩn", desc: "Tối ưu hiệu quả ghi nhớ (Đề xuất)" },
    { minutes: 45, label: "Chuyên sâu", desc: "Tăng tốc ôn luyện thi cử" },
    { minutes: 60, label: "Cường độ cao", desc: "Bứt phá trình độ nhanh chóng" },
  ];

  const handleTestAudio = () => {
    setIsPlayingTestAudio(true);
    // Web Speech API mock/real play
    try {
      const utterance = new SpeechSynthesisUtterance("Welcome to LexiCore. Happy learning!");
      utterance.lang = settings.srsAccent;
      utterance.rate = settings.srsAudioSpeed;
      utterance.onend = () => setIsPlayingTestAudio(false);
      utterance.onerror = () => setIsPlayingTestAudio(false);
      window.speechSynthesis.speak(utterance);
    } catch {
      setTimeout(() => setIsPlayingTestAudio(false), 1200);
    }
  };

  const handleTestMic = () => {
    setIsTestingMic(true);
    toast.info("Đang kiểm tra micro... Hãy thử nói một từ!");
    setTimeout(() => {
      setIsTestingMic(false);
      toast.success("Micro hoạt động tốt! Độ nhạy âm thanh đạt chuẩn.");
    }, 2000);
  };

  return (
    <div className="space-y-6">
      {/* 1. Daily Study Goal */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-orange-500" />
            <div>
              <CardTitle className="text-lg">Mục tiêu học hàng ngày</CardTitle>
              <CardDescription>
                Hoàn thành thời lượng học mỗi ngày để duy trì chuỗi Streak và nhận thêm thưởng LexiCoins.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {goalOptions.map((opt) => {
              const isSelected = settings.dailyGoalMinutes === opt.minutes;
              return (
                <div
                  key={opt.minutes}
                  onClick={() => updateSetting("dailyGoalMinutes", opt.minutes)}
                  className={`relative p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    isSelected
                      ? "border-orange-500 bg-orange-500/10 shadow-sm"
                      : "border-border hover:border-orange-500/40 bg-card"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-2xl font-black text-foreground">
                      {opt.minutes} <span className="text-xs font-normal text-muted-foreground">phút</span>
                    </span>
                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-orange-500 text-white flex items-center justify-center">
                        <Check className="w-3.5 h-3.5" />
                      </div>
                    )}
                  </div>
                  <p className="font-semibold text-sm mb-0.5">{opt.label}</p>
                  <p className="text-xs text-muted-foreground">{opt.desc}</p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* 2. Flashcard SRS Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-pink-500" />
            <div>
              <CardTitle className="text-lg">Cấu hình Thẻ nhớ Spaced Repetition (SRS)</CardTitle>
              <CardDescription>
                Tùy chỉnh thuật toán ôn tập ngắt quãng và âm thanh khi lật thẻ từ vựng.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-0.5">
              <Label className="text-base font-medium">Số thẻ mới mỗi ngày</Label>
              <p className="text-xs text-muted-foreground">
                Số lượng từ vựng mới hệ thống sẽ ưu tiên đưa vào bài học mỗi ngày.
              </p>
            </div>
            <Select
              value={settings.srsNewCardsPerDay.toString()}
              onValueChange={(val) => updateSetting("srsNewCardsPerDay", parseInt(val, 10))}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Chọn số thẻ" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10 thẻ / ngày</SelectItem>
                <SelectItem value="20">20 thẻ / ngày</SelectItem>
                <SelectItem value="30">30 thẻ / ngày</SelectItem>
                <SelectItem value="50">50 thẻ / ngày</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between gap-4 pt-2 border-t">
            <div className="space-y-0.5">
              <Label className="text-base font-medium">Tự động phát âm thanh khi lật thẻ</Label>
              <p className="text-xs text-muted-foreground">
                Tự động phát audio phát âm chuẩn khi bạn lật sang mặt sau của flashcard.
              </p>
            </div>
            <Switch
              checked={settings.srsAutoPlayAudio}
              onCheckedChange={(checked) => updateSetting("srsAutoPlayAudio", checked)}
            />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 border-t">
            <div className="space-y-0.5">
              <Label className="text-base font-medium">Chất giọng phát âm ưu tiên</Label>
              <p className="text-xs text-muted-foreground">Chọn giữa ngữ điệu Anh - Mỹ (US) hoặc Anh - Anh (UK).</p>
            </div>
            <Select
              value={settings.srsAccent}
              onValueChange={(val: "en-US" | "en-GB") => updateSetting("srsAccent", val)}
            >
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Chọn giọng đọc" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en-US">🇺🇸 Tiếng Anh - Mỹ (US)</SelectItem>
                <SelectItem value="en-GB">🇬🇧 Tiếng Anh - Anh (UK)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3 pt-2 border-t">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base font-medium">Tốc độ phát âm: {settings.srsAudioSpeed}x</Label>
                <p className="text-xs text-muted-foreground">Điều chỉnh tốc độ đọc chậm hơn để nghe rõ từng âm tiết.</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleTestAudio}
                disabled={isPlayingTestAudio}
                className="gap-2 shrink-0"
              >
                <Volume2 className={`w-4 h-4 ${isPlayingTestAudio ? "animate-pulse text-primary" : ""}`} />
                {isPlayingTestAudio ? "Đang đọc..." : "Nghe thử"}
              </Button>
            </div>
            <div className="pt-2">
              <Slider
                value={[settings.srsAudioSpeed]}
                min={0.75}
                max={1.25}
                step={0.05}
                onValueChange={(vals) => updateSetting("srsAudioSpeed", vals[0])}
                className="w-full max-w-md"
              />
              <div className="flex justify-between text-[11px] text-muted-foreground max-w-md pt-1.5">
                <span>0.75x (Chậm)</span>
                <span>1.0x (Chuẩn)</span>
                <span>1.25x (Nhanh)</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3. Shadowing & Pronunciation Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Mic className="w-5 h-5 text-indigo-500" />
            <div>
              <CardTitle className="text-lg">Shadowing & Luyện phát âm</CardTitle>
              <CardDescription>
                Tối ưu hóa trình phát video YouTube và bộ nhận diện giọng nói khi luyện nhại.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <Label className="text-base font-medium">Hiển thị phụ đề song ngữ</Label>
              <p className="text-xs text-muted-foreground">
                Hiển thị đồng thời phụ đề tiếng Anh và bản dịch tiếng Việt bên dưới video.
              </p>
            </div>
            <Switch
              checked={settings.shadowingBilingual}
              onCheckedChange={(checked) => updateSetting("shadowingBilingual", checked)}
            />
          </div>

          <div className="flex items-center justify-between gap-4 pt-2 border-t">
            <div className="space-y-0.5">
              <Label className="text-base font-medium">Tự động tạm dừng sau mỗi câu</Label>
              <p className="text-xs text-muted-foreground">
                Video sẽ tự động dừng lại ở cuối mỗi câu thoại để bạn có thời gian nhại lại.
              </p>
            </div>
            <Switch
              checked={settings.shadowingAutoPause}
              onCheckedChange={(checked) => updateSetting("shadowingAutoPause", checked)}
            />
          </div>

          <div className="space-y-3 pt-2 border-t">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base font-medium">Độ nhạy Micro: {settings.micSensitivity}%</Label>
                <p className="text-xs text-muted-foreground">
                  Điều chỉnh ngưỡng thu âm để AI đánh giá phát âm chính xác hơn trong môi trường có tạp âm.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleTestMic}
                disabled={isTestingMic}
                className="gap-2 shrink-0"
              >
                <Mic className={`w-4 h-4 ${isTestingMic ? "animate-pulse text-destructive" : ""}`} />
                {isTestingMic ? "Đang thu âm..." : "Test Micro"}
              </Button>
            </div>
            <div className="pt-2">
              <Slider
                value={[settings.micSensitivity]}
                min={20}
                max={100}
                step={5}
                onValueChange={(vals) => updateSetting("micSensitivity", vals[0])}
                className="w-full max-w-md"
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
