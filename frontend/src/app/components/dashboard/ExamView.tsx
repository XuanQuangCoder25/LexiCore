import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Progress } from "../ui/progress";
import {
  Play,
  Pause,
  Volume2,
  SkipBack,
  SkipForward,
  FileText,
  Headphones,
  Video,
  ChevronRight,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Flag,
  ArrowRight,
  Clock,
  BookOpen,
  Star,
  Search,
  Lock
} from "lucide-react";
import { ReportIssueModal } from "../global/ReportIssueModal";

// --- Types ---
interface Exam {
  _id: string;
  title: string;
  description: string;
  thumbnail: string;
  totalQuestions: number;
  progress?: any;
  hasPassword?: boolean;
  totalRatings?: number;
  averageRating?: number;
}

interface Question {
  _id: string;
  type: 'DragDrop' | 'Audio' | 'MultipleChoice' | 'FillBlank';
  content: string;
  options: string[];
  mediaUrl: string;
}

interface WordChip {
  id: string;
  word: string;
}

interface SlotState {
  id: string;
  word: WordChip | null;
}

// --- Components for Drag & Drop ---
function DraggableWord({ chip, isUsed }: { chip: WordChip; isUsed: boolean }) {
  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData("application/json", JSON.stringify(chip));
    e.dataTransfer.effectAllowed = "move";
  };

  return (
    <div
      draggable={!isUsed}
      onDragStart={handleDragStart}
      className={`px-3 py-1.5 rounded-md border text-sm font-medium select-none transition-all ${
        isUsed
          ? "opacity-30 cursor-not-allowed border-dashed"
          : "cursor-grab border-border bg-background hover:border-foreground hover:bg-muted active:cursor-grabbing"
      }`}
    >
      {chip.word}
    </div>
  );
}

function DropSlot({
  slot,
  onDrop,
  onRemove,
}: {
  slot: SlotState;
  onDrop: (slotId: string, chip: WordChip) => void;
  onRemove: (slotId: string) => void;
}) {
  const [isOver, setIsOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setIsOver(true);
  };

  const handleDragLeave = () => setIsOver(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsOver(false);
    try {
      const chip: WordChip = JSON.parse(e.dataTransfer.getData("application/json"));
      onDrop(slot.id, chip);
    } catch {
      // ignore
    }
  };

  return (
    <span
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`inline-flex items-center min-w-[90px] h-8 px-2 mx-1 rounded border-b-2 transition-all ${
        isOver
          ? "border-foreground bg-muted"
          : slot.word
            ? "border-foreground bg-muted"
            : "border-dashed border-muted-foreground"
      }`}
      onClick={() => slot.word && onRemove(slot.id)}
      title={slot.word ? "Click to remove" : "Drop word here"}
    >
      {slot.word ? (
        <span className="text-sm font-medium">
          {slot.word.word}
        </span>
      ) : (
        <span className="text-xs text-muted-foreground">drop here</span>
      )}
    </span>
  );
}

