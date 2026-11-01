import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Progress } from "../ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { toast } from "sonner";
import { srsService } from "../../services/srs-service";
import { Brain, BookOpen } from "lucide-react";
import { FlashcardStudySession } from "./FlashcardStudySession";

export function FlashcardsView() {
  const [currentView, setCurrentView] = useState<"overview" | "study">("overview");
  const [decks, setDecks] = useState<any[]>([]);
  const [activeDeck, setActiveDeck] = useState<any>(null);

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

  const handleStudyDeck = (deck: any) => {
    setActiveDeck(deck);
    setCurrentView("study");
  };

  const handleBackToOverview = () => {
    setCurrentView("overview");
    setActiveDeck(null);
    fetchDecks();
  };

  if (currentView === "study" && activeDeck) {
    return (
      <FlashcardStudySession
        deckId={(activeDeck._id || activeDeck.id)?.toString()}
        deckTitle={activeDeck.title}
        onBack={handleBackToOverview}
      />
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-4 md:p-6 animate-in fade-in duration-300">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900">Học Flashcards</h1>
        <p className="text-zinc-500 mt-1 text-sm md:text-base">Luyện từ vựng với thuật toán lặp lại ngắt quãng (Spaced Repetition)</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-white border border-zinc-200/80 rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.02)] transition-all duration-200 hover:border-zinc-300">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">Bộ thẻ hiện có</p>
                <p className="text-2xl font-bold text-zinc-900 mt-0.5">{decks.length}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-zinc-100 text-zinc-700">
                <BookOpen className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="my-decks" className="space-y-6">
        <TabsList className="bg-zinc-100 p-1 rounded-xl border border-zinc-200/60 inline-flex">
          <TabsTrigger 
            value="my-decks"
            className="data-[state=active]:bg-white data-[state=active]:text-zinc-900 data-[state=active]:shadow-sm rounded-lg text-zinc-500 text-xs font-semibold px-4 py-2 transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]"
          >
            Khoá học của tôi
          </TabsTrigger>
        </TabsList>

        <TabsContent value="my-decks" className="space-y-6">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {decks.length === 0 ? (
              <div className="col-span-full text-center p-16 border border-dashed border-zinc-200 rounded-2xl bg-zinc-50/60">
                <BookOpen className="w-10 h-10 mx-auto text-zinc-400 mb-3" />
                <h3 className="text-base font-semibold text-zinc-900">Chưa có bộ thẻ nào</h3>
                <p className="text-sm text-zinc-500 mt-0.5">Vui lòng vào Creator Studio để tạo hoặc khám phá trong Private Space.</p>
              </div>
            ) : (
              decks.map((deck) => (
                <Card 
                  key={deck._id} 
                  className="bg-white border border-zinc-200/80 rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.02)] transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 hover:border-zinc-900 hover:shadow-[0_10px_26px_-6px_rgba(0,0,0,0.07),0_2px_6px_-1px_rgba(0,0,0,0.04)] group flex flex-col justify-between overflow-hidden"
                >
                  <CardHeader className="p-5 pb-3">
                    <div className="flex items-start justify-between mb-3">
                      {deck.thumbnail ? (
                        <img src={deck.thumbnail} alt={deck.title} className="w-11 h-11 rounded-xl object-cover border border-zinc-200/80" />
                      ) : (
                        <div className="p-2.5 rounded-xl bg-zinc-100 text-zinc-800 border border-zinc-200/60">
                          <Brain className="h-5 w-5" />
                        </div>
                      )}
                      {deck.category && (
                        <span className="text-[10px] font-semibold tracking-wider uppercase bg-zinc-100 text-zinc-700 px-2 py-0.5 rounded-md border border-zinc-200/60">
                          {deck.category}
                        </span>
                      )}
                    </div>
                    <CardTitle className="text-lg font-bold text-zinc-900 group-hover:text-zinc-700 transition-colors line-clamp-1">
                      {deck.title}
                    </CardTitle>
                    <p className="text-xs text-zinc-500 line-clamp-2 mt-1">
                      {deck.description || "Bộ thẻ từ vựng với giải nghĩa chi tiết và ngữ cảnh."}
                    </p>
                  </CardHeader>
                  
                  <CardContent className="p-5 pt-0 space-y-4">
                    <div className="space-y-1.5 pt-2 border-t border-zinc-100">
                      <div className="flex justify-between text-xs text-zinc-600 font-medium">
                        <span>Tiến độ ghi nhớ</span>
                        <span className="font-mono">{deck.totalCards > 0 ? Math.round((deck.studiedCards / deck.totalCards) * 100) : 0}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-zinc-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-zinc-900 rounded-full transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
                          style={{ width: `${deck.totalCards > 0 ? Math.min(100, Math.round((deck.studiedCards / deck.totalCards) * 100)) : 0}%` }}
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-center bg-zinc-50/70 p-2.5 rounded-xl border border-zinc-200/50">
                      <div>
                        <p className="text-base font-bold text-zinc-900">{deck.newCards ?? 0}</p>
                        <p className="text-[11px] text-zinc-500">Thẻ mới</p>
                      </div>
                      <div>
                        <p className="text-base font-bold text-zinc-900">{deck.reviewCards ?? 0}</p>
                        <p className="text-[11px] text-zinc-500">Cần ôn tập</p>
                      </div>
                    </div>
                    
                    <div className="pt-1">
                      <Button 
                        className="w-full bg-[#161616] text-white hover:bg-zinc-800 hover:shadow-[0_4px_12px_rgba(0,0,0,0.12)] active:scale-[0.98] transition-all duration-150 rounded-xl h-10 text-sm font-medium gap-2 group/btn" 
                        onClick={() => handleStudyDeck(deck)}
                        disabled={deck.totalCards === 0}
                      >
                        <BookOpen className="h-4 w-4 group-hover/btn:translate-x-0.5 transition-transform duration-200" />
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