import { useState, useEffect } from "react";
import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Input } from "../ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import {
  Brain,
  BookOpen,
  ClipboardList,
  Search,
  Play,
  PlayCircle,
  Edit3,
  Lock,
  Globe,
  Plus,
  Layers,
  Sparkles,
  ArrowRight,
  Clock,
  HelpCircle,
  FileText,
  FolderHeart,
  RefreshCw,
  FolderLock,
  Share2,
} from "lucide-react";
import { toast } from "sonner";
import { creatorService } from "../../services/creator-service";
import { FlashcardStudySession } from "./FlashcardStudySession";
import { LearningWorkspace } from "./LearningWorkspace";
import { ExamTakingView } from "./ExamView";
import { ExamBuilder } from "./creator/ExamBuilder";
import { CourseBuilder } from "./creator/CourseBuilder";
import { FlashcardBuilder } from "./creator/FlashcardBuilder";
import { ShareDeckModal } from "../../features/community/ShareDeckModal";

interface PrivateSpaceViewProps {
  onNavigateTab?: (tab: string) => void;
  userRole?: string;
}

export function PrivateSpaceView({ onNavigateTab, userRole = "user" }: PrivateSpaceViewProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    courses: any[];
    flashcardDecks: any[];
    exams: any[];
    stats: any;
  }>({
    courses: [],
    flashcardDecks: [],
    exams: [],
    stats: {
      totalCourses: 0,
      totalFlashcardDecks: 0,
      totalExams: 0,
      privateCourses: 0,
      privateDecks: 0,
      privateExams: 0,
    },
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "private" | "published">("all");

  // State to switch into study / test workspaces / builders
  const [studyingDeck, setStudyingDeck] = useState<{ id: string; title: string } | null>(null);
  const [editingDeckId, setEditingDeckId] = useState<string | null>(null);
  const [learningCourseId, setLearningCourseId] = useState<string | null>(null);
  const [takingExamId, setTakingExamId] = useState<string | null>(null);
  const [editingExamId, setEditingExamId] = useState<string | null>(null);
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("flashcards");
  const [sharingDeck, setSharingDeck] = useState<{
    id: string;
    title: string;
    cardCount: number;
    thumbnail?: string;
    level?: string;
  } | null>(null);

  const fetchPrivateContent = async () => {
    setLoading(true);
    try {
      const res = await creatorService.getPrivateSpaceContent();
      if (res.success) {
        setData(res.data);
      }
    } catch (error) {
      console.error("Lỗi khi tải Private Space:", error);
      toast.error("Không thể tải kho nội dung cá nhân");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrivateContent();
  }, []);

  // Filter helpers
  const filterList = (items: any[], type: "flashcard" | "course" | "exam") => {
    return items.filter((item) => {
      const matchesSearch =
        item.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchQuery.toLowerCase());

      const isPublished =
        type === "exam" ? item.status === "Published" : Boolean(item.isPublished);

      if (!matchesSearch) return false;
      if (filterStatus === "private") return !isPublished;
      if (filterStatus === "published") return isPublished;
      return true;
    });
  };

  // --- Sub-view: Flashcard Study ---
  if (studyingDeck) {
    return (
      <FlashcardStudySession
        deckId={studyingDeck.id}
        deckTitle={studyingDeck.title}
        onBack={() => {
          setStudyingDeck(null);
          fetchPrivateContent();
        }}
      />
    );
  }

  // --- Sub-view: Course Learning Workspace ---
  if (learningCourseId) {
    return (
      <LearningWorkspace
        courseId={learningCourseId}
        onBack={() => {
          setLearningCourseId(null);
          fetchPrivateContent();
        }}
      />
    );
  }

  // --- Sub-view: Exam Taking View ---
  if (takingExamId) {
    return (
      <ExamTakingView
        examId={takingExamId}
        onBack={() => {
          setTakingExamId(null);
          fetchPrivateContent();
        }}
      />
    );
  }

  // --- Sub-view: Course Builder ---
  if (editingCourseId) {
    return (
      <CourseBuilder
        courseId={editingCourseId}
        onBack={() => {
          setEditingCourseId(null);
          setActiveTab("courses");
          fetchPrivateContent();
        }}
        userRole={userRole}
        onNavigateTab={onNavigateTab}
      />
    );
  }

  // --- Sub-view: Flashcard Builder ---
  if (editingDeckId) {
    return (
      <FlashcardBuilder
        deckId={editingDeckId === "new" ? undefined : editingDeckId}
        onBack={() => {
          setEditingDeckId(null);
          setActiveTab("flashcards");
          fetchPrivateContent();
        }}
        userRole={userRole}
        onNavigateTab={onNavigateTab}
      />
    );
  }

  // --- Sub-view: Exam Builder ---
  if (editingExamId) {
    return (
      <ExamBuilder
        examId={editingExamId}
        onBack={() => {
          setEditingExamId(null);
          setActiveTab("exams");
          fetchPrivateContent();
        }}
        userRole={userRole}
        onNavigateTab={onNavigateTab}
      />
    );
  }

  const filteredDecks = filterList(data.flashcardDecks, "flashcard");
  const filteredCourses = filterList(data.courses, "course");
  const filteredExams = filterList(data.exams, "exam");

  return (
    <div className="space-y-8 pb-12">
      {/* Header Banner - Luxury Minimalist Charcoal */}
      <div className="relative overflow-hidden rounded-3xl bg-[#151515] p-6 md:p-8 text-white shadow-xl border border-zinc-800">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-zinc-800/30 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-20 -mb-10 w-48 h-48 bg-zinc-700/20 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-800/80 text-zinc-300 text-xs font-medium border border-zinc-700/80">
              <FolderLock className="w-3.5 h-3.5 text-zinc-300" />
              <span>Kho học liệu cá nhân</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white">
              Private Space
            </h1>
            <p className="text-zinc-400 text-sm md:text-base leading-relaxed">
              Không gian riêng lưu trữ toàn bộ các bộ thẻ, khóa học và đề thi cá nhân của bạn. Tự do ôn luyện, kiểm tra kiến thức và quản lý nội dung bất kỳ lúc nào.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchPrivateContent}
              disabled={loading}
              className="bg-zinc-800/90 hover:bg-zinc-700 text-zinc-200 border-zinc-700 rounded-xl transition-all duration-200"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Làm mới
            </Button>
            <Button
              onClick={() => onNavigateTab?.("creator")}
              className="bg-white hover:bg-zinc-100 text-zinc-950 font-medium shadow-md shadow-white/5 gap-2 rounded-xl transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99]"
            >
              <Plus className="w-4 h-4" /> Tạo nội dung mới
            </Button>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4 mt-6 pt-6 border-t border-zinc-800">
          <div onClick={() => setActiveTab("flashcards")} className="bg-zinc-900/80 hover:bg-zinc-800/80 cursor-pointer transition-all duration-200 rounded-2xl p-4 border border-zinc-800 hover:border-zinc-700">
            <div className="flex items-center gap-2 text-zinc-400 text-xs font-medium mb-1">
              <Brain className="w-4 h-4 text-zinc-400" /> Flashcards
            </div>
            <div className="text-2xl font-extrabold text-white font-mono">{data.stats?.totalFlashcardDecks || 0}</div>
            <div className="text-xs text-zinc-500 mt-0.5">
              {data.stats?.privateDecks || 0} bộ riêng tư
            </div>
          </div>

          <div onClick={() => setActiveTab("courses")} className="bg-zinc-900/80 hover:bg-zinc-800/80 cursor-pointer transition-all duration-200 rounded-2xl p-4 border border-zinc-800 hover:border-zinc-700">
            <div className="flex items-center gap-2 text-zinc-400 text-xs font-medium mb-1">
              <BookOpen className="w-4 h-4 text-zinc-400" /> Khóa học
            </div>
            <div className="text-2xl font-extrabold text-white font-mono">{data.stats?.totalCourses || 0}</div>
            <div className="text-xs text-zinc-500 mt-0.5">
              {data.stats?.privateCourses || 0} bản nháp
            </div>
          </div>

          <div onClick={() => setActiveTab("exams")} className="bg-zinc-900/80 hover:bg-zinc-800/80 cursor-pointer transition-all duration-200 rounded-2xl p-4 border border-zinc-800 hover:border-zinc-700">
            <div className="flex items-center gap-2 text-zinc-400 text-xs font-medium mb-1">
              <ClipboardList className="w-4 h-4 text-zinc-400" /> Đề kiểm tra
            </div>
            <div className="text-2xl font-extrabold text-white font-mono">{data.stats?.totalExams || 0}</div>
            <div className="text-xs text-zinc-500 mt-0.5">
              {data.stats?.privateExams || 0} đề riêng tư
            </div>
          </div>

          <div onClick={() => setFilterStatus("private")} className="bg-zinc-900/80 hover:bg-zinc-800/80 cursor-pointer transition-all duration-200 rounded-2xl p-4 border border-zinc-800 hover:border-zinc-700">
            <div className="flex items-center gap-2 text-zinc-400 text-xs font-medium mb-1">
              <Lock className="w-4 h-4 text-zinc-400" /> Tổng riêng tư
            </div>
            <div className="text-2xl font-extrabold text-white font-mono">
              {(data.stats?.privateDecks || 0) +
                (data.stats?.privateCourses || 0) +
                (data.stats?.privateExams || 0)}
            </div>
            <div className="text-xs text-zinc-500 mt-0.5">Sẵn sàng để ôn luyện</div>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <Input
            placeholder="Tìm kiếm nội dung cá nhân..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-white border-zinc-200 text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:ring-4 focus:ring-zinc-900/5 rounded-xl transition-all duration-200"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button
            size="sm"
            variant={filterStatus === "all" ? "default" : "outline"}
            onClick={() => setFilterStatus("all")}
            className={`text-xs flex-1 sm:flex-initial rounded-xl transition-all duration-200 ${
              filterStatus === "all"
                ? "bg-[#161616] hover:bg-black text-white shadow-xs"
                : "border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700"
            }`}
          >
            Tất cả
          </Button>
          <Button
            size="sm"
            variant={filterStatus === "private" ? "default" : "outline"}
            onClick={() => setFilterStatus("private")}
            className={`text-xs flex-1 sm:flex-initial gap-1.5 rounded-xl transition-all duration-200 ${
              filterStatus === "private"
                ? "bg-[#161616] hover:bg-black text-white shadow-xs"
                : "border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700"
            }`}
          >
            <Lock className="w-3 h-3" /> Bản nháp (Private)
          </Button>
          <Button
            size="sm"
            variant={filterStatus === "published" ? "default" : "outline"}
            onClick={() => setFilterStatus("published")}
            className={`text-xs flex-1 sm:flex-initial gap-1.5 rounded-xl transition-all duration-200 ${
              filterStatus === "published"
                ? "bg-[#161616] hover:bg-black text-white shadow-xs"
                : "border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700"
            }`}
          >
            <Globe className="w-3 h-3" /> Đã xuất bản
          </Button>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-3 max-w-md bg-zinc-100 p-1.5 rounded-2xl border border-zinc-200/80">
          <TabsTrigger value="flashcards" className="gap-2 text-sm rounded-xl data-[state=active]:bg-white data-[state=active]:text-zinc-900 data-[state=active]:shadow-xs text-zinc-600 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]">
            <Brain className="w-4 h-4 text-zinc-700" />
            <span>Flashcards</span>
            <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0 h-4 rounded-full font-mono bg-zinc-200 text-zinc-700 data-[state=active]:bg-zinc-100">
              {filteredDecks.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="courses" className="gap-2 text-sm rounded-xl data-[state=active]:bg-white data-[state=active]:text-zinc-900 data-[state=active]:shadow-xs text-zinc-600 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]">
            <BookOpen className="w-4 h-4 text-zinc-700" />
            <span>Khóa học</span>
            <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0 h-4 rounded-full font-mono bg-zinc-200 text-zinc-700 data-[state=active]:bg-zinc-100">
              {filteredCourses.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="exams" className="gap-2 text-sm rounded-xl data-[state=active]:bg-white data-[state=active]:text-zinc-900 data-[state=active]:shadow-xs text-zinc-600 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]">
            <ClipboardList className="w-4 h-4 text-zinc-700" />
            <span>Bài kiểm tra</span>
            <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0 h-4 rounded-full font-mono bg-zinc-200 text-zinc-700 data-[state=active]:bg-zinc-100">
              {filteredExams.length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        {/* ---------------- 1. FLASHCARDS TAB ---------------- */}
        <TabsContent value="flashcards" className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
            <p className="text-sm text-zinc-500">
              Quản lý và ôn luyện các bộ thẻ từ vựng cá nhân với thuật toán ghi nhớ ngắt quãng (SRS)
            </p>
            <Button
              size="sm"
              onClick={() => setEditingDeckId("new")}
              className="gap-1.5 bg-[#161616] hover:bg-black text-white font-medium rounded-xl shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 w-fit"
            >
              <Plus className="w-4 h-4" /> Tạo bộ thẻ mới
            </Button>
          </div>

          {loading ? (
            <div className="flex justify-center py-16">
              <div className="w-8 h-8 border-4 border-zinc-900 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredDecks.length === 0 ? (
            <Card className="border border-dashed border-zinc-300 bg-zinc-50/50 rounded-2xl">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-14 h-14 rounded-2xl bg-zinc-100 text-zinc-800 flex items-center justify-center mb-4 border border-zinc-200">
                  <Brain className="w-7 h-7" />
                </div>
                <h3 className="text-lg font-bold text-zinc-900 mb-1">Chưa có bộ Flashcard nào</h3>
                <p className="text-sm text-zinc-500 max-w-sm mb-4">
                  Bạn có thể tạo bộ thẻ từ vựng riêng để ôn luyện ghi nhớ ngắt quãng (Spaced Repetition).
                </p>
                <Button onClick={() => setEditingDeckId("new")} className="gap-2 bg-[#161616] hover:bg-black text-white rounded-xl">
                  <Plus className="w-4 h-4" /> Tạo bộ thẻ ngay
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredDecks.map((deck) => (
                <Card
                  key={deck._id}
                  className="group overflow-hidden flex flex-col justify-between hover:border-zinc-900 hover:-translate-y-0.5 hover:shadow-[0_10px_26px_-6px_rgba(0,0,0,0.07)] transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] border border-zinc-200/80 rounded-2xl bg-white"
                >
                  <div>
                    {/* Header Image / Thumbnail */}
                    <div className="h-36 w-full relative bg-zinc-100 overflow-hidden">
                      {deck.thumbnail ? (
                        <img
                          src={deck.thumbnail}
                          alt={deck.title}
                          className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500 ease-out"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Brain className="w-10 h-10 text-zinc-400 group-hover:scale-105 transition-transform duration-300" />
                        </div>
                      )}
                      <div className="absolute top-3 right-3 flex items-center gap-1.5">
                        <Badge
                          variant="outline"
                          className="text-[11px] border-zinc-200 bg-white/90 text-zinc-800 shadow-2xs backdrop-blur-md rounded-lg font-medium"
                        >
                          {deck.isPublished ? (
                            <span className="flex items-center gap-1">
                              <Globe className="w-3 h-3 text-zinc-600" /> Công khai
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-zinc-500">
                              <Lock className="w-3 h-3" /> Bản nháp (Private)
                            </span>
                          )}
                        </Badge>
                      </div>
                    </div>

                    <CardContent className="p-5">
                      <h3 className="font-bold text-base text-zinc-900 line-clamp-1 group-hover:text-zinc-700 transition-colors">
                        {deck.title}
                      </h3>
                      <p className="text-xs text-zinc-500 line-clamp-2 mt-1.5 h-8 leading-relaxed">
                        {deck.description || "Chưa có mô tả cho bộ thẻ này."}
                      </p>

                      <div className="flex items-center gap-4 mt-4 pt-3.5 border-t border-zinc-100 text-xs text-zinc-500">
                        <div className="flex items-center gap-1.5 font-medium text-zinc-800 font-mono">
                          <Layers className="w-3.5 h-3.5 text-zinc-500" />
                          <span>{deck.cardCount || 0} thẻ từ</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-zinc-400" />
                          <span>{new Date(deck.createdAt).toLocaleDateString("vi-VN")}</span>
                        </div>
                      </div>
                    </CardContent>
                  </div>

                  <div className="p-4 pt-0 flex items-center gap-2">
                    <Button
                      id={`btn-study-deck-${deck._id || deck.id}`}
                      className="flex-1 bg-[#161616] hover:bg-black text-white font-medium shadow-xs hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99] transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] rounded-xl h-10 gap-2"
                      onClick={() => setStudyingDeck({ id: (deck._id || deck.id)?.toString(), title: deck.title })}
                    >
                      <Play className="w-4 h-4 fill-white" /> Ôn tập ngay
                    </Button>
                    <Button
                      id={`btn-edit-deck-${deck._id || deck.id}`}
                      variant="outline"
                      size="icon"
                      className="border-zinc-200 bg-white hover:bg-zinc-50 hover:border-zinc-300 text-zinc-700 rounded-xl h-10 w-10 transition-all duration-200"
                      title="Chỉnh sửa bộ thẻ"
                      onClick={() => setEditingDeckId((deck._id || deck.id)?.toString())}
                    >
                      <Edit3 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="border-zinc-200 bg-white hover:bg-zinc-50 hover:border-zinc-300 text-zinc-700 rounded-xl h-10 w-10 transition-all duration-200"
                      title="Chia sẻ lên Cộng đồng"
                      onClick={() =>
                        setSharingDeck({
                          id: (deck._id || deck.id)?.toString(),
                          title: deck.title,
                          cardCount: deck.cardCount || 0,
                          thumbnail: deck.thumbnail,
                          level: deck.level,
                        })
                      }
                    >
                      <Share2 className="w-4 h-4" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ---------------- 2. COURSES TAB ---------------- */}
        <TabsContent value="courses" className="space-y-4">
          {loading ? (
            <div className="flex justify-center py-16">
              <div className="w-8 h-8 border-4 border-zinc-900 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredCourses.length === 0 ? (
            <Card className="border border-dashed border-zinc-300 bg-zinc-50/50 rounded-2xl">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-14 h-14 rounded-2xl bg-zinc-100 text-zinc-800 flex items-center justify-center mb-4 border border-zinc-200">
                  <BookOpen className="w-7 h-7" />
                </div>
                <h3 className="text-lg font-bold text-zinc-900 mb-1">Chưa có khóa học nào</h3>
                <p className="text-sm text-zinc-500 max-w-sm mb-4">
                  Bạn có thể biên soạn khóa học với các bài học đa phương tiện và tự học trong không gian riêng.
                </p>
                <Button onClick={() => onNavigateTab?.("creator")} className="gap-2 bg-[#161616] hover:bg-black text-white rounded-xl">
                  <Plus className="w-4 h-4" /> Tạo khóa học ngay
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredCourses.map((course) => (
                <Card
                  key={course._id}
                  className="group overflow-hidden flex flex-col justify-between hover:border-zinc-900 hover:-translate-y-0.5 hover:shadow-[0_10px_26px_-6px_rgba(0,0,0,0.07)] transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] border border-zinc-200/80 rounded-2xl bg-white"
                >
                  <div>
                    {/* Header Image */}
                    <div className="h-36 w-full relative bg-zinc-100 overflow-hidden">
                      {course.thumbnail ? (
                        <img
                          src={course.thumbnail}
                          alt={course.title}
                          className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500 ease-out"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <BookOpen className="w-10 h-10 text-zinc-400 group-hover:scale-105 transition-transform duration-300" />
                        </div>
                      )}
                      <div className="absolute top-3 right-3 flex items-center gap-1.5">
                        <Badge
                          variant="outline"
                          className="text-[11px] border-zinc-200 bg-white/90 text-zinc-800 shadow-2xs backdrop-blur-md rounded-lg font-medium"
                        >
                          {course.isPublished ? (
                            <span className="flex items-center gap-1">
                              <Globe className="w-3 h-3 text-zinc-600" /> Công khai
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-zinc-500">
                              <Lock className="w-3 h-3" /> Bản nháp (Private)
                            </span>
                          )}
                        </Badge>
                      </div>
                    </div>

                    <CardContent className="p-5">
                      <div className="flex items-center gap-2 mb-1.5">
                        <Badge variant="outline" className="text-[10px] font-mono border-zinc-200 bg-zinc-50 text-zinc-700 rounded-md">
                          {course.level || "Tất cả trình độ"}
                        </Badge>
                      </div>
                      <h3 className="font-bold text-base text-zinc-900 line-clamp-1 group-hover:text-zinc-700 transition-colors">
                        {course.title}
                      </h3>
                      <p className="text-xs text-zinc-500 line-clamp-2 mt-1.5 h-8 leading-relaxed">
                        {course.description || "Chưa có mô tả cho khóa học này."}
                      </p>

                      <div className="flex items-center gap-4 mt-4 pt-3.5 border-t border-zinc-100 text-xs text-zinc-500">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-zinc-400" />
                          <span>{new Date(course.createdAt).toLocaleDateString("vi-VN")}</span>
                        </div>
                      </div>
                    </CardContent>
                  </div>

                  <div className="p-4 pt-0 flex items-center gap-2">
                    <Button
                      className="flex-1 bg-[#161616] hover:bg-black text-white font-medium shadow-xs hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99] transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] rounded-xl h-10 gap-2"
                      onClick={() => setLearningCourseId(course._id)}
                    >
                      <PlayCircle className="w-4 h-4" /> Vào học ngay
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      title="Chỉnh sửa khóa học"
                      className="border-zinc-200 bg-white hover:bg-zinc-50 hover:border-zinc-300 text-zinc-700 rounded-xl h-10 w-10 transition-all duration-200"
                      onClick={() => setEditingCourseId(course._id)}
                    >
                      <Edit3 className="w-4 h-4" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ---------------- 3. EXAMS TAB ---------------- */}
        <TabsContent value="exams" className="space-y-4">
          {loading ? (
            <div className="flex justify-center py-16">
              <div className="w-8 h-8 border-4 border-zinc-900 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredExams.length === 0 ? (
            <Card className="border border-dashed border-zinc-300 bg-zinc-50/50 rounded-2xl">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-14 h-14 rounded-2xl bg-zinc-100 text-zinc-800 flex items-center justify-center mb-4 border border-zinc-200">
                  <ClipboardList className="w-7 h-7" />
                </div>
                <h3 className="text-lg font-bold text-zinc-900 mb-1">Chưa có bài kiểm tra nào</h3>
                <p className="text-sm text-zinc-500 max-w-sm mb-4">
                  Tạo đề thi trắc nghiệm, điền từ hoặc kéo thả để tự kiểm tra kiến thức của chính mình.
                </p>
                <Button onClick={() => onNavigateTab?.("creator")} className="gap-2 bg-[#161616] hover:bg-black text-white rounded-xl">
                  <Plus className="w-4 h-4" /> Tạo đề thi ngay
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredExams.map((exam) => (
                <Card
                  key={exam._id}
                  className="group overflow-hidden flex flex-col justify-between hover:border-zinc-900 hover:-translate-y-0.5 hover:shadow-[0_10px_26px_-6px_rgba(0,0,0,0.07)] transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] border border-zinc-200/80 rounded-2xl bg-white"
                >
                  <div>
                    {/* Header Image */}
                    <div className="h-36 w-full relative bg-zinc-100 overflow-hidden">
                      {exam.thumbnail ? (
                        <img
                          src={exam.thumbnail}
                          alt={exam.title}
                          className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500 ease-out"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ClipboardList className="w-10 h-10 text-zinc-400 group-hover:scale-105 transition-transform duration-300" />
                        </div>
                      )}
                      <div className="absolute top-3 right-3 flex items-center gap-1.5">
                        <Badge
                          variant="outline"
                          className="text-[11px] border-zinc-200 bg-white/90 text-zinc-800 shadow-2xs backdrop-blur-md rounded-lg font-medium"
                        >
                          {exam.status === "Published" ? (
                            <span className="flex items-center gap-1">
                              <Globe className="w-3 h-3 text-zinc-600" /> Công khai
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-zinc-500">
                              <Lock className="w-3 h-3" /> Bản nháp (Private)
                            </span>
                          )}
                        </Badge>
                      </div>
                    </div>

                    <CardContent className="p-5">
                      <h3 className="font-bold text-base text-zinc-900 line-clamp-1 group-hover:text-zinc-700 transition-colors">
                        {exam.title}
                      </h3>
                      <p className="text-xs text-zinc-500 line-clamp-2 mt-1.5 h-8 leading-relaxed">
                        {exam.description || "Chưa có mô tả cho bài kiểm tra này."}
                      </p>

                      <div className="flex items-center justify-between mt-4 pt-3.5 border-t border-zinc-100 text-xs text-zinc-500">
                        <div className="flex items-center gap-1.5 font-medium text-zinc-800 font-mono">
                          <HelpCircle className="w-3.5 h-3.5 text-zinc-500" />
                          <span>{exam.totalQuestions || 0} câu hỏi</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {exam.level && (
                            <Badge variant="outline" className="text-[10px] font-mono border-zinc-200 bg-zinc-50 text-zinc-700 rounded-md">
                              {exam.level}
                            </Badge>
                          )}
                          <div className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-zinc-400" />
                            <span>{exam.durationMinutes || exam.duration || 45} phút</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </div>

                  <div className="p-4 pt-0 flex items-center gap-2">
                    <Button
                      className="flex-1 bg-[#161616] hover:bg-black text-white font-medium shadow-xs hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99] transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] rounded-xl h-10 gap-2"
                      onClick={() => exam.status === "Published" ? setTakingExamId(exam._id) : setEditingExamId(exam._id)}
                    >
                      {exam.status === "Published" ? (<><Play className="w-4 h-4 fill-white" /> Làm bài thi</>) : (<><Edit3 className="w-4 h-4" /> Tiếp tục sửa nháp</>)}
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      title={exam.status === "Published" ? "Chỉnh sửa bài thi" : "Làm thử bài thi"}
                      className="border-zinc-200 bg-white hover:bg-zinc-50 hover:border-zinc-300 text-zinc-700 rounded-xl h-10 w-10 transition-all duration-200"
                      onClick={() => exam.status === "Published" ? setEditingExamId(exam._id) : setTakingExamId(exam._id)}
                    >
                      {exam.status === "Published" ? <Edit3 className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Modal chia sẻ bộ thẻ lên Community */}
      <ShareDeckModal
        open={Boolean(sharingDeck)}
        onClose={() => setSharingDeck(null)}
        deck={sharingDeck}
      />
    </div>
  );
}