// --- Question Renderers ---
function DragDropQuestion({ question, index, total, onAnswer, onReport, currentValue = {} }: any) {
  const content = question.content || { text: '', wordBank: [], distractors: [] };
  
  let blankCounter = 1;
  const tokens = (content.text || '').split(/(\[[^\]]+\])/).filter(Boolean).map((t: string) => {
    if (t.startsWith("[") && t.endsWith("]")) {
      return `[blank_${blankCounter++}]`;
    }
    return t;
  });
  
  const allWords = [...(content.wordBank || []), ...(content.distractors || [])];
  const wordChips: WordChip[] = Array.from(new Set(allWords)).map((word: unknown, i: number) => ({ id: `w${i}`, word: String(word) }));
  
  const usedWords = Object.values(currentValue).filter(Boolean) as string[];

  const handleDrop = (slotId: string, chip: WordChip) => {
     onAnswer(question._id, { ...currentValue, [slotId]: chip.word });
  };

  const handleRemove = (slotId: string) => {
     const next = { ...currentValue };
     delete next[slotId];
     onAnswer(question._id, next);
  };

  const reset = () => {
    onAnswer(question._id, {});
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4" /> Kéo thả điền từ
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline">Câu hỏi {index + 1}/{total}</Badge>
            <button onClick={onReport} className="text-muted-foreground hover:text-foreground transition-colors" title="Report issue">
              <Flag className="h-4 w-4" />
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="p-5 rounded-lg bg-muted/40 border leading-9 text-base">
          {tokens.map((token: string, i: number) => {
            if (token.startsWith("[blank_")) {
              const wordStr = currentValue[token];
              const slot = { id: token, word: wordStr ? { id: wordStr, word: wordStr } : null };
              return (
                <DropSlot
                  key={i}
                  slot={slot}
                  onDrop={handleDrop}
                  onRemove={handleRemove}
                />
              );
            }
            return <span key={i}>{token} </span>;
          })}
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-3 uppercase tracking-wide">Từ vựng — Kéo thả vào ô trống</p>
          <div className="flex flex-wrap gap-2">
            {wordChips.map((chip) => (
              <DraggableWord key={chip.id} chip={chip} isUsed={usedWords.includes(chip.word)} />
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={reset} size="sm">
            <RotateCcw className="h-4 w-4 mr-2" /> Làm lại
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function FillBlankQuestion({ question, index, total, onAnswer, onReport, currentValue = {} }: any) {
  const content = question.content || { text: '' };
  
  let blankCounter = 1;
  const tokens = (content.text || '').split(/(\[[^\]]+\])/).filter(Boolean).map((t: string) => {
    if (t.startsWith("[") && t.endsWith("]")) {
      return `[blank_${blankCounter++}]`;
    }
    return t;
  });

  const handleChange = (slotId: string, value: string) => {
     onAnswer(question._id, { ...currentValue, [slotId]: value });
  };

  const reset = () => {
    onAnswer(question._id, {});
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4" /> Gõ từ điền khuyết
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline">Câu hỏi {index + 1}/{total}</Badge>
            <button onClick={onReport} className="text-muted-foreground hover:text-foreground transition-colors" title="Report issue">
              <Flag className="h-4 w-4" />
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="p-5 rounded-lg bg-muted/40 border leading-9 text-base">
          {tokens.map((token: string, i: number) => {
            if (token.startsWith("[blank_")) {
              const wordStr = currentValue[token] || "";
              return (
                <Input
                  key={i}
                  value={wordStr}
                  onChange={(e) => handleChange(token, e.target.value)}
                  className="inline-flex items-center min-w-[90px] h-8 px-2 mx-1 border-b-2 text-center text-sm font-medium w-auto focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-primary"
                  placeholder="điền vào đây..."
                />
              );
            }
            return <span key={i}>{token} </span>;
          })}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={reset} size="sm">
            <RotateCcw className="h-4 w-4 mr-2" /> Làm lại
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function AudioPlayer({ question, index, total, onAnswer, onReport, currentValue = {} }: any) {
  const content = question.content || { mediaUrl: '', subQuestions: [] };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            {question.type === 'Audio' ? <Headphones className="h-4 w-4" /> : <Video className="h-4 w-4" />} {question.type}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline">Câu hỏi {index + 1}/{total}</Badge>
            <button onClick={onReport} className="text-muted-foreground hover:text-foreground transition-colors" title="Report issue">
              <Flag className="h-4 w-4" />
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {content.mediaUrl && (
          <div className="p-2 bg-muted/20 rounded flex justify-center">
            {question.type === 'Audio' ? (
              <audio src={content.mediaUrl} controls className="w-full max-w-md" />
            ) : (
              <video src={content.mediaUrl} controls className="w-full max-w-sm rounded" />
            )}
          </div>
        )}

        <div className="space-y-6 pt-4">
          {content.subQuestions?.map((sq: any, i: number) => (
             <div key={sq.id} className="space-y-3 p-4 bg-muted/10 border rounded-lg">
                <p className="font-medium text-sm">{i + 1}. {sq.text}</p>
                {sq.options?.map((opt: string) => (
                   <button 
                     key={opt}
                     onClick={() => onAnswer(question._id, { ...currentValue, [sq.id]: opt })}
                     className={`w-full text-left p-3 rounded-lg border text-sm transition-colors ${
                       currentValue[sq.id] === opt ? 'border-primary bg-primary/10 font-medium' : 'hover:bg-muted/50'
                     }`}
                   >
                     {opt}
                   </button>
                ))}
             </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function MultipleChoiceQuestion({ question, index, total, onAnswer, onReport, currentValue }: any) {
  const content = question.content || { text: '', options: [] };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4" /> Trắc nghiệm
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline">Câu hỏi {index + 1}/{total}</Badge>
            <button onClick={onReport} className="text-muted-foreground hover:text-foreground transition-colors" title="Report issue">
              <Flag className="h-4 w-4" />
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <p className="text-sm font-medium">{content.text}</p>
          {(content.options || []).map((opt: string) => (
            <button 
              key={opt} 
              onClick={() => onAnswer(question._id, opt)}
              className={`w-full text-left p-3 rounded-lg border text-sm transition-colors ${
                currentValue === opt ? 'border-primary bg-primary/10 font-medium' : 'hover:bg-muted/50'
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// --- List View ---
function ExamListView({ onSelectExam }: { onSelectExam: (id: string) => void }) {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("newest");
  
  const [showPasswordModal, setShowPasswordModal] = useState<string | null>(null);
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordError, setPasswordError] = useState("");
  
  const [viewingRatingsId, setViewingRatingsId] = useState<string | null>(null);
  const [ratingsData, setRatingsData] = useState<any[]>([]);

  const fetchExams = () => {
    setLoading(true);
    axios.get("/api/exams", { 
      params: { search, sort },
      withCredentials: true 
    })
      .then(res => {
        setExams(res.data?.data || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError("Không thể tải danh sách bài thi. Vui lòng thử lại sau.");
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchExams();
  }, [sort]);

  const handleStartExam = (exam: Exam) => {
    if (exam.hasPassword) {
      setShowPasswordModal(exam._id);
      setPasswordInput("");
      setPasswordError("");
    } else {
      onSelectExam(exam._id);
    }
  };

  const handleVerifyPassword = async () => {
    if (!showPasswordModal) return;
    try {
      const res = await axios.post(`/api/exams/${showPasswordModal}/verify-password`, { password: passwordInput }, { withCredentials: true });
      if (res.data.success) {
        onSelectExam(showPasswordModal);
        setShowPasswordModal(null);
      }
    } catch (err: any) {
      setPasswordError(err.response?.data?.message || "Mật khẩu không đúng");
    }
  };

  const openRatingsModal = async (examId: string) => {
    setViewingRatingsId(examId);
    setRatingsData([]);
    try {
      const res = await axios.get(`/api/exams/${examId}/ratings`, { withCredentials: true });
      if (res.data.success) {
        setRatingsData(res.data.data);
      }
    } catch (error) {
      toast.error("Không thể tải danh sách đánh giá");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-12 text-destructive border border-destructive/20 rounded-lg bg-destructive/5">
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Exam Center</h1>
          <p className="text-muted-foreground">Test your knowledge and earn rewards</p>
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Input 
            placeholder="Tìm kiếm bài thi..." 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
            onKeyDown={(e) => e.key === 'Enter' && fetchExams()}
            className="max-w-[200px]"
          />
          <Button variant="secondary" onClick={fetchExams}><Search className="h-4 w-4" /></Button>
          <select 
            value={sort} 
            onChange={(e) => setSort(e.target.value)}
            className="flex h-9 w-[140px] items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="newest">Mới nhất</option>
            <option value="oldest">Cũ nhất</option>
            <option value="highest_rated">Đánh giá cao</option>
          </select>
        </div>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {exams.length === 0 ? (
          <div className="col-span-full text-center py-12 text-muted-foreground border rounded-lg bg-muted/20 border-dashed">
            No exams available right now. Check back later!
          </div>
        ) : (
          exams.map((exam) => (
            <Card key={exam._id} className="group hover:shadow-lg transition-all duration-300">
              <div className="relative overflow-hidden rounded-t-lg">
                {exam.thumbnail ? (
                  <img src={exam.thumbnail} alt={exam.title} className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300" />
                ) : (
                  <div className="w-full h-48 bg-muted flex items-center justify-center">
                    <BookOpen className="h-12 w-12 text-muted-foreground/50" />
                  </div>
                )}
                {exam.progress && exam.progress.status === 'Completed' && (
                  <div className="absolute top-3 right-3">
                    <Badge variant="secondary">Score: {exam.progress.score}%</Badge>
                  </div>
                )}
              </div>
              <CardContent className="p-4">
                <h3 className="font-semibold mb-2 group-hover:text-primary transition-colors">{exam.title}</h3>
                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{exam.description || "No description provided."}</p>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <FileText className="w-3 h-3" />
                    <span>{exam.totalQuestions} Questions</span>
                  </div>
                  {exam.hasPassword && <Lock className="w-4 h-4 text-muted-foreground" />}
                </div>
                
                {exam.totalRatings && exam.totalRatings > 0 ? (
                  <div 
                    className="flex items-center gap-1 mt-3 cursor-pointer group bg-muted/50 px-2 py-1 rounded-md hover:bg-muted w-fit"
                    onClick={(e) => { e.stopPropagation(); openRatingsModal(exam._id); }}
                  >
                    <span className="text-xs font-semibold text-yellow-500">★ {(exam.averageRating || 0).toFixed(1)}</span>
                    <span className="text-xs text-muted-foreground">({exam.totalRatings} đánh giá)</span>
                  </div>
                ) : null}
              </CardContent>
              <CardFooter className="p-4 pt-0">
                <Button className="w-full" onClick={() => handleStartExam(exam)}>
                  {exam.progress?.status === 'Completed' ? 'Retake Exam' : 'Start Exam'}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </CardFooter>
            </Card>
          ))
        )}
      </div>

      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-background border rounded-lg shadow-lg p-6 w-full max-w-sm">
            <h3 className="text-lg font-bold mb-2 flex items-center gap-2"><Lock className="h-5 w-5" /> Bài thi có mật khẩu</h3>
            <p className="text-sm text-muted-foreground mb-4">Vui lòng nhập mật khẩu để bắt đầu làm bài.</p>
            <Input 
              type="password" 
              placeholder="Nhập mật khẩu" 
              value={passwordInput} 
              onChange={e => setPasswordInput(e.target.value)} 
              onKeyDown={e => e.key === 'Enter' && handleVerifyPassword()}
            />
            {passwordError && <p className="text-xs text-destructive mt-2">{passwordError}</p>}
            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" onClick={() => setShowPasswordModal(null)}>Hủy</Button>
              <Button onClick={handleVerifyPassword}>Xác nhận</Button>
            </div>
          </div>
        </div>
      )}

      {viewingRatingsId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-background border rounded-lg shadow-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-4">Thống kê & Đánh giá</h3>
            
            {/* Biểu đồ thống kê */}
            <div className="bg-muted/30 p-4 rounded-lg mb-6 border">
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

            <h4 className="text-sm font-semibold mb-3">Chi tiết nhận xét</h4>
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
            <div className="flex justify-end mt-6">
              <Button onClick={() => setViewingRatingsId(null)}>Đóng</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- Taking View ---
function ExamTakingView({ examId, onBack }: { examId: string; onBack: () => void }) {
  const [exam, setExam] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [reportOpen, setReportOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState("");
  const [ratingSubmitted, setRatingSubmitted] = useState(false);

  useEffect(() => {
    axios.get(`/api/exams/${examId}`, { withCredentials: true })
      .then(res => {
        setExam(res.data?.data || null);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError("Không thể tải chi tiết bài thi. Vui lòng thử lại sau.");
        setLoading(false);
      });
  }, [examId]);

  const handleAnswer = (questionId: string, value: any) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await axios.post(`/api/exams/${examId}/submit`, { answers }, { withCredentials: true });
      if (res.data.success) {
        setResult(res.data.data);
        toast.success("Exam submitted successfully!");
      }
    } catch (err) {
      toast.error("Failed to submit exam");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReport = async (reason: string) => {
    try {
      await axios.post(`/api/exams/${examId}/report`, { reason }, { withCredentials: true });
      toast.success("Báo cáo đã được gửi thành công");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Lỗi khi gửi báo cáo");
      throw err;
    }
  };

  const handleRate = async () => {
    if (rating === 0) return toast.error("Vui lòng chọn số sao");
    try {
      await axios.post(`/api/exams/${examId}/rate`, { rating, review }, { withCredentials: true });
      setRatingSubmitted(true);
      toast.success("Cảm ơn bạn đã đánh giá!");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Lỗi khi gửi đánh giá");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-12 text-destructive border border-destructive/20 rounded-lg bg-destructive/5">
        <p>{error}</p>
        <Button className="mt-4" onClick={onBack}>Trở về danh sách</Button>
      </div>
    );
  }

  if (result) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 pt-10 text-center">
        <CheckCircle2 className="h-20 w-20 text-green-500 mx-auto" />
        <h2 className="text-3xl font-bold">Exam Completed!</h2>
        <Card>
          <CardContent className="p-8">
            <div className="text-5xl font-bold text-primary mb-4">{Math.round(result.score)}%</div>
            <p className="text-muted-foreground">You got {result.correctCount} out of {result.total} questions correct.</p>
          </CardContent>
        </Card>

        {!ratingSubmitted ? (
          <Card className="mt-8 border-primary/20 bg-muted/10">
            <CardHeader>
              <CardTitle className="text-lg">Đánh giá bài thi này</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star 
                    key={star} 
                    className={`h-8 w-8 cursor-pointer transition-colors ${rating >= star ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`} 
                    onClick={() => setRating(star)} 
                  />
                ))}
              </div>
              <Textarea 
                placeholder="Nhận xét của bạn về bài thi này (Tùy chọn)..." 
                value={review} 
                onChange={e => setReview(e.target.value)} 
                rows={3} 
              />
              <Button onClick={handleRate} className="w-full">Gửi đánh giá</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="p-4 bg-green-50 text-green-700 rounded-lg">
            <p className="font-medium">Cảm ơn bạn đã đóng góp ý kiến!</p>
          </div>
        )}

        <Button onClick={onBack} size="lg" variant="outline" className="mt-4">Back to Exams</Button>
      </div>
    );
  }

  if (!exam || !exam.questions || exam.questions.length === 0) {
    return (
      <div className="text-center py-12">
        <p>No questions found in this exam.</p>
        <Button className="mt-4" onClick={onBack}>Back to Exams</Button>
      </div>
    );
  }

  const currentQuestion = exam.questions[currentIndex];
  const progressPercent = ((currentIndex) / exam.questions.length) * 100;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <Button variant="ghost" onClick={onBack} className="mb-2 -ml-4">
            ← Back
          </Button>
          <h1 className="text-3xl font-bold">{exam.title}</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Progress</p>
            <p className="font-bold">{currentIndex + 1} / {exam.questions.length}</p>
          </div>
          <div className="w-20">
            <Progress value={progressPercent} className="h-2" />
          </div>
        </div>
      </div>

      <div className="flex gap-2 text-sm overflow-x-auto pb-2">
        {exam.questions.map((q: any, i: number) => {
          let Icon = FileText;
          if (q.type === 'Audio') Icon = Headphones;
          if (q.type === 'DragDrop') Icon = FileText;

          const active = i === currentIndex;
          const done = answers[q._id] !== undefined && answers[q._id] !== null;

          return (
            <div key={q._id} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs whitespace-nowrap ${active ? "border-foreground font-medium" : done ? "bg-muted border-transparent text-muted-foreground" : "border-dashed text-muted-foreground"}`}>
              <Icon className="h-3.5 w-3.5" />
              Q{i + 1}
              {done && <CheckCircle2 className="h-3 w-3 text-green-600" />}
            </div>
          );
        })}
      </div>

      {currentQuestion.type === 'DragDrop' && (
        <DragDropQuestion 
          question={currentQuestion} 
          index={currentIndex} 
          total={exam.questions.length} 
          onAnswer={handleAnswer} 
          currentValue={answers[currentQuestion._id]}
          onReport={() => setReportOpen(true)} 
        />
      )}
      {currentQuestion.type === 'FillBlank' && (
        <FillBlankQuestion 
          question={currentQuestion} 
          index={currentIndex} 
          total={exam.questions.length} 
          onAnswer={handleAnswer} 
          currentValue={answers[currentQuestion._id]}
          onReport={() => setReportOpen(true)} 
        />
      )}
      {(currentQuestion.type === 'Audio' || currentQuestion.type === 'Video') && (
        <AudioPlayer 
          question={currentQuestion} 
          index={currentIndex} 
          total={exam.questions.length} 
          onAnswer={handleAnswer} 
          currentValue={answers[currentQuestion._id]}
          onReport={() => setReportOpen(true)} 
        />
      )}
      {currentQuestion.type === 'MultipleChoice' && (
         <MultipleChoiceQuestion 
          question={currentQuestion} 
          index={currentIndex} 
          total={exam.questions.length} 
          onAnswer={handleAnswer} 
          currentValue={answers[currentQuestion._id]}
          onReport={() => setReportOpen(true)} 
        />
      )}

      <div className="flex justify-between items-center pt-4">
        <Button variant="outline" onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))} disabled={currentIndex === 0}>
          <SkipBack className="h-4 w-4 mr-2" /> Previous
        </Button>
        
        {currentIndex < exam.questions.length - 1 ? (
          <Button onClick={() => setCurrentIndex(prev => Math.min(exam.questions.length - 1, prev + 1))}>
            Next <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={submitting || Object.keys(answers).length < exam.questions.length}>
            {submitting ? 'Submitting...' : 'Submit Exam'}
          </Button>
        )}
      </div>

      <ReportIssueModal open={reportOpen} onClose={() => setReportOpen(false)} onSubmit={handleReport} />
    </div>
  );
}

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_: Error) {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ExamView crashed:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-12 text-center text-destructive">
          <h2 className="text-2xl font-bold mb-4">Đã xảy ra lỗi không mong muốn</h2>
          <p>Không thể hiển thị trang này. Vui lòng tải lại trang.</p>
          <Button className="mt-4" onClick={() => window.location.reload()}>Tải lại trang</Button>
        </div>
      );
    }
    return this.props.children;
  }
}

export function ExamView() {
  const [selectedExamId, setSelectedExamId] = useState<string | null>(null);

  return (
    <ErrorBoundary>
      {selectedExamId ? (
        <ExamTakingView examId={selectedExamId} onBack={() => setSelectedExamId(null)} />
      ) : (
        <ExamListView onSelectExam={setSelectedExamId} />
      )}
    </ErrorBoundary>
  );
}
