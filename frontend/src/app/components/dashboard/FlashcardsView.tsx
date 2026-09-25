import { useState, useEffect, useCallback } from "react";
import { motion } from "motion/react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Progress } from "../ui/progress";
import { Input } from "../ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { toast } from "sonner";
import { srsService } from "../../services/srs-service";
import { 
  Brain, 
  RotateCcw, 
  Volume2, 
  Eye, 
  EyeOff,
  CheckCircle,
  XCircle,
  Plus,
  Search,
  BookOpen,
  Clock,
  Target,
  TrendingUp,
  Shuffle
} from "lucide-react";

export function FlashcardsView() {
  const [currentView, setCurrentView] = useState<"overview" | "study">("overview");
  const [showAnswer, setShowAnswer] = useState(false);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [dueCards, setDueCards] = useState<any[]>([]);
  const [totalDue, setTotalDue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [decks, setDecks] = useState<any[]>([]);
  const [activeDeck, setActiveDeck] = useState<any>(null);
  
  // Thời gian bắt đầu xem thẻ để tính responseTime
  const [cardStartTime, setCardStartTime] = useState<number>(0);

  useEffect(() => {
    fetchDecks();
  }, []);

  const fetchDecks = async () => {
    try {
      const res = await srsService.getDecks();
      if (res.success) {
        setDecks(res.data);
      }
    } catch (error) {
      toast.error("Không thể tải danh sách khóa học");
    }
  };

  const fetchDueCards = async (deckId: string) => {
    setLoading(true);
    try {
      const res = await srsService.getDueCards(deckId);
      if (res.success) {
        setDueCards(res.data.cards);
        setTotalDue(res.data.totalDue);
      }
    } catch (error) {
      toast.error("Lỗi khi tải thẻ học");
    } finally {
      setLoading(false);
    }
  };

  const handleStudyDeck = (deck: any) => {
    setActiveDeck(deck);
    fetchDueCards(deck._id);
    setCurrentView("study");
    setShowAnswer(false);
    setCurrentCardIndex(0);
    setCardStartTime(Date.now());
  };

  const handleFlip = () => {
    setShowAnswer(!showAnswer);
  };

  const handleNext = useCallback(async (quality: number) => {
    if (!dueCards[currentCardIndex]) return;
    
    const responseTimeMs = Date.now() - cardStartTime;
    const card = dueCards[currentCardIndex];
    
    try {
      await srsService.submitReview({
        cardId: card._id, 
        courseId: card.courseId,
        quality: quality,
        responseTimeMs
      });
      
      setShowAnswer(false);
      setCardStartTime(Date.now());
      
      if (currentCardIndex + 1 < dueCards.length) {
        setCurrentCardIndex(prev => prev + 1);
      } else {
        toast.success("Tuyệt vời! Bạn đã hoàn thành phiên học!");
        fetchDecks(); // Cập nhật lại stat
        setCurrentView("overview");
      }
    } catch (error) {
      toast.error("Lỗi khi đồng bộ kết quả");
    }
  }, [dueCards, currentCardIndex, cardStartTime]);

  // Bắt sự kiện bàn phím
  useEffect(() => {
    if (currentView !== "study") return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!showAnswer && e.code === "Space") {
        e.preventDefault();
        setShowAnswer(true);
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
  }, [currentView, showAnswer, handleNext]);

  const handleBackToOverview = () => {
    setCurrentView("overview");
    setShowAnswer(false);
    fetchDecks();
  };

  if (currentView === "study") {
    const activeCard = dueCards[currentCardIndex];
    const progress = totalDue > 0 ? ((currentCardIndex) / totalDue) * 100 : 0;
    
    const cardsLeft = Math.max(0, totalDue - currentCardIndex);
    const estimatedMinutes = Math.ceil((cardsLeft * 15) / 60);

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Button variant="ghost" onClick={handleBackToOverview} className="mb-2">
              ← Trở về
            </Button>
            <h1 className="text-3xl font-bold">{activeDeck?.title}</h1>
            {totalDue > 0 && (
              <p className="text-muted-foreground">
                Thẻ {currentCardIndex + 1} / {totalDue} • <span className="text-blue-500 font-medium">Ước tính: ~{estimatedMinutes} phút</span>
              </p>
            )}
          </div>
          <div className="text-right">
            <Badge className="mb-2">{activeCard?.status || "New"}</Badge>
            <div className="w-32">
              <Progress value={progress} className="h-2" />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center p-12">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : dueCards.length === 0 ? (
          <div className="text-center py-20">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold">Không có thẻ nào cần ôn tập!</h2>
            <p className="text-muted-foreground">Bạn đã hoàn thành xong khoá học này hôm nay.</p>
            <Button className="mt-4" onClick={handleBackToOverview}>Quay lại</Button>
          </div>
        ) : (
          <>
            <div className="flex justify-center perspective-1000">
              <motion.div 
                className="w-full max-w-2xl min-h-96 cursor-pointer relative"
                onClick={handleFlip}
                animate={{ rotateX: showAnswer ? 180 : 0 }}
                transition={{ duration: 0.6, type: "spring", stiffness: 260, damping: 20 }}
                style={{ transformStyle: "preserve-3d" }}
              >
                {/* Front of card */}
                <Card className="absolute w-full h-full" style={{ backfaceVisibility: "hidden" }}>
                  <CardContent className="p-8 h-full flex flex-col justify-center items-center text-center">
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <h2 className="text-4xl font-bold whitespace-pre-wrap leading-relaxed">
                          {activeCard?.front}
                        </h2>
                      </div>
                      <div className="flex items-center justify-center gap-2 text-muted-foreground mt-8">
                        <Eye className="h-4 w-4" />
                        <span className="text-sm">Bấm để lật thẻ (Space)</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Back of card */}
                <Card 
                  className="absolute w-full h-full"
                  style={{ backfaceVisibility: "hidden", transform: "rotateX(180deg)" }}
                >
                  <CardContent className="p-8 h-full flex flex-col justify-center items-center text-center">
                    <div className="space-y-6 w-full max-w-md">
                      <div className="space-y-4">
                        <h3 className="text-2xl font-bold text-primary">
                          {activeCard?.front}
                        </h3>
                        <div className="text-left space-y-3 pt-4 border-t">
                          <p className="text-lg whitespace-pre-wrap leading-relaxed">
                            {activeCard?.back}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>

            {/* Study Controls */}
            {showAnswer && (
              <div className="flex justify-center animate-in fade-in slide-in-from-bottom-4 duration-300 pt-6">
                <div className="flex gap-4">
                  <Button variant="outline" onClick={() => handleNext(0)} className="hover:bg-red-50 hover:text-red-600 hover:border-red-200">
                    <XCircle className="h-4 w-4 mr-2 text-red-500" /> Sai (1)
                  </Button>
                  <Button variant="outline" onClick={() => handleNext(2)} className="hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200">
                    <Clock className="h-4 w-4 mr-2 text-orange-500" /> Khó (2)
                  </Button>
                  <Button variant="outline" onClick={() => handleNext(4)} className="hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200">
                    <CheckCircle className="h-4 w-4 mr-2 text-blue-500" /> Nhớ (3)
                  </Button>
                  <Button variant="outline" onClick={() => handleNext(5)} className="hover:bg-green-50 hover:text-green-600 hover:border-green-200">
                    <CheckCircle className="h-4 w-4 mr-2 text-green-500" /> Dễ (4)
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Học Flashcards</h1>
        <p className="text-muted-foreground">Luyện từ vựng với thuật toán lặp lại ngắt quãng (Spaced Repetition)</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Khoá học</p>
                <p className="text-2xl font-bold">{decks.length}</p>
              </div>
              <BookOpen className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="my-decks" className="space-y-6">
        <TabsList>
          <TabsTrigger value="my-decks">Khoá học của tôi</TabsTrigger>
        </TabsList>

        <TabsContent value="my-decks" className="space-y-6">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {decks.length === 0 ? (
              <p className="text-muted-foreground">Chưa có khoá học nào được xuất bản. Vui lòng vào Creator Studio để tạo.</p>
            ) : (
              decks.map((deck) => (
                <Card key={deck._id} className="hover:shadow-lg transition-all duration-300 group">
                  <CardHeader>
                    <div className="flex items-start justify-between mb-2">
                      {deck.thumbnail ? (
                        <img src={deck.thumbnail} alt={deck.title} className="w-12 h-12 rounded-lg object-cover" />
                      ) : (
                        <div className="p-2 rounded-lg bg-blue-500 bg-opacity-10">
                          <Brain className="h-6 w-6 text-blue-500" />
                        </div>
                      )}
                      <Badge variant="outline">{deck.category}</Badge>
                    </div>
                    <CardTitle className="group-hover:text-primary transition-colors">
                      {deck.title}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground truncate">{deck.description || "Không có mô tả"}</p>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Tiến độ</span>
                        <span>{deck.totalCards > 0 ? Math.round((deck.studiedCards / deck.totalCards) * 100) : 0}%</span>
                      </div>
                      <Progress 
                        value={deck.totalCards > 0 ? (deck.studiedCards / deck.totalCards) * 100 : 0} 
                        className="h-2" 
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-center">
                      <div>
                        <p className="text-lg font-bold text-blue-600">{deck.newCards}</p>
                        <p className="text-xs text-muted-foreground">Thẻ mới</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold text-orange-600">{deck.reviewCards}</p>
                        <p className="text-xs text-muted-foreground">Cần ôn tập</p>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button 
                        className="flex-1" 
                        onClick={() => handleStudyDeck(deck)}
                        disabled={deck.totalCards === 0}
                      >
                        <BookOpen className="h-4 w-4 mr-2" />
                        {deck.totalCards === 0 ? "Chưa có thẻ" : "Học ngay"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}