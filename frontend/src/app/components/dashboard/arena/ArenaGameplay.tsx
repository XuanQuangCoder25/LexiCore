import React, { useState, useEffect } from 'react';
import {
  Swords,
  Timer,
  Zap,
  ArrowLeft,
  Flame,
  Award,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { MatchedPayload } from '../../../services/arena-socket.service';
import { getRankBadgeUrl } from '../../../services/arena-service';

export interface ArenaGameplayProps {
  matchData: MatchedPayload | null;
  onExitMatch: () => void;
  onFinishMatch?: () => void;
}

export const ArenaGameplay: React.FC<ArenaGameplayProps> = ({
  matchData,
  onExitMatch,
  onFinishMatch,
}) => {
  const [timeLeft, setTimeLeft] = useState<number>(
    matchData?.timeLimitSec || 360
  );
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [myScore, setMyScore] = useState<number>(0);
  const [opponentScore, setOpponentScore] = useState<number>(0);
  const [myStreak, setMyStreak] = useState<number>(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [answeredState, setAnsweredState] = useState<
    'idle' | 'correct' | 'wrong'
  >('idle');

  // Đếm ngược thời gian trận đấu
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onFinishMatch?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [onFinishMatch]);

  // Giả lập bot đối thủ thỉnh thoảng ghi điểm
  useEffect(() => {
    const botInterval = setInterval(() => {
      setOpponentScore((prev) => prev + Math.floor(Math.random() * 20) + 10);
    }, 4500);
    return () => clearInterval(botInterval);
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs
      .toString()
      .padStart(2, '0')}`;
  };

  const p1 = matchData?.me;
  const p2 = matchData?.opponent;

  // Câu hỏi demo trực quan cho đến khi nhận từ server socket
  const sampleQuestions = [
    {
      word: 'Resilient',
      phonetic: '/rɪˈzɪl.jənt/',
      type: 'Adjective',
      meaningHint: 'Có khả năng phục hồi nhanh chóng sau khó khăn',
      options: [
        { id: 0, text: 'Kiên cường, có khả năng phục hồi', isCorrect: true },
        { id: 1, text: 'Dễ vỡ, mỏng manh', isCorrect: false },
        { id: 2, text: 'Chần chừ, do dự', isCorrect: false },
        { id: 3, text: 'Bảo thủ, cố chấp', isCorrect: false },
      ],
    },
    {
      word: 'Ephemeral',
      phonetic: '/ɪˈfem.ər.əl/',
      type: 'Adjective',
      meaningHint: 'Chỉ tồn tại trong một khoảng thời gian rất ngắn',
      options: [
        { id: 0, text: 'Vĩnh cửu, trường tồn', isCorrect: false },
        { id: 1, text: 'Phù du, ngắn ngủi, chóng tàn', isCorrect: true },
        { id: 2, text: 'Bí ẩn, khó hiểu', isCorrect: false },
        { id: 3, text: 'Hùng vĩ, tráng lệ', isCorrect: false },
      ],
    },
  ];

  const currentQ = sampleQuestions[currentQuestionIndex % sampleQuestions.length];

  const handleSelectAnswer = (optionIndex: number, isCorrect: boolean) => {
    if (answeredState !== 'idle') return;
    setSelectedAnswer(optionIndex);

    if (isCorrect) {
      setAnsweredState('correct');
      setMyScore((s) => s + 30 + myStreak * 5);
      setMyStreak((s) => s + 1);
    } else {
      setAnsweredState('wrong');
      setMyStreak(0);
    }

    setTimeout(() => {
      setSelectedAnswer(null);
      setAnsweredState('idle');
      setCurrentQuestionIndex((prev) => prev + 1);
    }, 1200);
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 animate-in fade-in zoom-in-95 duration-300 select-none">
      {/* ── TOP BAR: ĐIỀU HƯỚNG & ĐỒNG HỒ & TỈ SỐ ── */}
      <div className="flex items-center justify-between bg-card/80 backdrop-blur-md border border-border/80 rounded-2xl p-4 shadow-lg">
        {/* Nút thoát */}
        <button
          onClick={onExitMatch}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-muted/60 hover:bg-muted text-xs font-bold transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Rời Đấu Trường</span>
        </button>

        {/* Đồng hồ trận đấu */}
        <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/30 text-primary">
          <Timer className="w-4 h-4 animate-spin [animation-duration:8s]" />
          <span className="font-mono text-base font-black tracking-wider">
            {formatTime(timeLeft)}
          </span>
        </div>

        {/* Câu hỏi tiến độ */}
        <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
          <span>Câu</span>
          <span className="text-foreground font-black text-sm">
            {currentQuestionIndex + 1}
          </span>
          <span>/ 25</span>
        </div>
      </div>

      {/* ── THANH ĐỐI ĐẦU ĐIỂM SỐ 2 NGƯỜI CHƠI (VS SCOREBOARD) ── */}
      <div className="grid grid-cols-2 gap-4">
        {/* Player 1 (Bạn) */}
        <div className="bg-gradient-to-r from-primary/15 to-card border-2 border-primary/40 rounded-2xl p-4 flex items-center justify-between shadow-md relative overflow-hidden">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl border border-primary/50 overflow-hidden bg-primary/10 flex items-center justify-center relative">
              {p1?.avatar_url ? (
                <img
                  src={p1.avatar_url}
                  alt={p1.full_name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="font-black text-lg text-primary">
                  {p1?.full_name?.charAt(0) || 'P'}
                </span>
              )}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-black text-sm text-foreground truncate max-w-[120px] sm:max-w-[180px]">
                  {p1?.full_name || 'Bạn'}
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/20 text-primary font-bold">
                  BẠN
                </span>
              </div>
              <div className="flex items-center gap-1 mt-0.5">
                <img
                  src={getRankBadgeUrl(p1?.arena_rank || 'BRONZE')}
                  alt={p1?.arena_rank}
                  className="w-4 h-4 object-contain"
                />
                <span className="text-[11px] font-bold text-muted-foreground">
                  {p1?.rank_point || 0} LP
                </span>
              </div>
            </div>
          </div>

          {/* Điểm số & Streak */}
          <div className="text-right">
            <div className="text-2xl sm:text-3xl font-black text-primary font-mono tracking-tight drop-shadow-sm">
              {myScore}
            </div>
            {myStreak > 1 && (
              <div className="flex items-center justify-end gap-1 text-[11px] font-black text-amber-500 animate-bounce">
                <Flame className="w-3.5 h-3.5 fill-amber-500" />
                <span>x{myStreak} STREAK</span>
              </div>
            )}
          </div>
        </div>

        {/* Player 2 (Đối thủ) */}
        <div className="bg-gradient-to-l from-rose-500/15 to-card border-2 border-rose-500/30 rounded-2xl p-4 flex items-center justify-between shadow-md relative overflow-hidden">
          {/* Điểm số đối thủ */}
          <div className="text-left">
            <div className="text-2xl sm:text-3xl font-black text-rose-500 font-mono tracking-tight drop-shadow-sm">
              {opponentScore}
            </div>
            <div className="text-[11px] font-bold text-muted-foreground">
              ĐIỂM ĐỐI THỦ
            </div>
          </div>

          <div className="flex items-center gap-3 text-right">
            <div>
              <div className="flex items-center justify-end gap-1.5">
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400 font-bold">
                  ĐỐI THỦ
                </span>
                <span className="font-black text-sm text-foreground truncate max-w-[120px] sm:max-w-[180px]">
                  {p2?.full_name || 'Đối thủ'}
                </span>
              </div>
              <div className="flex items-center justify-end gap-1 mt-0.5">
                <span className="text-[11px] font-bold text-muted-foreground">
                  {p2?.rank_point || 0} LP
                </span>
                <img
                  src={getRankBadgeUrl(p2?.arena_rank || 'BRONZE')}
                  alt={p2?.arena_rank}
                  className="w-4 h-4 object-contain"
                />
              </div>
            </div>
            <div className="w-12 h-12 rounded-xl border border-rose-500/40 overflow-hidden bg-rose-500/10 flex items-center justify-center relative">
              {p2?.avatar_url ? (
                <img
                  src={p2.avatar_url}
                  alt={p2.full_name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="font-black text-lg text-rose-400">
                  {p2?.full_name?.charAt(0) || 'E'}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── KHU VỰC THI ĐẤU CHÍNH (QUESTION CARD) ── */}
      <div className="bg-card border-2 border-border/80 rounded-3xl p-6 sm:p-10 shadow-2xl relative overflow-hidden">
        {/* Glow hiệu ứng nền */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-32 bg-primary/10 rounded-full blur-[80px] pointer-events-none" />

        {/* Header câu hỏi */}
        <div className="text-center space-y-2 mb-8 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-muted/80 text-muted-foreground text-xs font-bold">
            <span>{currentQ.type}</span>
            <span>•</span>
            <span className="font-mono">{currentQ.phonetic}</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-black text-foreground tracking-tight">
            {currentQ.word}
          </h2>

          <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto">
            Gợi ý: {currentQ.meaningHint}
          </p>
        </div>

        {/* 4 Lựa chọn đáp án A B C D */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 relative z-10 max-w-3xl mx-auto">
          {currentQ.options.map((opt, idx) => {
            const label = ['A', 'B', 'C', 'D'][idx];
            const isSelected = selectedAnswer === idx;

            let btnStyle =
              'border-border/80 bg-background/60 hover:bg-muted/60 hover:border-primary/50 text-foreground';

            if (isSelected) {
              if (answeredState === 'correct') {
                btnStyle =
                  'border-emerald-500 bg-emerald-500/20 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.3)] animate-pulse';
              } else if (answeredState === 'wrong') {
                btnStyle =
                  'border-rose-500 bg-rose-500/20 text-rose-400 shadow-[0_0_20px_rgba(244,63,94,0.3)] animate-shake';
              }
            }

            return (
              <button
                key={opt.id}
                onClick={() => handleSelectAnswer(idx, opt.isCorrect)}
                disabled={answeredState !== 'idle'}
                className={`flex items-center gap-4 p-4 rounded-2xl border-2 text-left font-semibold transition-all duration-200 active:scale-[0.98] ${btnStyle}`}
              >
                <div className="w-8 h-8 rounded-xl bg-muted/90 border border-border flex items-center justify-center shrink-0 font-black text-xs text-muted-foreground">
                  {label}
                </div>
                <span className="text-sm sm:text-base flex-1">{opt.text}</span>
                {isSelected && answeredState === 'correct' && (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                )}
                {isSelected && answeredState === 'wrong' && (
                  <XCircle className="w-5 h-5 text-rose-400 shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ArenaGameplay;
