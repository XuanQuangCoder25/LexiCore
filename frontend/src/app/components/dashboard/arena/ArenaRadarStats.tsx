import React, { useState, useEffect } from 'react';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import {
  Target,
  Zap,
  BookOpen,
  Clock,
  Trophy,
  Shield,
  Lock,
  ArrowUpRight,
  Loader2,
  TrendingUp,
  CheckCircle2,
  Info,
  Flame,
} from 'lucide-react';
import { arenaService, ArenaRadarStatsData, formatTopicName } from '../../../services/arena-service';
import { Button } from '../../ui/button';

export interface ArenaRadarStatsProps {
  onUpgradePrompt?: () => void;
}

export const ArenaRadarStats: React.FC<ArenaRadarStatsProps> = ({ onUpgradePrompt }) => {
  const [data, setData] = useState<ArenaRadarStatsData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchStats = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await arenaService.getRadarStats();
        if (isMounted) {
          setData(res);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err?.message || 'Không thể tải chỉ số năng lực.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchStats();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleUpgradeClick = () => {
    if (onUpgradePrompt) {
      onUpgradePrompt();
    } else {
      window.dispatchEvent(
        new CustomEvent('navigate-tab', {
          detail: { tab: 'subscription' },
        })
      );
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[380px] space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground font-medium">Đang tính toán chỉ số năng lực Arena...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[350px] p-6 text-center space-y-3 rounded-3xl border bg-card">
        <Info className="w-8 h-8 text-rose-500" />
        <p className="text-sm font-semibold text-foreground">{error || 'Không có dữ liệu phân tích.'}</p>
        <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
          Thử lại
        </Button>
      </div>
    );
  }

  const { isLocked, radar, overview, topicPerformance, cefrBreakdown, recentForm } = data;

  // Chuẩn bị dữ liệu cho biểu đồ Radar 6 Đỉnh Lục Giác
  const radarChartData = [
    {
      subject: 'Độ chính xác',
      score: radar.accuracy,
      fullMark: 100,
      isLocked: false,
    },
    {
      subject: 'Tốc độ phản xạ',
      score: radar.speed,
      fullMark: 100,
      isLocked: false,
    },
    {
      subject: 'Từ vựng cốt lõi',
      score: radar.coreVocab,
      fullMark: 100,
      isLocked: false,
    },
    {
      subject: 'Từ vựng nâng cao',
      score: radar.advancedVocab ?? 0,
      fullMark: 100,
      isLocked: radar.advancedVocab === null,
    },
    {
      subject: 'Thành ngữ & Cụm từ',
      score: radar.idioms ?? 0,
      fullMark: 100,
      isLocked: radar.idioms === null,
    },
    {
      subject: 'Tâm lý thi đấu',
      score: radar.composure ?? 0,
      fullMark: 100,
      isLocked: radar.composure === null,
    },
  ];

  // Danh sách chi tiết 6 đỉnh năng lực ở cột bên phải
  const skillList = [
    {
      key: 'accuracy',
      title: 'Độ chính xác (Accuracy)',
      score: radar.accuracy,
      desc: 'Tỷ lệ trả lời đúng trên tổng số câu hỏi đã thi đấu.',
      icon: Target,
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-500/10',
      isLocked: false,
    },
    {
      key: 'speed',
      title: 'Tốc độ phản xạ (Speed)',
      score: radar.speed,
      desc: `Thời gian phản xạ trung bình: ${((overview.avgTimeMs || 0) / 1000).toFixed(1)}s/từ. Mốc <= 1.2s đạt 100 điểm.`,
      icon: Zap,
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/10',
      isLocked: false,
    },
    {
      key: 'coreVocab',
      title: 'Từ vựng cốt lõi (A1 - B1)',
      score: radar.coreVocab,
      desc: 'Độ thành thạo nền tảng từ vựng cơ bản và trung cấp trong thi đấu.',
      icon: BookOpen,
      color: 'text-sky-500',
      bgColor: 'bg-sky-500/10',
      isLocked: false,
    },
    {
      key: 'advancedVocab',
      title: 'Từ vựng nâng cao (B2 - C2)',
      score: radar.advancedVocab,
      desc: 'Khả năng ứng biến với các từ vựng học thuật cao cấp và hiếm gặp.',
      icon: Shield,
      color: 'text-indigo-400',
      bgColor: 'bg-indigo-500/10',
      isLocked: radar.advancedVocab === null,
      lockMsg: 'Cần leo lên Rank có từ vựng B2 - C2 để mở khóa đánh giá.',
    },
    {
      key: 'idioms',
      title: 'Thành ngữ & Cụm từ (Idioms & Collocations)',
      score: radar.idioms,
      desc: 'Mức độ làm chủ thành ngữ và cụm từ cố định tự nhiên như người bản xứ.',
      icon: TrendingUp,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10',
      isLocked: radar.idioms === null,
      lockMsg: 'Cần leo lên Rank có xuất hiện Idioms để mở khóa.',
    },
    {
      key: 'composure',
      title: 'Tâm lý thi đấu (Match Composure)',
      score: radar.composure,
      desc: 'Tỷ lệ chính xác ở 5 câu hỏi cuối trận khi chịu áp lực đồng hồ đếm ngược.',
      icon: Flame,
      color: 'text-rose-500',
      bgColor: 'bg-rose-500/10',
      isLocked: radar.composure === null,
      lockMsg: 'Cần hoàn thành các trận đấu có tối thiểu 20/25 câu để tính chỉ số này.',
    },
  ];

  return (
    <div className="relative w-full space-y-6">
      {/* ── NẾU BỊ KHÓA (FREE / STARTER): HIỆN PAYWALL MODAL PHỦ TRÊN TOÀN GIAO DIỆN MỜ ── */}
      {isLocked && (
        <div className="absolute inset-0 z-40 flex items-center justify-center p-4 bg-background/60 backdrop-blur-md rounded-3xl animate-in fade-in duration-300">
          <div className="max-w-lg w-full rounded-3xl border-2 border-primary/40 bg-card p-6 sm:p-8 shadow-2xl text-center space-y-5">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/30 text-primary mx-auto flex items-center justify-center shadow-inner">
              <Lock className="w-7 h-7" />
            </div>

            <div className="space-y-2">
              <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-primary/15 text-primary border border-primary/30">
                Quyền Lợi Gói PRO & ELITE
              </span>
              <h3 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
                Mở Khóa Hồ Sơ Năng Lực 6 Chiều
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Nâng cấp lên gói <strong className="text-foreground">PRO</strong> để mở khóa biểu đồ Lục giác Radar đo lường toàn diện 6 đỉnh năng lực, phân tích tốc độ phản xạ và thống kê chủ đề sở trường trong Đấu Trường Arena!
              </p>
            </div>

            <div className="space-y-2 text-left bg-muted/40 p-4 rounded-2xl border border-border/60 text-xs">
              <div className="flex items-center gap-2 text-foreground font-semibold">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Biểu đồ Radar Lục giác phân tích 6 kỹ năng thực chiến</span>
              </div>
              <div className="flex items-center gap-2 text-foreground font-semibold">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Thống kê Top 3 chủ đề sở trường và chủ đề cần khắc phục</span>
              </div>
              <div className="flex items-center gap-2 text-foreground font-semibold">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Phân tích độ thuần thục theo khung tham chiếu CEFR A1 - C2</span>
              </div>
            </div>

            <Button
              onClick={handleUpgradeClick}
              size="lg"
              className="w-full py-5 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-black tracking-wide uppercase shadow-lg shadow-primary/25 cursor-pointer"
            >
              Nâng Cấp Lên PRO Ngay
            </Button>
          </div>
        </div>
      )}

      {/* ── 1. THANH CHỈ SỐ THI ĐẤU CỐT LÕI (OVERVIEW KPIS) ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {/* Tỷ lệ thắng */}
        <div className="p-4 rounded-2xl border bg-card/70 backdrop-blur-md shadow-xs space-y-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Tỷ lệ thắng</p>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-black font-mono text-emerald-500">{overview.winRate}%</span>
            <span className="text-[11px] text-muted-foreground font-medium">({overview.totalWins}/{overview.totalMatches})</span>
          </div>
        </div>

        {/* Độ chính xác */}
        <div className="p-4 rounded-2xl border bg-card/70 backdrop-blur-md shadow-xs space-y-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Độ chính xác</p>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-black font-mono text-sky-400">{overview.overallAccuracy}%</span>
            <span className="text-[11px] text-muted-foreground font-medium">({overview.totalWordsCorrect}/{overview.totalWordsAnswered})</span>
          </div>
        </div>

        {/* Tốc độ phản xạ */}
        <div className="p-4 rounded-2xl border bg-card/70 backdrop-blur-md shadow-xs space-y-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Tốc độ phản xạ</p>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl sm:text-3xl font-black font-mono text-amber-500">
              {((overview.avgTimeMs || 0) / 1000).toFixed(1)}s
            </span>
            <span className="text-[11px] text-muted-foreground font-medium">/ câu</span>
          </div>
        </div>

        {/* Chuỗi thắng dài nhất */}
        <div className="p-4 rounded-2xl border bg-card/70 backdrop-blur-md shadow-xs space-y-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Chuỗi thắng cao nhất</p>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-black font-mono text-indigo-400">{overview.bestStreak}</span>
            <span className="text-[11px] text-muted-foreground font-medium">trận liên tiếp</span>
          </div>
        </div>
      </div>

      {/* ── 2. KHU VỰC TRUNG TÂM: BIỂU ĐỒ RADAR LỤC GIÁC & CHI TIẾT 6 KỸ NĂNG ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Cột trái (lg:col-span-6): Biểu đồ Radar Lục giác 6 Đỉnh */}
        <div className="lg:col-span-6 p-5 sm:p-6 rounded-3xl border bg-card/70 backdrop-blur-md shadow-lg space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <div className="flex items-center gap-2 text-primary font-black uppercase text-xs">
              <Shield className="w-4 h-4" />
              <span>Biểu Đồ Lục Giác Năng Lực (Radar)</span>
            </div>
            <span className="text-[11px] font-bold text-muted-foreground">Thang điểm 100</span>
          </div>

          <div className="w-full h-[320px] sm:h-[360px] flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarChartData} margin={{ top: 20, right: 30, bottom: 20, left: 30 }}>
                <PolarGrid stroke="currentColor" className="text-border/60" />
                <PolarAngleAxis
                  dataKey="subject"
                  tick={{ fill: 'currentColor', fontSize: 11, fontWeight: 700 }}
                  className="text-foreground/85"
                />
                <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="currentColor" className="text-muted-foreground/40 text-[9px]" />
                <Radar
                  name="Điểm Năng Lực"
                  dataKey="score"
                  stroke="#10b981"
                  fill="#10b981"
                  fillOpacity={0.35}
                />
                <Tooltip
                  formatter={(value: any, _name: any, item: any) => {
                    if (item?.payload?.isLocked) return ['Chưa mở khóa', 'Điểm'];
                    return [`${value} / 100`, 'Điểm'];
                  }}
                  contentStyle={{
                    backgroundColor: 'rgba(24, 24, 27, 0.95)',
                    borderColor: 'rgba(63, 63, 70, 0.6)',
                    borderRadius: '12px',
                    fontSize: '12px',
                    color: '#fff',
                  }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          <p className="text-[11px] text-muted-foreground/80 italic text-center">
            Dữ liệu được tổng hợp và đánh giá từ tối đa 50 trận đấu gần nhất của bạn.
          </p>
        </div>

        {/* Cột phải (lg:col-span-6): Danh sách 6 Đỉnh Kỹ Năng chi tiết */}
        <div className="lg:col-span-6 p-5 sm:p-6 rounded-3xl border bg-card/70 backdrop-blur-md shadow-lg space-y-3.5">
          <div className="flex items-center justify-between border-b pb-3">
            <div className="flex items-center gap-2 text-primary font-black uppercase text-xs">
              <Trophy className="w-4 h-4" />
              <span>Phân Tích 6 Kỹ Năng Thi Đấu</span>
            </div>
          </div>

          <div className="space-y-3">
            {skillList.map((skill) => {
              const Icon = skill.icon;
              return (
                <div
                  key={skill.key}
                  className="p-3 rounded-2xl border border-border/50 bg-muted/20 space-y-1.5 transition-colors hover:bg-muted/40"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`w-7 h-7 rounded-lg ${skill.bgColor} ${skill.color} flex items-center justify-center shrink-0`}>
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <span className="font-bold text-xs text-foreground truncate">{skill.title}</span>
                    </div>

                    {skill.isLocked ? (
                      <span className="text-[10px] font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-full border border-border/60 flex items-center gap-1 shrink-0">
                        <Lock className="w-3 h-3 text-muted-foreground" />
                        Chưa mở khóa
                      </span>
                    ) : (
                      <span className="text-sm font-black font-mono text-foreground shrink-0">
                        {skill.score} <span className="text-[10px] text-muted-foreground font-normal">/ 100</span>
                      </span>
                    )}
                  </div>

                  {/* Thanh Progress */}
                  {!skill.isLocked ? (
                    <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, Math.max(0, skill.score ?? 0))}%` }}
                      />
                    </div>
                  ) : null}

                  {/* Diễn giải chi tiết */}
                  <p className="text-[10px] text-muted-foreground leading-relaxed">
                    {skill.isLocked ? skill.lockMsg : skill.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── 3. KHU VỰC THỐNG KÊ CHỦ ĐỀ & PHÂN HẠNG KHUNG CEFR ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Phân tích Chủ Đề (Best & Weak Topics): lg:col-span-7 */}
        <div className="lg:col-span-7 p-5 sm:p-6 rounded-3xl border bg-card/70 backdrop-blur-md shadow-lg space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <div className="flex items-center gap-2 text-primary font-black uppercase text-xs">
              <BookOpen className="w-4 h-4" />
              <span>Hiệu Suất Theo Chủ Đề (Topic Performance)</span>
            </div>
            <span className="text-[11px] font-bold text-muted-foreground">Tỷ lệ thắng</span>
          </div>

          <div className="space-y-4">
            {/* Top chủ đề sở trường */}
            <div>
              <p className="text-[11px] font-bold text-emerald-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Chủ đề sở trường (Thắng cao)</span>
              </p>
              {topicPerformance.bestTopics.length === 0 ? (
                <p className="text-xs text-muted-foreground italic bg-muted/20 p-3 rounded-xl border border-dashed border-border/60">
                  Chưa có chủ đề nào đạt tỷ lệ thắng từ 60% trở lên (tối thiểu 2 trận).
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {topicPerformance.bestTopics.map((top) => (
                    <div key={top.topic} className="p-3 rounded-xl border border-emerald-500/25 bg-emerald-500/5 space-y-1">
                      <p className="font-bold text-xs text-foreground truncate">{formatTopicName(top.topic)}</p>
                      <div className="flex items-baseline justify-between text-[11px]">
                        <span className="font-black font-mono text-emerald-500 text-sm">{top.winRate}%</span>
                        <span className="text-muted-foreground">{top.wins}/{top.totalMatches} trận</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Chủ đề cần cải thiện */}
            <div>
              <p className="text-[11px] font-bold text-amber-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5" />
                <span>Chủ đề cần cải thiện</span>
              </p>
              {topicPerformance.weakTopics.length === 0 ? (
                <p className="text-xs text-muted-foreground italic bg-muted/20 p-3 rounded-xl border border-dashed border-border/60">
                  Không có chủ đề nào dưới 50% tỷ lệ thắng. Phong độ rất đồng đều!
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {topicPerformance.weakTopics.map((top) => (
                    <div key={top.topic} className="p-3 rounded-xl border border-amber-500/25 bg-amber-500/5 space-y-1">
                      <p className="font-bold text-xs text-foreground truncate">{formatTopicName(top.topic)}</p>
                      <div className="flex items-baseline justify-between text-[11px]">
                        <span className="font-black font-mono text-amber-500 text-sm">{top.winRate}%</span>
                        <span className="text-muted-foreground">{top.wins}/{top.totalMatches} trận</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Phân hạng CEFR & Chuỗi 10 trận gần nhất: lg:col-span-5 */}
        <div className="lg:col-span-5 p-5 sm:p-6 rounded-3xl border bg-card/70 backdrop-blur-md shadow-lg space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <div className="flex items-center gap-2 text-primary font-black uppercase text-xs">
              <TrendingUp className="w-4 h-4" />
              <span>Độ Thành Thạo Theo Khung CEFR</span>
            </div>
          </div>

          {/* 3 Cấp bậc CEFR */}
          <div className="space-y-3">
            {/* A1 - A2 */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs font-bold">
                <span>Cơ bản (A1 - A2)</span>
                <span className="font-mono text-emerald-500">{cefrBreakdown.a1_a2.rate}% ({cefrBreakdown.a1_a2.correct}/{cefrBreakdown.a1_a2.total})</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${cefrBreakdown.a1_a2.rate}%` }} />
              </div>
            </div>

            {/* B1 - B2 */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs font-bold">
                <span>Trung cấp (B1 - B2)</span>
                <span className="font-mono text-sky-400">{cefrBreakdown.b1_b2.rate}% ({cefrBreakdown.b1_b2.correct}/{cefrBreakdown.b1_b2.total})</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-sky-400 rounded-full" style={{ width: `${cefrBreakdown.b1_b2.rate}%` }} />
              </div>
            </div>

            {/* C1 - C2 */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs font-bold">
                <span>Cao cấp (C1 - C2 & Idioms)</span>
                <span className="font-mono text-indigo-400">{cefrBreakdown.c1_c2.rate}% ({cefrBreakdown.c1_c2.correct}/{cefrBreakdown.c1_c2.total})</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-indigo-400 rounded-full" style={{ width: `${cefrBreakdown.c1_c2.rate}%` }} />
              </div>
            </div>
          </div>

          {/* Phong độ 10 trận gần nhất */}
          <div className="pt-2 border-t space-y-2">
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Phong độ 10 trận gần nhất</p>
            {recentForm.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">Chưa có lịch sử trận đấu.</p>
            ) : (
              <div className="flex items-center gap-1.5 flex-wrap">
                {recentForm.map((m, idx) => {
                  const isWin = m.result === 'WIN';
                  const isLoss = m.result === 'LOSS';
                  return (
                    <div
                      key={m.matchId || idx}
                      className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs ${
                        isWin
                          ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30'
                          : isLoss
                            ? 'bg-rose-500/15 text-rose-500 border border-rose-500/30'
                            : 'bg-muted text-muted-foreground border border-border/50'
                      }`}
                      title={`${m.result === 'WIN' ? 'Thắng' : m.result === 'LOSS' ? 'Thua' : 'Hòa'} - ${formatTopicName(m.topic)}`}
                    >
                      {m.result === 'WIN' ? 'W' : m.result === 'LOSS' ? 'L' : 'D'}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
