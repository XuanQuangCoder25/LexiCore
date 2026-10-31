import React, { useState, useEffect, useCallback } from "react";
import { motion } from "motion/react";
import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Progress } from "../ui/progress";
import { toast } from "sonner";
import { srsService } from "../../services/srs-service";
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
  ChevronRight
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

  const fetchCards = async () => {
    setLoading(true);
    setIsFinished(false);
    setCurrentCardIndex(0);
    setShowAnswer(false);
    try {
      const res = await srsService.getDueCards(deckId);
      if (res.success && Array.isArray(res.data?.cards) && res.data.cards.length > 0) {
        setDueCards(res.data.cards);
        setTotalDue(res.data.totalDue || res.data.cards.length);
        setCardStartTime(Date.now());
      } else {
        // Fallback: nếu srs không có thẻ nào, lấy danh sách trực tiếp từ creatorService
        const fallbackRes = await creatorService.getFlashcards(deckId);
        if (fallbackRes.success && Array.isArray(fallbackRes.data) && fallbackRes.data.length > 0) {
          const cards = fallbackRes.data.map((fc: any) => ({
            _id: fc._id,
            cardId: fc._id,
            courseId: fc.courseId,
            front: fc.front,
            back: fc.back,
            status: 'Practice'
          }));
          setDueCards(cards);
          setTotalDue(cards.length);
          setCardStartTime(Date.now());
        } else {
          setDueCards([]);
          setTotalDue(0);
        }
      }
    } catch (error) {
      try {
        const fallbackRes = await creatorService.getFlashcards(deckId);
        if (fallbackRes.success && Array.isArray(fallbackRes.data) && fallbackRes.data.length > 0) {
          const cards = fallbackRes.data.map((fc: any) => ({
            _id: fc._id,
            cardId: fc._id,
            courseId: fc.courseId,
            front: fc.front,
            back: fc.back,
            status: 'Practice'
          }));
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
    if (!text || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    window.speechSynthesis.speak(utterance);
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
      toast.success("Tuyệt vời! Bạn đã hoàn thành phiên ôn tập thẻ!");
    }
  };

  const handleNext = useCallback(async (quality: number) => {
    if (!dueCards[currentCardIndex]) return;
    
    const responseTimeMs = Date.now() - cardStartTime;
    const card = dueCards[currentCardIndex];
    
    try {
      await srsService.submitReview({
        cardId: card._id, 
        courseId: card.courseId || deckId,
        quality: quality,
        responseTimeMs
      });
    } catch (error) {
      console.warn("Lỗi khi đồng bộ kết quả ôn tập:", error);
    }
    
    setShowAnswer(false);
    setCardStartTime(Date.now());
    
    if (currentCardIndex + 1 < dueCards.length) {
      setCurrentCardIndex(prev => prev + 1);
    } else {
      setIsFinished(true);
      toast.success("Tuyệt vời! Bạn đã hoàn thành phiên ôn tập thẻ!");
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
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="text-muted-foreground text-sm">Đang tải bộ thẻ từ vựng...</p>
      </div>
    );
  }

  if (dueCards.length === 0 && !isFinished) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center max-w-lg mx-auto">
        <div className="w-20 h-20 bg-amber-100 dark:bg-amber-950/50 rounded-full flex items-center justify-center text-amber-600 dark:text-amber-400 mb-6 shadow-inner">
          <BookOpen className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight mb-2">Bộ thẻ chưa có từ vựng</h2>
        <p className="text-muted-foreground mb-8 text-sm">
          Bộ thẻ này hiện chưa có từ vựng nào được thêm vào. Bạn có thể thêm các thẻ từ vựng mới cho bộ thẻ này trong phần Creator Studio.
        </p>
        <div className="flex gap-3 justify-center">
          <Button size="lg" onClick={onBack} className="gap-2 bg-primary hover:bg-primary/90">
            <ArrowLeft className="w-4 h-4" /> Quay lại bài học
          </Button>
        </div>
      </div>
    );
  }

  if (isFinished) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center max-w-lg mx-auto">
        <div className="w-20 h-20 bg-green-100 dark:bg-green-950/50 rounded-full flex items-center justify-center text-green-600 dark:text-green-400 mb-6 shadow-inner">
          <CheckCircle className="w-12 h-12" />
        </div>
        <h2 className="text-3xl font-extrabold tracking-tight mb-2">Hoàn thành phiên học!</h2>
        <p className="text-muted-foreground mb-8">
          Tuyệt vời! Bạn đã hoàn thành ôn tập tất cả {totalDue || dueCards.length} thẻ từ vựng của bài học.
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Button variant="outline" size="lg" onClick={fetchCards} className="gap-2">
            <RotateCcw className="w-4 h-4" /> Luyện tập lại
          </Button>
          <Button size="lg" onClick={onBack} className="gap-2 bg-primary hover:bg-primary/90">
            <ArrowLeft className="w-4 h-4" /> Quay lại bài học
          </Button>
        </div>
      </div>
    );
  }

  const activeCard = dueCards[currentCardIndex];
  const progress = totalDue > 0 ? ((currentCardIndex) / totalDue) * 100 : 0;

  return (
    <div className="space-y-6 max-w-3xl mx-auto py-2">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-4 border-b">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack} className="gap-1.5">
            <ArrowLeft className="w-4 h-4" /> Quay lại
          </Button>
          <div>
            <h2 className="text-xl font-bold">{deckTitle || "Luyện tập Flashcards"}</h2>
            <p className="text-xs text-muted-foreground">
              Thẻ {currentCardIndex + 1} / {totalDue}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="text-xs px-2 py-1">
            {activeCard?.status || "New"}
          </Badge>
          <div className="w-28 sm:w-36">
            <Progress value={progress} className="h-2" />
          </div>
        </div>
      </div>

      {/* 3D Flipping Card */}
      <div className="flex justify-center perspective-1000 py-4">
        <motion.div 
          className="w-full min-h-[340px] cursor-pointer relative select-none"
          onClick={handleFlip}
          animate={{ rotateX: showAnswer ? 180 : 0 }}
          transition={{ duration: 0.5, type: "spring", stiffness: 260, damping: 22 }}
          style={{ transformStyle: "preserve-3d" }}
        >
          {/* Mặt trước (Front) */}
          <Card 
            className="absolute inset-0 w-full h-full border-2 hover:border-primary/50 shadow-lg rounded-2xl overflow-hidden transition-all bg-card"
            style={{ backfaceVisibility: "hidden" }}
          >
            <CardContent className="p-8 h-full flex flex-col justify-between items-center text-center relative">
              <div className="w-full flex justify-between items-center text-xs text-muted-foreground">
                <span className="font-semibold uppercase tracking-wider text-primary">Từ vựng (Front)</span>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  onClick={(e) => { e.stopPropagation(); speakText(activeCard?.front); }}
                  title="Phát âm"
                >
                  <Volume2 className="h-4 w-4" />
                </Button>
              </div>

              <div className="my-auto py-6">
                <h3 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground whitespace-pre-wrap leading-relaxed">
                  {activeCard?.front}
                </h3>
              </div>

              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Eye className="h-3.5 w-3.5" />
                <span>Bấm vào thẻ hoặc phím Space để xem nghĩa</span>
              </div>
            </CardContent>
          </Card>

          {/* Mặt sau (Back) */}
          <Card 
            className="absolute inset-0 w-full h-full border-2 border-primary/40 shadow-lg rounded-2xl overflow-hidden bg-gradient-to-br from-card to-primary/5"
            style={{ backfaceVisibility: "hidden", transform: "rotateX(180deg)" }}
          >
            <CardContent className="p-8 h-full flex flex-col justify-between items-center text-center relative">
              <div className="w-full flex justify-between items-center text-xs text-muted-foreground">
                <span className="font-semibold uppercase tracking-wider text-primary">Ý nghĩa & Giải thích (Back)</span>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  onClick={(e) => { e.stopPropagation(); speakText(activeCard?.front); }}
                  title="Phát âm"
                >
                  <Volume2 className="h-4 w-4" />
                </Button>
              </div>

              <div className="my-auto py-4 space-y-3 w-full max-w-md">
                <h4 className="text-2xl font-bold text-primary">
                  {activeCard?.front}
                </h4>
                <div className="pt-3 border-t">
                  <p className="text-xl sm:text-2xl font-semibold text-foreground whitespace-pre-wrap leading-relaxed">
                    {activeCard?.back}
                  </p>
                </div>
              </div>

              <div className="text-xs text-muted-foreground">
                Đánh giá mức độ ghi nhớ của bạn bên dưới
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* SRS Controls */}
      <div className="min-h-[64px] flex items-center justify-center">
        {showAnswer ? (
          <div className="flex flex-wrap gap-2.5 sm:gap-4 justify-center animate-in fade-in slide-in-from-bottom-3 duration-300 w-full">
            <Button 
              variant="outline" 
              onClick={() => handleNext(0)} 
              className="flex-1 max-w-[130px] border-red-200 dark:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-950/40 text-red-600 dark:text-red-400 font-semibold"
            >
              <XCircle className="h-4 w-4 mr-1.5" /> Sai (1)
            </Button>
            <Button 
              variant="outline" 
              onClick={() => handleNext(2)} 
              className="flex-1 max-w-[130px] border-orange-200 dark:border-orange-900/50 hover:bg-orange-50 dark:hover:bg-orange-950/40 text-orange-600 dark:text-orange-400 font-semibold"
            >
              <Clock className="h-4 w-4 mr-1.5" /> Khó (2)
            </Button>
            <Button 
              variant="outline" 
              onClick={() => handleNext(4)} 
              className="flex-1 max-w-[130px] border-blue-200 dark:border-blue-900/50 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-semibold"
            >
              <CheckCircle className="h-4 w-4 mr-1.5" /> Nhớ (3)
            </Button>
            <Button 
              variant="outline" 
              onClick={() => handleNext(5)} 
              className="flex-1 max-w-[130px] border-green-200 dark:border-green-900/50 hover:bg-green-50 dark:hover:bg-green-950/40 text-green-600 dark:text-green-400 font-semibold"
            >
              <Sparkles className="h-4 w-4 mr-1.5" /> Dễ (4)
            </Button>
          </div>
        ) : (
          <Button 
            size="lg" 
            variant="secondary" 
            onClick={handleFlip} 
            className="w-full max-w-xs font-semibold shadow-sm gap-2"
          >
            <Eye className="w-4 h-4" /> Xem đáp án (Space)
          </Button>
        )}
      </div>

      {/* Navigation Controls */}
      <div className="flex items-center justify-between gap-4 pt-3 border-t">
        <Button
          variant="outline"
          size="sm"
          onClick={handlePrevCard}
          disabled={currentCardIndex === 0}
          className="gap-1.5"
        >
          <ChevronLeft className="w-4 h-4" /> Thẻ trước (←)
        </Button>

        <span className="text-xs text-muted-foreground font-medium hidden sm:inline">
          Dùng phím ← / → để chuyển thẻ, Space để lật thẻ
        </span>

        <Button
          variant="outline"
          size="sm"
          onClick={handleNextCard}
          disabled={currentCardIndex + 1 >= dueCards.length}
          className="gap-1.5"
        >
          Thẻ tiếp theo (→) <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
