import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Card, CardContent } from "../../ui/card";
import { Badge } from "../../ui/badge";
import { Button } from "../../ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../../ui/tooltip";
import { Mic, Square, Loader2, Crown, Volume2, RotateCcw } from "lucide-react";

export interface SyllableToken {
  text: string;
  status: "correct" | "wrong" | "neutral";
  ipa?: string;
}

export interface PronunciationQuota {
  usedToday: number;
  limitToday: number;
  remaining: number;
  tier: string;
}

interface ShadowingVoiceStudioProps {
  isRecording: boolean;
  isAnalyzing: boolean;
  isExhausted: boolean;
  pronunciationQuota: PronunciationQuota | null;
  mediaStream: MediaStream | null;
  feedback: { accuracy: number; feedback: SyllableToken[] } | null;
  feedbackKey: number;
  recordedAudioUrl: string | null;
  onStartRecording: () => void;
  onStopRecording: () => void;
}

const WAVE_BAR_COUNT = 28;
const BAR_CENTER_Y = 24;
const MAX_BAR_HEIGHT = 40;
const MIN_BAR_HEIGHT = 6;

const getScoreBadgeClass = (score: number) => {
  if (score >= 80) return "bg-emerald-600 text-white hover:bg-emerald-600 border-transparent shadow-sm";
  if (score >= 65) return "bg-amber-500 text-white hover:bg-amber-500 border-transparent shadow-sm";
  if (score >= 50) return "bg-orange-500 text-white hover:bg-orange-500 border-transparent shadow-sm";
  return "bg-rose-600 text-white hover:bg-rose-600 border-transparent shadow-sm";
};

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

