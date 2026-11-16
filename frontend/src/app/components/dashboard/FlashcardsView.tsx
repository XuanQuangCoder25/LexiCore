import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { toast } from "sonner";
import { srsService } from "../../services/srs-service";
import { Brain, BookOpen, Eye } from "lucide-react";
import { FlashcardStudySession } from "./FlashcardStudySession";
import { CatalogFilterBar, CatalogEmptyState, SortOption } from "./CatalogFilterBar";

export function FlashcardsView() {
  const [currentView, setCurrentView] = useState<"overview" | "study">("overview");
  const [decks, setDecks] = useState<any[]>([]);
  const [activeDeck, setActiveDeck] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Filter & Search states
  const [search, setSearch] = useState("");
  const [level, setLevel] = useState("ALL");
  const [sort, setSort] = useState<SortOption>("newest");

  const fetchDecks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await srsService.getDecks({
        search,
        level: level === "ALL" ? undefined : level,
        sort,
      });
      if (res.success) {
        setDecks(res.data);
      }
    } catch (error) {
      toast.error("Không thể tải danh sách bộ thẻ");
    } finally {
      setLoading(false);
    }
  }, [search, level, sort]);

  useEffect(() => {
    fetchDecks();
  }, [fetchDecks]);

  const handleStudyDeck = (deck: any) => {
    setActiveDeck(deck);
    setCurrentView("study");
  };

  const handleBackToOverview = () => {
    setCurrentView("overview");
    setActiveDeck(null);
    fetchDecks();
  };

  const handleResetFilters = () => {
    setSearch("");
    setLevel("ALL");
    setSort("newest");
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
        <p className="text-zinc-500 mt-1 text-sm md:text-base">
          Luyện từ vựng với thuật toán lặp lại ngắt quãng (Spaced Repetition)
        </p>
      </div>

      {/* Catalog Filter Bar chuẩn Monochrome */}
      <div className="bg-white p-4 md:p-5 rounded-2xl border border-zinc-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
        <CatalogFilterBar
          search={search}
          onSearchChange={setSearch}
          level={level}
          onLevelChange={setLevel}
          sort={sort}
          onSortChange={setSort}
          totalResults={decks.length}
          resultLabel="bộ thẻ"
          searchPlaceholder="Tìm kiếm bộ thẻ theo tên, từ vựng, chủ đề..."
          onReset={handleResetFilters}
        />
      </div>

      {/* Grid danh sách bộ thẻ */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full py-16 flex flex-col items-center justify-center">
            <div className="w-8 h-8 border-3 border-zinc-900 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs text-zinc-500 mt-3 font-medium">Đang tải danh sách bộ thẻ...</p>
          </div>
        ) : decks.length === 0 ? (
          <CatalogEmptyState
            title="Không tìm thấy bộ thẻ nào"
            description="Hãy thử đổi từ khóa tìm kiếm hoặc chọn cấp bậc khác để khám phá các bộ thẻ Flashcard phù hợp."
            onReset={handleResetFilters}
          />
        ) : (
          decks.map((deck) => (
            <Card
              key={deck._id}
              className="bg-white border border-zinc-200/80 rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.02)] transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 hover:border-zinc-900 hover:shadow-[0_10px_26px_-6px_rgba(0,0,0,0.07),0_2px_6px_-1px_rgba(0,0,0,0.04)] group flex flex-col justify-between overflow-hidden"
            >
              <CardHeader className="p-5 pb-3">
                <div className="flex items-start justify-between mb-3">
                  {deck.thumbnail ? (
                    <img
                      src={deck.thumbnail}
                      alt={deck.title}
                      className="w-11 h-11 rounded-xl object-cover border border-zinc-200/80"
                    />
                  ) : (
                    <div className="p-2.5 rounded-xl bg-zinc-100 text-zinc-800 border border-zinc-200/60">
                      <Brain className="h-5 w-5" />
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 flex-wrap justify-end">
                    {/* Level Badge */}
                    <span className="text-[10px] font-bold tracking-wider uppercase bg-zinc-900 text-white px-2 py-0.5 rounded-md shadow-2xs font-mono">
                      {deck.level || "B1"}
                    </span>
                    {/* Views Count Badge */}
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-zinc-500 bg-zinc-100/90 border border-zinc-200/60 px-2 py-0.5 rounded-md font-mono">
                      <Eye className="w-3 h-3 text-zinc-400" />
                      {deck.viewsCount || 0}
                    </span>
                  </div>
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
                    <span className="font-mono">
                      {deck.totalCards > 0 ? Math.round((deck.studiedCards / deck.totalCards) * 100) : 0}%
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-zinc-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-zinc-900 rounded-full transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
                      style={{
                        width: `${deck.totalCards > 0 ? Math.min(100, Math.round((deck.studiedCards / deck.totalCards) * 100)) : 0}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-center bg-zinc-50/70 p-2.5 rounded-xl border border-zinc-200/50">
                  <div>
                    <p className="text-base font-bold text-zinc-900 font-mono">{deck.newCards ?? 0}</p>
                    <p className="text-[11px] text-zinc-500">Thẻ mới</p>
                  </div>
                  <div>
                    <p className="text-base font-bold text-zinc-900 font-mono">{deck.reviewCards ?? 0}</p>
                    <p className="text-[11px] text-zinc-500">Cần ôn tập</p>
                  </div>
                </div>

                <div className="pt-1">
                  <Button
                    className="w-full bg-zinc-900 text-white hover:bg-zinc-800 hover:shadow-[0_4px_12px_rgba(0,0,0,0.12)] active:scale-[0.98] transition-all duration-150 rounded-xl h-10 text-sm font-medium gap-2 group/btn cursor-pointer"
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
    </div>
  );
}
