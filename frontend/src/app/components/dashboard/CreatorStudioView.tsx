import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../ui/dropdown-menu";
import { Separator } from "../ui/separator";
import { toast } from "sonner";
import { creatorService } from "../../services/creator-service";
import {
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

export function CreatorStudioView() {
  const [view, setView] = useState<"list" | "editor">("list");
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showDeleteDialog, setShowDeleteDialog] = useState<string | null>(null);
  
  // Flashcard State
  const [showCardEditor, setShowCardEditor] = useState(false);
  const [editingCard, setEditingCard] = useState<Flashcard | null>(null);
  const [newFront, setNewFront] = useState("");
  const [newBack, setNewBack] = useState("");
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [isSavingCard, setIsSavingCard] = useState(false);

  // Course State
  const [courses, setCourses] = useState<Course[]>([]);
  const [showNewCourseDialog, setShowNewCourseDialog] = useState(false);
  const [newCourseTitle, setNewCourseTitle] = useState("");
  const [newCourseDesc, setNewCourseDesc] = useState("");
  const [newCourseThumb, setNewCourseThumb] = useState("");
  const [isSavingCourse, setIsSavingCourse] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    setIsLoading(true);
    try {
      const res = await creatorService.getCourses();
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

  // --- DECK EDITOR (Flashcards) ---
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
      </div>
    );
  }

  // --- DECK LIST (Courses) ---
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Creator Studio</h1>
          <p className="text-muted-foreground">Quản lý và tạo khóa học của bạn</p>
        </div>
        <Button onClick={() => setShowNewCourseDialog(true)}>
          <Plus className="h-4 w-4 mr-2" /> Tạo khóa học
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Tổng số khóa học</p>
            <p className="text-2xl font-bold">{courses.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Đã xuất bản</p>
            <p className="text-2xl font-bold">{courses.filter((c) => c.isPublished).length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="flex gap-2 items-center flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Tìm kiếm khóa học..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Courses Table */}
      {isLoading ? (
        <div className="flex justify-center p-12">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {filtered.length === 0 ? (
                <p className="text-center p-8 text-muted-foreground">Chưa có khóa học nào.</p>
              ) : (
                filtered.map((course) => (
                  <div key={course._id} className="flex items-center gap-4 p-4 hover:bg-muted/30 transition-colors">
                    {course.thumbnail ? (
                       <img src={course.thumbnail} alt={course.title} className="h-12 w-12 rounded-lg object-cover bg-muted shrink-0" />
                    ) : (
                      <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center shrink-0">
                        <BookOpen className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate">{course.title}</p>
                        <Badge variant={course.isPublished ? "default" : "secondary"} className="shrink-0 text-xs">
                          {course.isPublished ? <CheckCircle2 className="h-3 w-3 mr-1" /> : <AlertCircle className="h-3 w-3 mr-1" />}
                          {course.isPublished ? "Đã xuất bản" : "Bản nháp"}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{course.description || "Không có mô tả"}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button size="sm" variant="outline" onClick={() => handleOpenEditor(course)}>
                        <Edit className="h-4 w-4 mr-2" /> Quản lý thẻ
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="sm" variant="ghost">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handlePublishToggle(course)}>
                            {course.isPublished ? <Lock className="h-4 w-4 mr-2" /> : <Globe className="h-4 w-4 mr-2" />}
                            {course.isPublished ? "Hủy xuất bản" : "Xuất bản"}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
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
            <DialogTitle>Tạo Khóa Học Mới</DialogTitle>
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
              {isSavingCourse ? "Đang tạo..." : "Tạo khóa học"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