function speakWord(rawWord: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  const cleanWord = rawWord.replace(/[^a-zA-Z'-]/g, "").trim();
  if (!cleanWord) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(cleanWord);
  utterance.lang = "en-US";
  utterance.rate = 0.9;
  window.speechSynthesis.speak(utterance);
}

/** Animated idle microphone aura (lightweight SVG + Motion alternative to Lottie JSON). */
function IdleMicBadge() {
  return (
    <div className="relative flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary shrink-0">
      <motion.span
        className="absolute inset-0 rounded-full border border-primary/35"
        animate={{ scale: [1, 1.32, 1], opacity: [0.55, 0, 0.55] }}
        transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        animate={{ scale: [1, 1.07, 1] }}
        transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
        className="flex items-center justify-center"
      >
        <Mic className="h-4 w-4 text-primary" />
      </motion.div>
    </div>
  );
}

/** Live SVG waveform driven directly via Web Audio API AnalyserNode + requestAnimationFrame. */
function AudioWaveformVisualizer({
  isRecording,
  mediaStream,
}: {
  isRecording: boolean;
  mediaStream: MediaStream | null;
}) {
  const rectRefs = useRef<Array<SVGRectElement | null>>([]);
  const [fallbackMode, setFallbackMode] = useState(false);

  useEffect(() => {
    const resetBars = () => {
      rectRefs.current.forEach((rect) => {
        if (!rect) return;
        rect.setAttribute("height", String(MIN_BAR_HEIGHT));
        rect.setAttribute("y", String(BAR_CENTER_Y - MIN_BAR_HEIGHT / 2));
      });
    };

    if (!isRecording || !mediaStream) {
      resetBars();
      setFallbackMode(false);
      return;
    }

    let rafId = 0;
    let audioContext: AudioContext | null = null;
    let source: MediaStreamAudioSourceNode | null = null;

    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) {
        setFallbackMode(true);
        return;
      }

      audioContext = new AudioCtx();
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 128;
      analyser.smoothingTimeConstant = 0.72;

      source = audioContext.createMediaStreamSource(mediaStream);
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      setFallbackMode(false);

      const renderFrame = () => {
        analyser.getByteFrequencyData(dataArray);
        const half = WAVE_BAR_COUNT / 2;

        for (let i = 0; i < WAVE_BAR_COUNT; i++) {
          const rect = rectRefs.current[i];
          if (!rect) continue;

          // Map symmetric distances from center so voice energy radiates cleanly outward
          const distFromCenter = Math.abs(i - (half - 0.5)) / half;
          const binIndex = Math.min(dataArray.length - 1, Math.floor(distFromCenter * 22) + 1);
          const rawValue = dataArray[binIndex] ?? 0;
          const normalized = Math.pow(rawValue / 255, 0.85);
          const barHeight = Math.max(MIN_BAR_HEIGHT, Math.round(MIN_BAR_HEIGHT + normalized * (MAX_BAR_HEIGHT - MIN_BAR_HEIGHT)));

          rect.setAttribute("height", String(barHeight));
          rect.setAttribute("y", String((BAR_CENTER_Y - barHeight / 2).toFixed(1)));
        }

        rafId = requestAnimationFrame(renderFrame);
      };

      rafId = requestAnimationFrame(renderFrame);
    } catch {
      setFallbackMode(true);
    }

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      try {
        source?.disconnect();
      } catch {
        // Ignore disconnect error on already closed tracks
      }
      if (audioContext && audioContext.state !== "closed") {
        audioContext.close().catch(() => {});
      }
      resetBars();
    };
  }, [isRecording, mediaStream]);

  const svgWidth = WAVE_BAR_COUNT * 8;

  return (
    <div className="flex items-center justify-center w-full overflow-hidden">
      <svg
        viewBox={`0 0 ${svgWidth} 48`}
        className="w-full max-w-[260px] h-12 text-rose-500"
        aria-label="Live voice waveform"
      >
        {Array.from({ length: WAVE_BAR_COUNT }).map((_, index) => {
          const x = index * 8 + 2;
          return fallbackMode ? (
            <motion.rect
              key={index}
              x={x}
              width={4}
              rx={2}
              fill="currentColor"
              animate={{
                height: [MIN_BAR_HEIGHT, 16 + ((index * 7) % 20), MIN_BAR_HEIGHT],
                y: [21, 24 - (16 + ((index * 7) % 20)) / 2, 21],
              }}
              transition={{
                duration: 0.65,
                repeat: Infinity,
                delay: (index % 7) * 0.06,
                ease: "easeInOut",
              }}
            />
          ) : (
            <rect
              key={index}
              ref={(el) => {
                rectRefs.current[index] = el;
              }}
              x={x}
              y={BAR_CENTER_Y - MIN_BAR_HEIGHT / 2}
              width={4}
              height={MIN_BAR_HEIGHT}
              rx={2}
              fill="currentColor"
              className="transition-opacity duration-150"
              opacity={0.9}
            />
          );
        })}
      </svg>
    </div>
  );
}

