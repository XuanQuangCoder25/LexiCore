import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Separator } from "../ui/separator";
import { Checkbox } from "../ui/checkbox";
import axios from "axios";
import { toast } from "sonner";
import { creatorService } from '../../services/creator-service';
import { courseBuilderService } from '../../services/course-builder-service';
import { ExamBuilder } from "./creator/ExamBuilder";
import { CourseBuilder } from "./creator/CourseBuilder";
import { FlashcardBuilder } from "./creator/FlashcardBuilder";
import { PublishRestrictedModal } from "./creator/PublishRestrictedModal";
import { LayoutList, 
  Plus,
  Edit,
  Trash2,
  Upload,
  Download,
  FileSpreadsheet,
  Globe,
  Lock,
  MoreHorizontal,
  BookOpen,
  Music,
  Video,
  Search,
  CheckCircle2,
  AlertCircle,
  FileText,
  Crown,
} from "lucide-react";

interface Course {
  _id: string;
  title: string;
  description: string;
  thumbnail: string;
  isPublished: boolean;
  createdAt: string;
}

interface Flashcard {
  _id: string;
  front: string;
  back: string;
  order: number;
}

interface CreatorStudioViewProps {
  onNavigateTab?: (tab: string) => void;
  userRole?: string;
}

export function CreatorStudioView({ onNavigateTab, userRole = "user" }: CreatorStudioViewProps) {
  const isCreatorOrAdmin = userRole?.toLowerCase() === "content_creator" || userRole?.toLowerCase() === "admin";
  const [showPublishRestrictedModal, setShowPublishRestrictedModal] = useState(false);
  const [view, setView] = useState<"list" | "editor" | "course_builder" | "flashcard_builder">("list");
  const [selectedFlashcardDeckId, setSelectedFlashcardDeckId] = useState<string | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showDeleteDialog, setShowDeleteDialog] = useState<string | null>(null);
  const [showDeleteExamDialog, setShowDeleteExamDialog] = useState<string | null>(null);
  const [exams, setExams] = useState<any[]>([]);
  const [builderExamId, setBuilderExamId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("flashcards");

  const [selectedExams, setSelectedExams] = useState<string[]>([]);
  const [viewingRatingsId, setViewingRatingsId] = useState<string | null>(null);
  const [ratingsData, setRatingsData] = useState<any[]>([]);

  // Flashcard State
  const [showCardEditor, setShowCardEditor] = useState(false);
  const [editingCard, setEditingCard] = useState<Flashcard | null>(null);
  const [newFront, setNewFront] = useState("");
  const [newBack, setNewBack] = useState("");
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [isSavingCard, setIsSavingCard] = useState(false);

  // Course State
  const [courses, setCourses] = useState<Course[]>([]);
  const [actualCourses, setActualCourses] = useState<any[]>([]);
  const [showNewCourseDialog, setShowNewCourseDialog] = useState(false);
  const [showNewActualCourseDialog, setShowNewActualCourseDialog] = useState(false);
  const [newCourseTitle, setNewCourseTitle] = useState("");
  const [newActualCourseTitle, setNewActualCourseTitle] = useState("");
  const [newCourseDesc, setNewCourseDesc] = useState("");
  const [newActualCourseDesc, setNewActualCourseDesc] = useState("");
  const [newCourseThumb, setNewCourseThumb] = useState("");
  const [newActualCourseThumb, setNewActualCourseThumb] = useState("");
  const [isSavingCourse, setIsSavingCourse] = useState(false);
  const [isSavingActualCourse, setIsSavingActualCourse] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchCourses();
    fetchExams();
  }, []);

  const fetchExams = async () => {
    try {
      const res = await axios.get("/api/v1/creator/exams", { withCredentials: true });
      if (res.data.success) {
        setExams(res.data.data);
      }
    } catch (error) {
      toast.error("Không thể tải danh sách bài kiểm tra");
    }
  };


  const fetchCourses = async () => {
    setIsLoading(true);
    try {
      const res = await creatorService.getCourses();
      const resCourses = await courseBuilderService.getMyCourses();
      if (resCourses.status === 'success') setActualCourses(resCourses.data);
      if (res.success) {
        setCourses(res.data);
      }
    } catch (error) {
      toast.error("Không thể tải danh sách khóa học");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchFlashcards = async (courseId: string) => {
    try {
      const res = await creatorService.getFlashcards(courseId);
      if (res.success) {
        setCards(res.data);
      }
    } catch (error) {
      toast.error("Không thể tải thẻ học");
    }
  };

  const filtered = courses.filter((c) => c.title.toLowerCase().includes(searchQuery.toLowerCase()));

  const handleDeleteActualCourse = async (id: string) => {
    try {
      await courseBuilderService.deleteCourse(id);
      setActualCourses(actualCourses.filter(c => c._id !== id));
      setShowDeleteDialog(null);
    } catch (error) {
      console.error(error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await creatorService.deleteCourse(id);
      setCourses((prev) => prev.filter((c) => c._id !== id));
      toast.success("Đã xóa khóa học");
    } catch (error) {
      toast.error("Lỗi khi xóa khóa học");
    } finally {
      setShowDeleteDialog(null);
    }
  };

  const handlePublishToggle = async (course: Course) => {
    if (!course.isPublished && !isCreatorOrAdmin) {
      setShowPublishRestrictedModal(true);
      return;
    }
    try {
      const res = await creatorService.updateCourse(course._id, { isPublished: !course.isPublished });
      if (res.success) {
        setCourses((prev) =>
          prev.map((c) => c._id === course._id ? { ...c, isPublished: !course.isPublished } : c)
        );
        if (selectedCourse && selectedCourse._id === course._id) {
          setSelectedCourse({ ...selectedCourse, isPublished: !course.isPublished });
        }
        toast.success(course.isPublished ? "Đã chuyển về bản nháp" : "Đã xuất bản thành công");
      }
    } catch (error) {
      toast.error("Lỗi cập nhật trạng thái");
    }
  };

  const handlePublishActualCourse = async (course: any) => {
    if (!course.isPublished && !isCreatorOrAdmin) {
      setShowPublishRestrictedModal(true);
      return;
    }
    try {
      const res = course.isPublished
        ? await courseBuilderService.unpublishCourse(course._id)
        : await courseBuilderService.publishCourse(course._id);
      if (res.status === 'success') {
        setActualCourses((prev) =>
          prev.map((c) => c._id === course._id ? { ...c, isPublished: !course.isPublished } : c)
        );
        toast.success(course.isPublished ? "Đã chuyển về bản nháp" : "Đã xuất bản khóa học thành công");
      }
    } catch (error: any) {
      if (error?.response?.status === 403) {
        setShowPublishRestrictedModal(true);
      } else {
        toast.error(error?.response?.data?.message || "Lỗi cập nhật trạng thái khóa học");
      }
    }
  };
const handleOpenEditor = (course: Course) => {
    setSelectedCourse(course);
    fetchFlashcards(course._id);
    setView("editor");
  };

  const handleSaveCard = async () => {
    if (!newFront.trim() || !newBack.trim()) {
      toast.error("Mặt trước và mặt sau không được để trống");
      return;
    }
    if (!selectedCourse) return;
    
    setIsSavingCard(true);
    try {
      if (editingCard) {
        const res = await creatorService.updateFlashcard(editingCard._id, { front: newFront, back: newBack });
        if (res.success) {
          setCards((prev) => prev.map((c) => c._id === editingCard._id ? res.data : c));
          toast.success("Đã cập nhật thẻ");
        }
      } else {
        const res = await creatorService.createFlashcard({ 
          courseId: selectedCourse._id, 
          front: newFront, 
          back: newBack,
          order: cards.length 
        });
        if (res.success) {
          setCards((prev) => [...prev, res.data]);
          toast.success("Đã thêm thẻ mới");
        }
      }
      setNewFront("");
      setNewBack("");
      setEditingCard(null);
      setShowCardEditor(false);
    } catch (error) {
      toast.error("Lỗi khi lưu thẻ");
    } finally {
      setIsSavingCard(false);
    }
  };

  const handleDeleteCard = async (id: string) => {
    try {
      await creatorService.deleteFlashcard(id);
      setCards((prev) => prev.filter((c) => c._id !== id));
      toast.success("Đã xóa thẻ");
    } catch (error) {
      toast.error("Lỗi khi xóa thẻ");
    }
  };

  const handleCreateActualCourse = async () => {
    if (!newActualCourseTitle.trim()) {
      toast.error("Tiêu đề khóa học là bắt buộc");
      return;
    }
    
    setIsSavingActualCourse(true);
    try {
      const res = await courseBuilderService.createCourse({
        title: newActualCourseTitle,
        description: newActualCourseDesc,
        thumbnail: newActualCourseThumb,
        level: 'All Levels',
        tags: [],
        price: 0
      });
      if (res.status === 'success') {
        setActualCourses((prev) => [res.data, ...prev]);
        setNewActualCourseTitle("");
        setNewActualCourseDesc("");
        setNewActualCourseThumb("");
        setShowNewActualCourseDialog(false);
        toast.success("Đã tạo khóa học mới");
        setSelectedCourse(res.data);
        setView("course_builder");
      }
    } catch (error) {
      toast.error("Lỗi khi tạo khóa học");
    } finally {
      setIsSavingActualCourse(false);
    }
  };

  const handleCreateCourse = async () => {
    if (!newCourseTitle.trim()) {
      toast.error("Tiêu đề khóa học là bắt buộc");
      return;
    }
    
    setIsSavingCourse(true);
    try {
      const res = await creatorService.createCourse({
        title: newCourseTitle,
        description: newCourseDesc,
        thumbnail: newCourseThumb,
        isPublished: false
      });
      if (res.success) {
        setCourses((prev) => [res.data, ...prev]);
        setNewCourseTitle("");
        setNewCourseDesc("");
        setNewCourseThumb("");
        setShowNewCourseDialog(false);
        toast.success("Đã tạo khóa học mới");
      }
    } catch (error) {
      toast.error("Lỗi khi tạo khóa học");
    } finally {
      setIsSavingCourse(false);
    }
  };

  const handleCreateNewExam = async () => {
    try {
      const res = await axios.post("/api/v1/creator/exams", {
        title: "Bài kiểm tra mới",
        description: "",
        thumbnail: ""
      }, { withCredentials: true });
      if (res.data.success) {
        setActiveTab("exams");
        setBuilderExamId(res.data.data._id);
        fetchExams();
      }
    } catch (error) {
      toast.error("Lỗi khi khởi tạo bài kiểm tra");
    }
  };

  const handleDeleteExam = async (id: string) => {
    try {
      await axios.delete(`/api/v1/creator/exams/${id}`, { withCredentials: true });
      setExams((prev) => prev.filter((e) => e._id !== id));
      setSelectedExams((prev) => prev.filter(eid => eid !== id));
      toast.success("Đã xóa bài kiểm tra");
    } catch (error) {
      toast.error("Lỗi khi xóa bài kiểm tra");
    } finally {
      setShowDeleteExamDialog(null);
    }
  };

  const handleBulkAction = async (action: 'delete' | 'publish' | 'unpublish') => {
    if (action === 'publish' && !isCreatorOrAdmin) {
      setShowPublishRestrictedModal(true);
      return;
    }
    if (selectedExams.length === 0) return;
    try {
      const res = await axios.post("/api/v1/creator/exams/bulk-action", { ids: selectedExams, action }, { withCredentials: true });
      if (res.data.success) {
        toast.success(res.data.message);
        setSelectedExams([]);
        fetchExams();
      }
    } catch (error) {
      toast.error("Thao tác thất bại");
    }
  };

  const openRatingsModal = async (examId: string) => {
    setViewingRatingsId(examId);
    setRatingsData([]);
    try {
      const res = await axios.get(`/api/v1/creator/exams/${examId}/ratings`, { withCredentials: true });
      if (res.data.success) {
        setRatingsData(res.data.data);
      }
    } catch (error) {
      toast.error("Không thể tải danh sách đánh giá");
    }
  };

  const renderPublishRestrictedModal = () => (
    <PublishRestrictedModal
      open={showPublishRestrictedModal}
      onOpenChange={setShowPublishRestrictedModal}
      onNavigateTab={onNavigateTab}
      contentType="nội dung"
    />
  );

  // --- DECK EDITOR (Flashcards) ---
  if (view === "flashcard_builder") {
    return (
      <FlashcardBuilder
        deckId={selectedFlashcardDeckId}
        onBack={() => {
          setSelectedFlashcardDeckId(null);
          setView("list");
          fetchCourses();
        }}
        userRole={userRole}
        onNavigateTab={onNavigateTab}
      />
    );
  }

  if (view === "editor" && selectedCourse) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Button variant="ghost" onClick={() => setView("list")} className="mb-1 -ml-2">
              ← Quay lại danh sách
            </Button>
            <h1 className="text-2xl font-bold">{selectedCourse.title}</h1>
            <p className="text-sm text-muted-foreground">{selectedCourse.description || "Chưa có mô tả"}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => handlePublishToggle(selectedCourse)}>
              {selectedCourse.isPublished ? <Lock className="h-4 w-4 mr-2" /> : <Globe className="h-4 w-4 mr-2" />}
              {selectedCourse.isPublished ? "Hủy xuất bản" : "Xuất bản"}
            </Button>
            <Button onClick={() => { setEditingCard(null); setNewFront(""); setNewBack(""); setShowCardEditor(true); }}>
              <Plus className="h-4 w-4 mr-2" /> Thêm thẻ
            </Button>
          </div>
        </div>

        {/* Cards List */}
        <div className="space-y-2">
          {cards.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Chưa có thẻ nào trong khóa học này.</p>
          ) : (
            cards.map((card, idx) => (
              <Card key={card._id}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <span className="text-muted-foreground text-sm w-6 text-right shrink-0 pt-0.5">{idx + 1}</span>
                    <div className="flex-1 grid md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs text-muted-foreground mb-1 block">MẶT TRƯỚC (FRONT)</Label>
                        <p className="font-medium whitespace-pre-wrap">{card.front}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground mb-1 block">MẶT SAU (BACK)</Label>
                        <p className="text-sm whitespace-pre-wrap">{card.back}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => { setEditingCard(card); setNewFront(card.front); setNewBack(card.back); setShowCardEditor(true); }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDeleteCard(card._id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}

          {/* Add Card Drop Zone */}
          <Card className="border-dashed cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => { setEditingCard(null); setNewFront(""); setNewBack(""); setShowCardEditor(true); }}>
            <CardContent className="p-6 text-center">
              <Plus className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Nhấn để thêm thẻ mới</p>
            </CardContent>
          </Card>
        </div>

        {/* Card Editor Dialog */}
        <Dialog open={showCardEditor} onOpenChange={setShowCardEditor}>
          <DialogContent className="max-w-lg" aria-describedby={undefined}>
            <DialogHeader>
              <DialogTitle>{editingCard ? "Sửa Thẻ" : "Thêm Thẻ Mới"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Mặt trước (Từ vựng, câu hỏi)</Label>
                <Textarea value={newFront} onChange={(e) => setNewFront(e.target.value)} placeholder="Nhập từ vựng..." className="mt-1" rows={3} />
              </div>
              <div>
                <Label>Mặt sau (Nghĩa, giải thích)</Label>
                <Textarea value={newBack} onChange={(e) => setNewBack(e.target.value)} placeholder="Nhập nghĩa hoặc giải thích..." className="mt-1" rows={3} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCardEditor(false)} disabled={isSavingCard}>Hủy</Button>
              <Button onClick={handleSaveCard} disabled={!newFront.trim() || !newBack.trim() || isSavingCard}>
                {isSavingCard ? "Đang lưu..." : (editingCard ? "Lưu thay đổi" : "Thêm thẻ")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        {renderPublishRestrictedModal()}
      </div>
    );
  }

  if (view === "course_builder" && selectedCourse) {
    return (
      <CourseBuilder
        courseId={selectedCourse._id}
        onBack={() => {
          setView("list");
          fetchCourses();
        }}
        userRole={userRole}
        onNavigateTab={onNavigateTab}
      />
    );
  }

  if (builderExamId) {
    return <ExamBuilder examId={builderExamId} onBack={() => {
      setBuilderExamId(null);
      setActiveTab("exams");
      fetchExams();
    }} userRole={userRole} onNavigateTab={onNavigateTab} />;
  }

  // --- DECK LIST (Courses) ---
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Creator Studio</h1>
          <p className="text-zinc-500 text-sm">Quản lý và tạo nội dung học tập chất lượng cao của bạn</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-zinc-100 p-1.5 rounded-2xl border border-zinc-200/80 gap-1.5 inline-flex">
          <TabsTrigger value="flashcards" className="rounded-xl px-5 py-2 font-medium text-xs sm:text-sm data-[state=active]:bg-white data-[state=active]:text-zinc-900 data-[state=active]:shadow-xs transition-all">
            Flashcards
          </TabsTrigger>
          <TabsTrigger value="courses" className="rounded-xl px-5 py-2 font-medium text-xs sm:text-sm data-[state=active]:bg-white data-[state=active]:text-zinc-900 data-[state=active]:shadow-xs transition-all">
            Khóa Học
          </TabsTrigger>
          <TabsTrigger value="exams" className="rounded-xl px-5 py-2 font-medium text-xs sm:text-sm data-[state=active]:bg-white data-[state=active]:text-zinc-900 data-[state=active]:shadow-xs transition-all">
            Bài Kiểm Tra
          </TabsTrigger>
        </TabsList>

        <TabsContent value="courses" className="space-y-6">
          <div className="flex justify-end">
            <Button onClick={() => setShowNewActualCourseDialog(true)} className="bg-[#161616] hover:bg-black text-white rounded-xl shadow-xs active:scale-[0.99] transition-all duration-200 font-semibold">
              <Plus className="h-4 w-4 mr-2" /> Tạo khóa học
            </Button>
          </div>

          {/* Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="border border-zinc-200/80 bg-white rounded-2xl shadow-xs hover:-translate-y-0.5 transition-all duration-200">
              <CardContent className="p-5">
                <p className="text-xs text-zinc-500 font-medium">Tổng số khóa học</p>
                <p className="text-2xl font-bold text-zinc-900 mt-1">{actualCourses.length}</p>
              </CardContent>
            </Card>
            <Card className="border border-zinc-200/80 bg-white rounded-2xl shadow-xs hover:-translate-y-0.5 transition-all duration-200">
              <CardContent className="p-5">
                <p className="text-xs text-zinc-500 font-medium">Đã xuất bản</p>
                <p className="text-2xl font-bold text-zinc-900 mt-1">{actualCourses.filter((c) => c.isPublished).length}</p>
              </CardContent>
            </Card>
          </div>

          {/* Search */}
          <div className="flex gap-2 items-center flex-wrap">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
              <Input
                className="pl-10 border-zinc-200 focus:border-zinc-900 focus:ring-4 focus:ring-zinc-900/5 rounded-xl bg-white"
                placeholder="Tìm kiếm khóa học..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Courses Table */}
          {isLoading ? (
            <div className="flex justify-center p-12">
              <div className="w-8 h-8 border-4 border-zinc-900 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <Card className="border border-zinc-200/80 rounded-2xl shadow-xs overflow-hidden bg-white">
              <CardContent className="p-0">
                <div className="divide-y divide-zinc-100">
                  {actualCourses.length === 0 ? (
                    <p className="text-center p-8 text-zinc-500">Chưa có khóa học nào.</p>
                  ) : (
                    actualCourses.map((course) => (
                      <div key={course._id} className="flex items-center gap-4 p-4 hover:bg-zinc-50/80 transition-colors">
                        {course.thumbnail ? (
                           <img src={course.thumbnail} alt={course.title} className="h-12 w-12 rounded-xl object-cover bg-zinc-100 shrink-0 border border-zinc-200/60" />
                        ) : (
                          <div className="h-12 w-12 rounded-xl bg-zinc-100 flex items-center justify-center shrink-0 border border-zinc-200/60">
                            <BookOpen className="h-6 w-6 text-zinc-400" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-zinc-900 truncate">{course.title}</p>
                            <Badge variant={course.isPublished ? "default" : "secondary"} className="shrink-0 text-xs rounded-full border-zinc-200">
                              {course.isPublished ? <CheckCircle2 className="h-3 w-3 mr-1 text-emerald-600" /> : <AlertCircle className="h-3 w-3 mr-1 text-zinc-500" />}
                              {course.isPublished ? "Đã xuất bản" : "Bản nháp"}
                            </Badge>
                          </div>
                          <p className="text-xs text-zinc-500 truncate">{course.description || "Không có mô tả"}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Button size="sm" variant="outline" onClick={() => { setSelectedCourse(course); setView("course_builder"); }} className="rounded-xl border-zinc-200 hover:border-zinc-900 hover:bg-zinc-50 text-zinc-800">
                            <Edit className="h-4 w-4 mr-2" /> Xây dựng Khóa học
                          </Button>
                          
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="sm" variant="ghost" className="rounded-lg hover:bg-zinc-100">
                                <MoreHorizontal className="h-4 w-4 text-zinc-500" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="rounded-xl border-zinc-200">
                              <DropdownMenuItem onClick={() => handlePublishActualCourse(course)}>
                                {course.isPublished ? <Lock className="h-4 w-4 mr-2" /> : <Globe className="h-4 w-4 mr-2" />}
                                {course.isPublished ? "Hủy xuất bản" : "Xuất bản"}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-rose-600 focus:text-rose-600 focus:bg-rose-50"
                                onClick={() => setShowDeleteDialog(course._id)}
                              >
                                <Trash2 className="h-4 w-4 mr-2" /> Xóa
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          )}

      {/* Delete Confirmation */}
      <Dialog open={showDeleteDialog !== null} onOpenChange={() => setShowDeleteDialog(null)}>
        <DialogContent className="max-w-sm" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>Xóa Khóa Học</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Bạn có chắc chắn muốn xóa khóa học này và toàn bộ thẻ bên trong? Hành động này không thể hoàn tác.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(null)}>Hủy</Button>
            <Button variant="destructive" onClick={() => showDeleteDialog && handleDeleteActualCourse(showDeleteDialog)}>
              <Trash2 className="h-4 w-4 mr-2" /> Xóa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Course Dialog */}
      <Dialog open={showNewActualCourseDialog} onOpenChange={setShowNewActualCourseDialog}>
        <DialogContent className="max-w-md" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>Tạo Khóa Học Mới</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Tiêu đề *</Label>
              <Input value={newActualCourseTitle} onChange={(e) => setNewActualCourseTitle(e.target.value)} placeholder="Ví dụ: IELTS Vocabulary 7.0+" className="mt-1" />
            </div>
            <div>
              <Label>Mô tả</Label>
              <Textarea value={newActualCourseDesc} onChange={(e) => setNewActualCourseDesc(e.target.value)} placeholder="Mô tả ngắn gọn về khóa học..." className="mt-1" rows={2} />
            </div>
            <div>
              <Label>Link Ảnh Bìa (Tùy chọn)</Label>
              <Input value={newActualCourseThumb} onChange={(e) => setNewActualCourseThumb(e.target.value)} placeholder="https://..." className="mt-1" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewActualCourseDialog(false)} disabled={isSavingActualCourse}>Hủy</Button>
            <Button onClick={handleCreateActualCourse} disabled={!newActualCourseTitle.trim() || isSavingActualCourse}>
              {isSavingActualCourse ? "Đang tạo..." : "Tạo khóa học"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
        </TabsContent>

        <TabsContent value="flashcards" className="space-y-6">
          <div className="flex justify-end">
            <Button onClick={() => { setSelectedFlashcardDeckId(null); setView("flashcard_builder"); }} className="bg-[#161616] hover:bg-black text-white rounded-xl shadow-xs active:scale-[0.99] transition-all duration-200 font-semibold">
              <Plus className="h-4 w-4 mr-2" /> Tạo bộ thẻ
            </Button>
          </div>

          {/* Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="border border-zinc-200/80 bg-white rounded-2xl shadow-xs hover:-translate-y-0.5 transition-all duration-200">
              <CardContent className="p-5">
                <p className="text-xs text-zinc-500 font-medium">Tổng số bộ thẻ</p>
                <p className="text-2xl font-bold text-zinc-900 mt-1">{courses.length}</p>
              </CardContent>
            </Card>
            <Card className="border border-zinc-200/80 bg-white rounded-2xl shadow-xs hover:-translate-y-0.5 transition-all duration-200">
              <CardContent className="p-5">
                <p className="text-xs text-zinc-500 font-medium">Đã xuất bản</p>
                <p className="text-2xl font-bold text-zinc-900 mt-1">{courses.filter((c) => c.isPublished).length}</p>
              </CardContent>
            </Card>
          </div>

          {/* Search */}
          <div className="flex gap-2 items-center flex-wrap">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
              <Input
                className="pl-10 border-zinc-200 focus:border-zinc-900 focus:ring-4 focus:ring-zinc-900/5 rounded-xl bg-white"
                placeholder="Tìm kiếm bộ thẻ..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Courses Table */}
          {isLoading ? (
            <div className="flex justify-center p-12">
              <div className="w-8 h-8 border-4 border-zinc-900 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <Card className="border border-zinc-200/80 rounded-2xl shadow-xs overflow-hidden bg-white">
              <CardContent className="p-0">
                <div className="divide-y divide-zinc-100">
                  {filtered.length === 0 ? (
                    <p className="text-center p-8 text-zinc-500">Chưa có bộ thẻ nào.</p>
                  ) : (
                    filtered.map((course) => (
                      <div key={course._id} className="flex items-center gap-4 p-4 hover:bg-zinc-50/80 transition-colors">
                        {course.thumbnail ? (
                           <img src={course.thumbnail} alt={course.title} className="h-12 w-12 rounded-xl object-cover bg-zinc-100 shrink-0 border border-zinc-200/60" />
                        ) : (
                          <div className="h-12 w-12 rounded-xl bg-zinc-100 flex items-center justify-center shrink-0 border border-zinc-200/60">
                            <BookOpen className="h-6 w-6 text-zinc-400" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-zinc-900 truncate">{course.title}</p>
                            <Badge variant={course.isPublished ? "default" : "secondary"} className="shrink-0 text-xs rounded-full border-zinc-200">
                              {course.isPublished ? <CheckCircle2 className="h-3 w-3 mr-1 text-emerald-600" /> : <AlertCircle className="h-3 w-3 mr-1 text-zinc-500" />}
                              {course.isPublished ? "Đã xuất bản" : "Bản nháp"}
                            </Badge>
                          </div>
                          <p className="text-xs text-zinc-500 truncate">{course.description || "Không có mô tả"}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Button size="sm" variant="outline" onClick={() => { setSelectedFlashcardDeckId(course._id); setView("flashcard_builder"); }} className="rounded-xl border-zinc-200 hover:border-zinc-900 hover:bg-zinc-50 text-zinc-800">
                            <Edit className="h-4 w-4 mr-2" /> Quản lý thẻ
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="sm" variant="ghost" className="rounded-lg hover:bg-zinc-100">
                                <MoreHorizontal className="h-4 w-4 text-zinc-500" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="rounded-xl border-zinc-200">
                              <DropdownMenuItem onClick={() => handlePublishToggle(course)}>
                                {course.isPublished ? <Lock className="h-4 w-4 mr-2" /> : <Globe className="h-4 w-4 mr-2" />}
                                {course.isPublished ? "Hủy xuất bản" : "Xuất bản"}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-rose-600 focus:text-rose-600 focus:bg-rose-50"
                                onClick={() => setShowDeleteDialog(course._id)}
                              >
                                <Trash2 className="h-4 w-4 mr-2" /> Xóa
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          )}

      {/* Delete Confirmation */}
      <Dialog open={showDeleteDialog !== null} onOpenChange={() => setShowDeleteDialog(null)}>
        <DialogContent className="max-w-sm" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>Xóa Bộ Thẻ</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Bạn có chắc chắn muốn xóa bộ thẻ này và toàn bộ thẻ bên trong? Hành động này không thể hoàn tác.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(null)}>Hủy</Button>
            <Button variant="destructive" onClick={() => showDeleteDialog && handleDelete(showDeleteDialog)}>
              <Trash2 className="h-4 w-4 mr-2" /> Xóa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Course Dialog */}
      <Dialog open={showNewCourseDialog} onOpenChange={setShowNewCourseDialog}>
        <DialogContent className="max-w-md" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>Tạo Bộ Thẻ Mới</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Tiêu đề *</Label>
              <Input value={newCourseTitle} onChange={(e) => setNewCourseTitle(e.target.value)} placeholder="Ví dụ: IELTS Vocabulary 7.0+" className="mt-1" />
            </div>
            <div>
              <Label>Mô tả</Label>
              <Textarea value={newCourseDesc} onChange={(e) => setNewCourseDesc(e.target.value)} placeholder="Mô tả ngắn gọn về khóa học..." className="mt-1" rows={2} />
            </div>
            <div>
              <Label>Link Ảnh Bìa (Tùy chọn)</Label>
              <Input value={newCourseThumb} onChange={(e) => setNewCourseThumb(e.target.value)} placeholder="https://..." className="mt-1" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewCourseDialog(false)} disabled={isSavingCourse}>Hủy</Button>
            <Button onClick={handleCreateCourse} disabled={!newCourseTitle.trim() || isSavingCourse}>
              {isSavingCourse ? "Đang tạo..." : "Tạo bộ thẻ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
        </TabsContent>

        <TabsContent value="exams" className="space-y-6">
          <div className="flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-4">
                <h2 className="text-xl font-bold tracking-tight text-zinc-900">Danh sách Bài Kiểm Tra</h2>
                {exams.length > 0 && (
                  <div className="flex items-center gap-2 text-xs text-zinc-500 border-l border-zinc-200 pl-4">
                    <Checkbox 
                      checked={selectedExams.length === exams.length && exams.length > 0} 
                      onCheckedChange={(checked) => setSelectedExams(checked ? exams.map(e => e._id) : [])} 
                    />
                    Chọn tất cả
                  </div>
                )}
              </div>
              <Button onClick={handleCreateNewExam} className="bg-[#161616] hover:bg-black text-white rounded-xl shadow-xs active:scale-[0.99] transition-all duration-200 font-semibold">
                <Plus className="h-4 w-4 mr-2" /> Tạo Bài Kiểm Tra Mới
              </Button>
            </div>

            {selectedExams.length > 0 && (
              <div className="bg-[#161616] text-white p-3.5 rounded-2xl flex items-center justify-between shadow-xs">
                <span className="font-medium text-xs">Đã chọn {selectedExams.length} bài thi</span>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleBulkAction('publish')} className="bg-transparent text-white border-zinc-700 hover:bg-zinc-800 rounded-xl text-xs">
                    <Globe className="h-3.5 w-3.5 mr-1.5" /> Xuất bản
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleBulkAction('unpublish')} className="bg-transparent text-white border-zinc-700 hover:bg-zinc-800 rounded-xl text-xs">
                    <Lock className="h-3.5 w-3.5 mr-1.5" /> Hủy xuất bản
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => handleBulkAction('delete')} className="bg-rose-600 hover:bg-rose-700 rounded-xl text-xs">
                    <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Xóa
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {exams.length === 0 ? (
              <p className="text-zinc-500 text-sm">Chưa có bài kiểm tra nào.</p>
            ) : (
              exams.map((exam) => (
                <Card 
                  key={exam._id} 
                  className="cursor-pointer border border-zinc-200/80 bg-white hover:border-zinc-900 hover:-translate-y-0.5 hover:shadow-[0_10px_26px_-6px_rgba(0,0,0,0.07)] transition-all duration-200 rounded-2xl overflow-hidden relative group" 
                  onClick={() => { setActiveTab("exams"); setBuilderExamId(exam._id); }}>
                  <div className="absolute top-3 left-3 z-10" onClick={(e) => e.stopPropagation()}>
                    <Checkbox 
                      className="bg-white/90 border-zinc-300"
                      checked={selectedExams.includes(exam._id)} 
                      onCheckedChange={(checked) => {
                        setSelectedExams(prev => checked ? [...prev, exam._id] : prev.filter(id => id !== exam._id));
                      }} 
                    />
                  </div>
                  {exam.thumbnail ? (
                    <img src={exam.thumbnail} alt={exam.title} className="w-full h-36 object-cover bg-zinc-100" />
                  ) : (
                    <div className="w-full h-36 bg-zinc-100 flex items-center justify-center">
                      <FileText className="h-10 w-10 text-zinc-300" />
                    </div>
                  )}
                  <CardContent className="p-5">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-bold text-zinc-900 group-hover:text-black line-clamp-1">{exam.title}</h3>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Badge variant="outline" className={`text-[10px] rounded-full border-zinc-200 ${exam.status === 'Published' ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-700'}`}>
                          {exam.status === 'Published' ? 'Published' : exam.status === 'Suspended' ? 'Suspended' : 'Draft'}
                        </Badge>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg" onClick={(e) => { e.stopPropagation(); setShowDeleteExamDialog(exam._id); }}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                    <p className="text-xs text-zinc-500 line-clamp-2">{exam.description || "Chưa có mô tả"}</p>
                    <div className="flex justify-between items-center mt-4 pt-3 border-t border-zinc-100 text-xs">
                      <span className="text-zinc-500 font-medium">{exam.totalQuestions} Câu hỏi</span>
                      {exam.totalRatings && exam.totalRatings > 0 ? (
                        <div 
                          className="flex items-center gap-1 bg-zinc-100 px-2 py-0.5 rounded-lg hover:bg-zinc-200 transition-colors cursor-pointer"
                          onClick={(e) => { e.stopPropagation(); openRatingsModal(exam._id); }}
                        >
                          <span className="font-semibold text-zinc-900">★ {(exam.averageRating || 0).toFixed(1)}</span>
                          <span className="text-zinc-500 text-[11px]">({exam.totalRatings})</span>
                        </div>
                      ) : null}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Delete Exam Confirmation */}
      <Dialog open={showDeleteExamDialog !== null} onOpenChange={() => setShowDeleteExamDialog(null)}>
        <DialogContent className="max-w-sm" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>Xóa Bài Kiểm Tra</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Bạn có chắc chắn muốn xóa bài kiểm tra này? Mọi câu hỏi và kết quả của học viên sẽ bị xóa vĩnh viễn.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteExamDialog(null)}>Hủy</Button>
            <Button variant="destructive" onClick={() => showDeleteExamDialog && handleDeleteExam(showDeleteExamDialog)}>
              <Trash2 className="h-4 w-4 mr-2" /> Xóa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Ratings View Modal */}
      <Dialog open={viewingRatingsId !== null} onOpenChange={() => setViewingRatingsId(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>Thống kê & Đánh giá</DialogTitle>
          </DialogHeader>

          {/* Biểu đồ thống kê */}
          <div className="bg-muted/30 p-4 rounded-lg mb-4 border">
            <h4 className="text-sm font-semibold mb-3">Biểu đồ phân bổ sao</h4>
            {[5,4,3,2,1].map(star => {
              const count = ratingsData.filter(r => r.rating === star).length;
              const pct = ratingsData.length > 0 ? (count / ratingsData.length) * 100 : 0;
              return (
                <div key={star} className="flex items-center gap-3 text-sm mb-2">
                  <span className="w-8 font-medium text-muted-foreground">{star} ★</span>
                  <div className="flex-1 h-2.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-yellow-400 transition-all duration-500" style={{ width: `${pct}%` }}></div>
                  </div>
                  <span className="w-8 text-right font-medium">{count}</span>
                </div>
              )
            })}
          </div>

          <h4 className="text-sm font-semibold mt-2 mb-2">Chi tiết nhận xét</h4>
          <div className="space-y-4">
            {ratingsData.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Chưa có dữ liệu chi tiết.</p>
            ) : (
              ratingsData.map((rating, idx) => (
                <div key={idx} className="border-b pb-4 last:border-0 last:pb-0">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="text-yellow-500 text-sm font-bold">★ {rating.rating}</div>
                    <div className="text-xs text-muted-foreground">{new Date(rating.createdAt).toLocaleDateString('vi-VN')}</div>
                  </div>
                  <p className="text-sm">{rating.review || <span className="text-muted-foreground italic">Không có nhận xét</span>}</p>
                </div>
              ))
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setViewingRatingsId(null)}>Đóng</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {renderPublishRestrictedModal()}
    </div>
  );
}
