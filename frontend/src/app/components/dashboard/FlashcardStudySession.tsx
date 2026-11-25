import React, { useState, useEffect, useCallback } from "react";
import { motion } from "motion/react";
import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { toast } from "sonner";
import { srsService, previewSM2Intervals } from "../../services/srs-service";
import { creatorService } from "../../services/creator-service";
import { 
  ArrowLeft, 
  RotateCcw, 
  Volume2, 
  Eye, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Sparkles,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Activity
} from "lucide-react";

interface FlashcardStudySessionProps {
  deckId: string;
  deckTitle?: string;
  onBack: () => void;
}

export function FlashcardStudySession({ deckId, deckTitle, onBack }: FlashcardStudySessionProps) {
  const [showAnswer, setShowAnswer] = useState(false);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [dueCards, setDueCards] = useState<any[]>([]);
  const [totalDue, setTotalDue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [cardStartTime, setCardStartTime] = useState<number>(Date.now());
  const [isFinished, setIsFinished] = useState(false);

  const normalizeCard = (fc: any, defaultStatus = "New") => ({
    ...fc,
    _id: fc._id || fc.cardId,
    cardId: fc.cardId || fc._id,
    courseId: fc.courseId,
    front: fc.front,
    back: fc.back,
    partOfSpeech: fc.partOfSpeech || "noun",
    phonetic: fc.phonetic || "",
    audioUrl: fc.audioUrl || "",
    example: fc.example || "",
    exampleMeaning: fc.exampleMeaning || "",
    synonyms: fc.synonyms || [],
    note: fc.note || "",
    imageUrl: fc.imageUrl || "",
    easeFactor: Number(fc.easeFactor ?? 2.5),
    interval: Number(fc.interval ?? 0),
    repetitions: Number(fc.repetitions ?? 0),
    status: fc.status || defaultStatus,
    previousReviewDate: fc.previousReviewDate || null,
  });

  const fetchCards = async () => {
    setLoading(true);
    setIsFinished(false);
    setCurrentCardIndex(0);
    setShowAnswer(false);
    try {
      const res = await srsService.getDueCards(deckId);
      if (res.success && Array.isArray(res.data?.cards) && res.data.cards.length > 0) {
        const normalized = res.data.cards.map((c: any) => normalizeCard(c, c.status || "New"));
        setDueCards(normalized);
        setTotalDue(res.data.totalDue || normalized.length);
        setCardStartTime(Date.now());
      } else {
        const fallbackRes = await creatorService.getFlashcards(deckId);
        if (fallbackRes.success && Array.isArray(fallbackRes.data) && fallbackRes.data.length > 0) {
          const cards = fallbackRes.data.map((fc: any) => normalizeCard(fc, "Practice"));
          setDueCards(cards);
          setTotalDue(cards.length);
          setCardStartTime(Date.now());
        } else {
          setDueCards([]);
          setTotalDue(0);
        }
      }
    } catch {
      try {
        const fallbackRes = await creatorService.getFlashcards(deckId);
        if (fallbackRes.success && Array.isArray(fallbackRes.data) && fallbackRes.data.length > 0) {
          const cards = fallbackRes.data.map((fc: any) => normalizeCard(fc, "Practice"));
          setDueCards(cards);
          setTotalDue(cards.length);
          setCardStartTime(Date.now());
        } else {
          toast.error("Không thể tải thẻ từ vựng");
        }
      } catch {
        toast.error("Không thể tải thẻ từ vựng");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCards();
  }, [deckId]);

  const handleFlip = () => {
    setShowAnswer(prev => !prev);
  };

  const speakText = (text: string) => {
    if (!text || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = 0.95;
    window.speechSynthesis.speak(utterance);
  };

  const playAudioOrSpeak = (text: string, audioUrl?: string) => {
    if (audioUrl) {
      try {
        const audio = new Audio(audioUrl);
        audio.play().catch(() => speakText(text));
        return;
      } catch {
        // fallback
      }
    }
    speakText(text);
  };

  const handlePrevCard = () => {
    if (currentCardIndex > 0) {
      setShowAnswer(false);
      setCardStartTime(Date.now());
      setCurrentCardIndex(prev => prev - 1);
    }
  };

  const handleNextCard = () => {
    if (currentCardIndex + 1 < dueCards.length) {
      setShowAnswer(false);
      setCardStartTime(Date.now());
      setCurrentCardIndex(prev => prev + 1);
    } else {
      setIsFinished(true);
      toast.success("Hoàn thành phiên ôn tập thẻ từ vựng.");
    }
  };

  const handleNext = useCallback(async (quality: number) => {
    if (!dueCards[currentCardIndex]) return;
    
    const responseTimeMs = Date.now() - cardStartTime;
    const card = dueCards[currentCardIndex];
    const prevEf = Number(card.easeFactor ?? 2.5);
    const prevInterval = Number(card.interval ?? 0);
    const preview = previewSM2Intervals(card);
    const predicted =
      quality === 0 ? preview.again :
      quality === 2 ? preview.hard :
      quality === 4 ? preview.good : preview.easy;

    let newEf = predicted.easeFactor;
    let newInterval = predicted.interval;
    let newRep = predicted.repetitions;
    let newStatus: string = predicted.status;

    try {
      const res = await srsService.submitReview({
        cardId: card._id, 
        courseId: card.courseId || deckId,
        quality: quality,
        responseTimeMs
      });

      if (res?.delta) {
        newEf = Number(res.delta.newEaseFactor ?? newEf);
        newInterval = Number(res.delta.newInterval ?? newInterval);
        newRep = Number(res.delta.newRepetitions ?? newRep);
        newStatus = res.delta.newStatus || newStatus;
      } else if (res?.data) {
        newEf = Number(res.data.easeFactor ?? newEf);
        newInterval = Number(res.data.interval ?? newInterval);
        newRep = Number(res.data.repetitions ?? newRep);
        newStatus = res.data.status || newStatus;
      }

      // Phát sự kiện để Dashboard tự động refetch real-time
      window.dispatchEvent(new CustomEvent("srs:review-updated"));
    } catch (error) {
      console.warn("Lỗi khi đồng bộ kết quả ôn tập:", error);
    }

    // Hiển thị SM-2+ Delta Toast chuẩn Monochrome
    if (quality < 2) {
      toast(
        `Reset: Interval ${prevInterval}d → ${newInterval}d · EF ${prevEf.toFixed(2)} → ${newEf.toFixed(2)} · Status: ${newStatus}`,
        {
          description: "Thẻ được đưa về cuối hàng đợi để ôn lại ngay trong phiên hiện tại.",
        }
      );
    } else {
      toast(
        `SM-2+ Updated: Interval ${prevInterval}d → ${newInterval}d · EF ${prevEf.toFixed(2)} → ${newEf.toFixed(2)} · Status: ${newStatus}`,
        {
          description: `Lần lặp liên tiếp (Rep): ${newRep} · Hẹn ôn lại sau ${newInterval} ngày.`,
        }
      );
    }
    
    setShowAnswer(false);
    setCardStartTime(Date.now());
    
    // Nếu học viên bấm Sai (quality = 0), đưa thẻ đó quay lại cuối hàng đợi của phiên học hiện tại
    if (quality < 2) {
      const requeuedCard = {
        ...card,
        easeFactor: newEf,
        interval: newInterval,
        repetitions: newRep,
        status: newStatus,
        previousReviewDate: new Date().toISOString(),
        isRequeued: true,
      };
      setDueCards(prev => [...prev, requeuedCard]);
      setTotalDue(prev => prev + 1);
      setCurrentCardIndex(prev => prev + 1);
      return;
    }

    if (currentCardIndex + 1 < dueCards.length) {
      setCurrentCardIndex(prev => prev + 1);
    } else {
      setIsFinished(true);
      toast.success("Hoàn thành phiên ôn tập thẻ từ vựng.");
    }
  }, [dueCards, currentCardIndex, cardStartTime, deckId]);

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isFinished) return;
      if (e.code === "Space") {
        e.preventDefault();
        setShowAnswer(prev => !prev);
      } else if (e.code === "ArrowLeft") {
        e.preventDefault();
        handlePrevCard();
      } else if (e.code === "ArrowRight") {
        e.preventDefault();
        handleNextCard();
      } else if (showAnswer) {
        switch (e.key) {
          case "1": handleNext(0); break;
          case "2": handleNext(2); break;
          case "3": handleNext(4); break;
          case "4": handleNext(5); break;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showAnswer, handleNext, isFinished, currentCardIndex, dueCards.length]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-16 space-y-4">
        <div className="w-10 h-10 border-4 border-zinc-900 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-zinc-500 text-sm">Đang tải bộ thẻ từ vựng...</p>
      </div>
    );
  }

  if (dueCards.length === 0 && !isFinished) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center max-w-lg mx-auto">
        <div className="w-16 h-16 bg-zinc-100 rounded-2xl flex items-center justify-center text-zinc-700 mb-5 border border-zinc-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
          <BookOpen className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold tracking-tight text-zinc-900 mb-2">Bộ thẻ chưa có từ vựng</h2>
        <p className="text-zinc-500 mb-6 text-sm leading-relaxed">
          Bộ thẻ này hiện chưa có từ vựng nào được thêm vào. Bạn có thể thêm các thẻ từ vựng mới trong Creator Studio.
        </p>
        <div className="flex gap-3 justify-center">
          <Button 
            onClick={onBack} 
            className="gap-2 bg-[#161616] text-white hover:bg-zinc-800 hover:shadow-[0_4px_12px_rgba(0,0,0,0.12)] active:scale-[0.98] transition-all duration-150 rounded-xl h-10 text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4" /> Quay lại danh sách
          </Button>
        </div>
      </div>
    );
  }

  if (isFinished) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center max-w-lg mx-auto animate-in fade-in duration-300">
        <div className="w-16 h-16 bg-zinc-100 rounded-2xl flex items-center justify-center text-zinc-900 mb-5 border border-zinc-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
          <CheckCircle className="w-8 h-8" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900 mb-2">Hoàn thành phiên học</h2>
        <p className="text-zinc-500 mb-6 text-sm leading-relaxed">
          Bạn đã hoàn thành ôn tập toàn bộ <span className="font-mono font-semibold text-zinc-900">{totalDue || dueCards.length}</span> lượt thẻ với thuật toán Spaced Repetition SM-2 Plus.
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Button 
            variant="outline" 
            onClick={fetchCards} 
            className="gap-2 bg-white text-zinc-900 border border-zinc-200 hover:bg-zinc-50 hover:border-zinc-300 active:scale-[0.98] transition-all duration-150 rounded-xl h-10 text-sm font-medium"
          >
            <RotateCcw className="w-4 h-4" /> Luyện tập lại
          </Button>
          <Button 
            onClick={onBack} 
            className="gap-2 bg-[#161616] text-white hover:bg-zinc-800 hover:shadow-[0_4px_12px_rgba(0,0,0,0.12)] active:scale-[0.98] transition-all duration-150 rounded-xl h-10 text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4" /> Quay lại danh sách
          </Button>
        </div>
      </div>
    );
  }

  const activeCard = dueCards[currentCardIndex];
  const progress = totalDue > 0 ? ((currentCardIndex) / totalDue) * 100 : 0;
  const sm2Preview = previewSM2Intervals(activeCard);

  const renderSrsMiniBadge = () => (
    <div className="inline-flex flex-wrap items-center gap-1.5 bg-zinc-100 border border-zinc-200 text-zinc-700 font-mono text-xs px-2.5 py-1 rounded-lg">
      <Activity className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
      <span>EF: {Number(activeCard?.easeFactor ?? 2.5).toFixed(2)}</span>
      <span className="text-zinc-300">·</span>
      <span>Interval: {Number(activeCard?.interval ?? 0)}d</span>
      <span className="text-zinc-300">·</span>
      <span>Rep: {Number(activeCard?.repetitions ?? 0)}</span>
      <span className="text-zinc-300">·</span>
      <span className="font-semibold text-zinc-900">Status: {activeCard?.status || "New"}</span>
      {activeCard?.isRequeued && (
        <>
          <span className="text-zinc-300">·</span>
          <span className="bg-zinc-900 text-white px-1.5 py-0.2 rounded text-[10px]">Ôn lại</span>
        </>
      )}
    </div>
  );

  return (
    <div className="space-y-6 max-w-3xl mx-auto py-2 animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-zinc-200/80">
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onBack} 
            className="gap-1.5 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg text-xs font-medium"
          >
            <ArrowLeft className="w-4 h-4" /> Quay lại
          </Button>
          <div>
            <h2 className="text-lg font-bold text-zinc-900">{deckTitle || "Luyện tập Flashcards"}</h2>
            <p className="text-xs text-zinc-500 font-mono">
              Thẻ {currentCardIndex + 1} / {totalDue}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-28 sm:w-36 h-1.5 bg-zinc-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-zinc-900 rounded-full transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
              style={{ width: `${Math.min(100, Math.round(progress))}%` }}
            />
          </div>
        </div>
      </div>

      {/* 3D Flipping Card */}
      <div className="flex justify-center perspective-1000 py-2">
        <motion.div 
          id="study-card-flipper"
          className="w-full min-h-[370px] cursor-pointer relative select-none"
          onClick={handleFlip}
          animate={{ rotateX: showAnswer ? 180 : 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          style={{ transformStyle: "preserve-3d" }}
        >
          {/* Mặt trước (Front) */}
          <Card 
            className="absolute inset-0 w-full h-full bg-white border border-zinc-200/80 hover:border-zinc-900 shadow-[0_1px_3px_rgba(0,0,0,0.02)] hover:shadow-[0_10px_26px_-6px_rgba(0,0,0,0.07),0_2px_6px_-1px_rgba(0,0,0,0.04)] rounded-2xl overflow-hidden transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] flex flex-col"
            style={{ backfaceVisibility: "hidden" }}
          >
            <CardContent className="p-6 sm:p-8 h-full flex flex-col justify-between items-center text-center relative overflow-y-auto">
              <div className="w-full flex flex-wrap justify-between items-center gap-2 text-xs text-zinc-500">
                <div className="flex items-center gap-2">
                  <span className="font-semibold uppercase tracking-wider text-[11px] text-zinc-600">Từ vựng (Front)</span>
                  {activeCard?.partOfSpeech && (
                    <span className="text-[11px] font-medium bg-zinc-100 text-zinc-700 border border-zinc-200/60 px-2 py-0.5 rounded-md">
                      {activeCard.partOfSpeech}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {renderSrsMiniBadge()}
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 rounded-full transition-colors"
                    onClick={(e) => { e.stopPropagation(); playAudioOrSpeak(activeCard?.front, activeCard?.audioUrl); }}
                    title="Phát âm"
                  >
                    <Volume2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="my-auto py-6 space-y-3 max-w-lg w-full">
                {activeCard?.imageUrl && (
                  <div className="w-full max-h-40 flex justify-center mb-3">
                    <img src={activeCard.imageUrl} alt={activeCard.front} className="max-h-36 object-contain rounded-xl border border-zinc-200 shadow-sm" />
                  </div>
                )}
                <h3 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-zinc-900 whitespace-pre-wrap leading-tight">
                  {activeCard?.front}
                </h3>
                {activeCard?.phonetic && (
                  <p className="text-base sm:text-lg font-mono text-zinc-500 tracking-wide">
                    {activeCard.phonetic}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                <Eye className="h-3.5 w-3.5" />
                <span>Bấm vào thẻ hoặc nhấn Space để xem nghĩa</span>
              </div>
            </CardContent>
          </Card>

          {/* Mặt sau (Back) */}
          <Card 
            className="absolute inset-0 w-full h-full bg-white border border-zinc-200/90 shadow-[0_1px_3px_rgba(0,0,0,0.02)] rounded-2xl overflow-hidden transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] flex flex-col"
            style={{ backfaceVisibility: "hidden", transform: "rotateX(180deg)" }}
          >
            <CardContent className="p-6 sm:p-8 h-full flex flex-col justify-between items-center text-center relative overflow-y-auto">
              <div className="w-full flex flex-wrap justify-between items-center gap-2 text-xs text-zinc-500">
                <div className="flex items-center gap-2">
                  <span className="font-semibold uppercase tracking-wider text-[11px] text-zinc-600">Ý nghĩa & Ngữ cảnh (Back)</span>
                  {activeCard?.partOfSpeech && (
                    <span className="text-[11px] font-medium bg-zinc-100 text-zinc-700 border border-zinc-200/60 px-2 py-0.5 rounded-md">
                      {activeCard.partOfSpeech}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {renderSrsMiniBadge()}
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 rounded-full transition-colors"
                    onClick={(e) => { e.stopPropagation(); playAudioOrSpeak(activeCard?.front, activeCard?.audioUrl); }}
                    title="Phát âm"
                  >
                    <Volume2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="my-auto py-3 space-y-4 w-full max-w-xl text-left">
                {/* Word & IPA summary */}
                <div className="text-center pb-2 border-b border-zinc-100">
                  <div className="flex items-center justify-center gap-2.5">
                    <span className="text-2xl font-bold text-zinc-900">{activeCard?.front}</span>
                    {activeCard?.phonetic && (
                      <span className="text-sm font-mono text-zinc-500">{activeCard.phonetic}</span>
                    )}
                  </div>
                  <p className="text-lg sm:text-xl font-semibold text-zinc-800 mt-1 whitespace-pre-wrap">
                    {activeCard?.back}
                  </p>
                </div>

                {/* Example sentence & meaning */}
                {(activeCard?.example || activeCard?.exampleMeaning) && (
                  <div className="bg-zinc-50/70 rounded-xl p-3.5 border border-zinc-200/60 space-y-1 text-sm">
                    <div className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-zinc-700" /> Câu ví dụ:
                    </div>
                    {activeCard?.example && (
                      <p className="italic text-zinc-900 font-medium">"{activeCard.example}"</p>
                    )}
                    {activeCard?.exampleMeaning && (
                      <p className="text-zinc-500 text-xs">→ {activeCard.exampleMeaning}</p>
                    )}
                  </div>
                )}

                {/* Synonyms */}
                {activeCard?.synonyms && activeCard.synonyms.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap text-xs">
                    <span className="text-zinc-500 font-medium">Từ đồng nghĩa:</span>
                    {activeCard.synonyms.map((s: string, idx: number) => (
                      <span key={idx} className="bg-zinc-100 text-zinc-800 border border-zinc-200/60 px-2 py-0.5 rounded-md font-medium">
                        {s}
                      </span>
                    ))}
                  </div>
                )}

                {/* Note / Mnemonics */}
                {activeCard?.note && (
                  <div className="bg-zinc-50/80 border border-zinc-200/80 rounded-xl p-3 text-xs text-zinc-700 flex items-start gap-2">
                    <Sparkles className="w-4 h-4 shrink-0 mt-0.5 text-zinc-500" />
                    <div>
                      <span className="font-semibold text-zinc-900">Ghi chú ghi nhớ: </span>
                      {activeCard.note}
                    </div>
                  </div>
                )}
              </div>

              <div className="text-xs text-zinc-400 pt-1">
                Đánh giá mức độ ghi nhớ của bạn bên dưới (Phím 1 - 4)
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* SRS Controls with Predicted Next Intervals */}
      <div className="min-h-[68px] flex items-center justify-center">
        {showAnswer ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3.5 w-full max-w-2xl animate-in fade-in slide-in-from-bottom-2 duration-200">
            <Button 
              variant="outline" 
              onClick={() => handleNext(0)} 
              className="h-auto py-2.5 px-3 flex flex-col items-center justify-center gap-1 bg-white border border-zinc-200 text-zinc-800 hover:border-zinc-900 hover:bg-zinc-900 hover:text-white active:scale-[0.98] transition-all duration-150 rounded-xl shadow-none"
            >
              <span className="flex items-center text-xs sm:text-sm font-semibold">
                <XCircle className="h-3.5 w-3.5 mr-1.5" /> Sai (1)
              </span>
              <span className="font-mono text-[11px] opacity-75">
                {sm2Preview.again.label}
              </span>
            </Button>

            <Button 
              variant="outline" 
              onClick={() => handleNext(2)} 
              className="h-auto py-2.5 px-3 flex flex-col items-center justify-center gap-1 bg-white border border-zinc-200 text-zinc-800 hover:border-zinc-900 hover:bg-zinc-900 hover:text-white active:scale-[0.98] transition-all duration-150 rounded-xl shadow-none"
            >
              <span className="flex items-center text-xs sm:text-sm font-semibold">
                <Clock className="h-3.5 w-3.5 mr-1.5" /> Khó (2)
              </span>
              <span className="font-mono text-[11px] opacity-75">
                {sm2Preview.hard.label}
              </span>
            </Button>

            <Button 
              variant="outline" 
              onClick={() => handleNext(4)} 
              className="h-auto py-2.5 px-3 flex flex-col items-center justify-center gap-1 bg-white border border-zinc-300 text-zinc-900 hover:border-zinc-900 hover:bg-zinc-900 hover:text-white active:scale-[0.98] transition-all duration-150 rounded-xl shadow-none"
            >
              <span className="flex items-center text-xs sm:text-sm font-semibold">
                <CheckCircle className="h-3.5 w-3.5 mr-1.5" /> Nhớ (3)
              </span>
              <span className="font-mono text-[11px] opacity-75">
                {sm2Preview.good.label}
              </span>
            </Button>

            <Button 
              variant="outline" 
              onClick={() => handleNext(5)} 
              className="h-auto py-2.5 px-3 flex flex-col items-center justify-center gap-1 bg-zinc-900 border border-zinc-900 text-white hover:bg-zinc-800 active:scale-[0.98] transition-all duration-150 rounded-xl shadow-none"
            >
              <span className="flex items-center text-xs sm:text-sm font-semibold">
                <Sparkles className="h-3.5 w-3.5 mr-1.5" /> Dễ (4)
              </span>
              <span className="font-mono text-[11px] opacity-80">
                {sm2Preview.easy.label}
              </span>
            </Button>
          </div>
        ) : (
          <Button 
            id="btn-show-answer"
            onClick={handleFlip} 
            className="w-full max-w-xs bg-[#161616] text-white hover:bg-zinc-800 hover:shadow-[0_4px_12px_rgba(0,0,0,0.12)] active:scale-[0.98] transition-all duration-150 rounded-xl font-medium shadow-sm gap-2 h-11 text-sm"
          >
            <Eye className="w-4 h-4" /> Xem đáp án (Space)
          </Button>
        )}
      </div>

      {/* Navigation Controls */}
      <div className="flex items-center justify-between gap-4 pt-3 border-t border-zinc-200/80">
        <Button
          variant="outline"
          size="sm"
          onClick={handlePrevCard}
          disabled={currentCardIndex === 0}
          className="gap-1.5 bg-white text-zinc-700 border border-zinc-200 hover:bg-zinc-50 hover:border-zinc-300 active:scale-[0.98] transition-all duration-150 rounded-xl text-xs font-medium h-9"
        >
          <ChevronLeft className="w-4 h-4" /> Thẻ trước (←)
        </Button>

        <span className="text-xs text-zinc-400 font-medium hidden sm:inline">
          Dùng phím ← / → để chuyển thẻ, Space để lật thẻ, 1-4 để chấm điểm
        </span>

        <Button
          variant="outline"
          size="sm"
          onClick={handleNextCard}
          disabled={currentCardIndex + 1 >= dueCards.length}
          className="gap-1.5 bg-white text-zinc-700 border border-zinc-200 hover:bg-zinc-50 hover:border-zinc-300 active:scale-[0.98] transition-all duration-150 rounded-xl text-xs font-medium h-9"
        >
          Thẻ tiếp theo (→) <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