/** Smooth 0 -> N% counter synced with requestAnimationFrame. */
function AnimatedScoreValue({ target, triggerKey }: { target: number; triggerKey: number }) {
  const [displayScore, setDisplayScore] = useState(0);

  useEffect(() => {
    let rafId = 0;
    const startTime = performance.now();
    const duration = 650;
    setDisplayScore(0);

    const tick = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayScore(Math.round(eased * target));
      if (progress < 1) {
        rafId = requestAnimationFrame(tick);
      }
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [target, triggerKey]);

  return <span className="tabular-nums">Score: {displayScore}%</span>;
}

export function ShadowingVoiceStudio({
  isRecording,
  isAnalyzing,
  isExhausted,
  pronunciationQuota,
  mediaStream,
  feedback,
  feedbackKey,
  recordedAudioUrl,
  onStartRecording,
  onStopRecording,
}: ShadowingVoiceStudioProps) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isPlayingBackSelf, setIsPlayingBackSelf] = useState(false);
  const selfAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!isRecording) {
      setElapsedSeconds(0);
      return;
    }
    const timer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [isRecording]);

  useEffect(() => {
    return () => {
      if (selfAudioRef.current) {
        selfAudioRef.current.pause();
      }
    };
  }, [recordedAudioUrl]);

  const handlePlaySelfRecording = () => {
    if (!recordedAudioUrl) return;
    if (selfAudioRef.current) {
      selfAudioRef.current.pause();
    }
    const audio = new Audio(recordedAudioUrl);
    selfAudioRef.current = audio;
    setIsPlayingBackSelf(true);
    audio.onended = () => setIsPlayingBackSelf(false);
    audio.onerror = () => setIsPlayingBackSelf(false);
    audio.play().catch(() => setIsPlayingBackSelf(false));
  };

  return (
    <Card className="shrink-0 overflow-hidden">
      <CardContent className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div className="space-y-1.5 min-w-0">
            <div className="flex items-center gap-2.5">
              <IdleMicBadge />
              <div>
                <h3 className="font-semibold text-lg leading-tight">Voice Analysis</h3>
                <p className="text-sm text-muted-foreground">
                  {isRecording
                    ? "Đang thu giọng nói... nhấn nút tròn để dừng & chấm điểm"
                    : "Bấm nút micro và đọc theo câu phụ đề đang chọn"}
                </p>
              </div>
            </div>

            {pronunciationQuota && (
              <div className="pt-1 flex flex-wrap items-center gap-2">
                <Badge
                  variant={isExhausted ? "destructive" : "secondary"}
                  className="text-xs font-medium"
                >
                  {pronunciationQuota.limitToday === -1
                    ? `Không giới hạn lượt hôm nay (Gói ${pronunciationQuota.tier})`
                    : `Còn ${pronunciationQuota.remaining}/${pronunciationQuota.limitToday} lượt hôm nay`}
                </Badge>
              </div>
            )}
          </div>

          {/* Telegram-inspired Circular Recording Button with Pulse Rings */}
          <div className="flex flex-col items-center gap-1.5 shrink-0 self-center sm:self-auto">
            <div className="relative flex items-center justify-center h-20 w-20">
              <AnimatePresence>
                {isRecording && (
                  <>
                    <motion.span
                      key="pulse-outer"
                      className="absolute inset-0 rounded-full bg-rose-500/25 pointer-events-none"
                      initial={{ scale: 0.75, opacity: 0.7 }}
                      animate={{ scale: 1.38, opacity: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut" }}
                    />
                    <motion.span
                      key="pulse-inner"
                      className="absolute inset-0 rounded-full bg-rose-500/35 pointer-events-none"
                      initial={{ scale: 0.75, opacity: 0.75 }}
                      animate={{ scale: 1.2, opacity: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 1.5, repeat: Infinity, delay: 0.45, ease: "easeOut" }}
                    />
                  </>
                )}
              </AnimatePresence>

              <motion.button
                type="button"
                whileHover={!isAnalyzing && (isRecording || !isExhausted) ? { scale: 1.05 } : undefined}
                whileTap={!isAnalyzing && (isRecording || !isExhausted) ? { scale: 0.94 } : undefined}
                onClick={isRecording ? onStopRecording : onStartRecording}
                disabled={isAnalyzing || (!isRecording && isExhausted)}
                aria-label={isRecording ? "Dừng ghi âm và chấm điểm" : "Bắt đầu ghi âm Shadowing"}
                className={`relative z-10 h-14 w-14 rounded-full flex items-center justify-center transition-colors shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 disabled:cursor-not-allowed ${
                  isRecording
                    ? "bg-rose-600 hover:bg-rose-700 text-white shadow-rose-500/30"
                    : "bg-primary hover:bg-primary/90 text-primary-foreground shadow-primary/25"
                }`}
              >
                {isAnalyzing ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : isRecording ? (
                  <Square className="h-5 w-5 fill-current" />
                ) : (
                  <Mic className="h-6 w-6" />
                )}
              </motion.button>
            </div>

            <span className={`text-xs font-semibold tabular-nums ${isRecording ? "text-rose-600 dark:text-rose-400" : "text-muted-foreground"}`}>
              {isAnalyzing
                ? "Đang chấm..."
                : isRecording
                  ? `Đang thu ${formatDuration(elapsedSeconds)}`
                  : "Start Shadowing"}
            </span>
          </div>
        </div>

        {/* Exhausted Quota Banner */}
        {isExhausted && pronunciationQuota && !isRecording && (
          <div className="mt-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 flex items-center gap-2.5 text-xs sm:text-sm">
            <Crown className="h-4 w-4 shrink-0 text-amber-500" />
            <span>
              Bạn đã sử dụng hết {pronunciationQuota.limitToday}/{pronunciationQuota.limitToday} lượt chấm phát âm AI hôm nay của gói {pronunciationQuota.tier}. Hãy nâng cấp gói để tăng giới hạn luyện tập!
            </span>
          </div>
        )}

        {/* Active Waveform Panel */}
        <AnimatePresence initial={false}>
          {isRecording && (
            <motion.div
              key="waveform-panel"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="mt-4 px-4 py-3 rounded-xl bg-rose-500/10 border border-rose-500/25 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm font-medium text-rose-600 dark:text-rose-400 shrink-0">
                  <span className="h-2.5 w-2.5 rounded-full bg-rose-600 dark:bg-rose-400 animate-pulse" />
                  <span>Đang lắng nghe giọng nói...</span>
                </div>
                <AudioWaveformVisualizer isRecording={isRecording} mediaStream={mediaStream} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Whisper Processing State */}
        <AnimatePresence>
          {isAnalyzing && (
            <motion.div
              key="analyzing-panel"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.18 }}
              className="mt-4 text-sm text-blue-600 dark:text-blue-400 flex items-center gap-2.5 bg-blue-500/10 border border-blue-500/20 px-4 py-3 rounded-xl"
            >
              <Loader2 className="h-4 w-4 animate-spin shrink-0" />
              <span>AI Whisper đang phân tích độ chính xác từng từ...</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Slide-Up Score Card with Animated Counter + Staggered Word Reveal + Solid Underline */}
        <AnimatePresence mode="wait">
          {feedback && (
            <motion.div
              key={`score-card-${feedbackKey}`}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="mt-5 border-t pt-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm text-muted-foreground">Feedback Result</span>
                  {recordedAudioUrl && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handlePlaySelfRecording}
                      className="h-7 px-2.5 text-xs gap-1.5"
                    >
                      <RotateCcw className={`h-3 w-3 ${isPlayingBackSelf ? "animate-spin text-primary" : ""}`} />
                      {isPlayingBackSelf ? "Đang phát..." : "Nghe lại giọng bạn"}
                    </Button>
                  )}
                </div>
                <Badge className={`text-xs font-semibold px-3 py-1 transition-colors ${getScoreBadgeClass(feedback.accuracy)}`}>
                  <AnimatedScoreValue target={feedback.accuracy} triggerKey={feedbackKey} />
                </Badge>
              </div>

              <TooltipProvider delayDuration={100}>
                <div className="p-4 rounded-xl bg-muted/30 border leading-9 text-lg font-medium shadow-inner flex flex-wrap gap-x-1.5 gap-y-1">
                  {feedback.feedback.map((token, ti) => {
                    const displayWord = token.text.trim();
                    if (!displayWord) return null;
                    return (
                      <motion.span
                        key={`${feedbackKey}-${ti}`}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{
                          duration: 0.2,
                          delay: Math.min(ti * 0.05, 0.9),
                          ease: "easeOut",
                        }}
                        className="inline-flex items-baseline"
                      >
                        {token.status === "wrong" ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                onClick={() => speakWord(displayWord)}
                                className="text-rose-600 dark:text-rose-400 underline decoration-solid decoration-2 underline-offset-4 decoration-rose-500 cursor-pointer hover:bg-rose-500/10 rounded px-0.5 transition-colors"
                              >
                                {displayWord}
                              </button>
                            </TooltipTrigger>
                            <TooltipContent className="flex items-center gap-2 max-w-xs" side="top">
                              <Volume2 className="h-3.5 w-3.5 text-primary shrink-0" />
                              <div>
                                {token.ipa ? (
                                  <>
                                    <p className="text-[11px] text-muted-foreground">Phiên âm chuẩn</p>
                                    <p className="font-mono font-bold text-sm">{token.ipa}</p>
                                  </>
                                ) : (
                                  <p className="text-xs font-medium">Bấm vào từ để nghe phát âm mẫu</p>
                                )}
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                            {displayWord}
                          </span>
                        )}
                      </motion.span>
                    );
                  })}
                </div>
              </TooltipProvider>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
