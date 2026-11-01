import React, { useState, useEffect, useRef } from "react";
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
  Lock,
  AlertCircle,
  Sparkles,
  HelpCircle
} from "lucide-react";
import { ReportIssueModal } from "../global/ReportIssueModal";

// --- Types ---
interface Exam {
  _id: string;
  title: string;
  description: string;
  thumbnail: string;
  totalQuestions: number;
  durationMinutes?: number;
  passingScore?: number;
  level?: string;
  skills?: string[];
  progress?: any;
  hasPassword?: boolean;
  totalRatings?: number;
  averageRating?: number;
}

interface Question {
  _id: string;
  type: 'DragDrop' | 'Audio' | 'MultipleChoice' | 'FillBlank' | 'Reading' | 'Video';
  content: any;
  options?: string[];
  mediaUrl?: string;
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
      className={`px-3.5 py-2 rounded-xl border text-sm font-medium select-none transition-all duration-200 ${
        isUsed
          ? "opacity-30 cursor-not-allowed border-dashed border-zinc-200 bg-zinc-50 text-zinc-400"
          : "cursor-grab border-zinc-200 bg-white text-zinc-900 shadow-2xs hover:border-zinc-900 hover:shadow-xs active:cursor-grabbing active:scale-95"
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
      className={`inline-flex items-center min-w-[96px] h-9 px-2.5 mx-1 rounded-lg border-2 transition-all duration-200 ${
        isOver
          ? "border-zinc-900 bg-zinc-100"
          : slot.word
            ? "border-zinc-900 bg-zinc-900 text-white font-medium shadow-2xs cursor-pointer hover:bg-zinc-800"
            : "border-dashed border-zinc-300 bg-zinc-50/60"
      }`}
      onClick={() => slot.word && onRemove(slot.id)}
      title={slot.word ? "Click để gỡ từ" : "Thả từ vào đây"}
    >
      {slot.word ? (
        <span className="text-sm font-medium text-white flex items-center justify-center w-full">
          {slot.word.word}
        </span>
      ) : (
        <span className="text-xs text-zinc-400 w-full text-center select-none">thả từ vào</span>
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
    <Card className="border border-zinc-200/80 bg-white rounded-2xl shadow-xs overflow-hidden">
      <CardHeader className="pb-3 border-b border-zinc-100 bg-zinc-50/50 px-6 py-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base font-semibold text-zinc-900">
            <FileText className="h-4 w-4 text-zinc-700" /> Kéo thả điền từ
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-zinc-200 bg-white text-zinc-700 text-xs font-mono">
              Câu hỏi {index + 1}/{total}
            </Badge>
            <button onClick={onReport} className="text-zinc-400 hover:text-zinc-900 transition-colors p-1 rounded-md" title="Báo cáo câu hỏi">
              <Flag className="h-4 w-4" />
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        <div className="p-5 rounded-xl bg-zinc-50/80 border border-zinc-200/80 leading-10 text-base text-zinc-800">
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
          <p className="text-xs text-zinc-500 font-semibold mb-3 uppercase tracking-wider">Từ vựng — Kéo thả vào ô trống</p>
          <div className="flex flex-wrap gap-2.5">
            {wordChips.map((chip) => (
              <DraggableWord key={chip.id} chip={chip} isUsed={usedWords.includes(chip.word)} />
            ))}
          </div>
        </div>
        <div className="flex gap-2 pt-2">
          <Button variant="outline" onClick={reset} size="sm" className="border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50 text-zinc-700 rounded-xl">
            <RotateCcw className="h-4 w-4 mr-2 text-zinc-500" /> Làm lại
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
    <Card className="border border-zinc-200/80 bg-white rounded-2xl shadow-xs overflow-hidden">
      <CardHeader className="pb-3 border-b border-zinc-100 bg-zinc-50/50 px-6 py-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base font-semibold text-zinc-900">
            <FileText className="h-4 w-4 text-zinc-700" /> Gõ từ điền khuyết
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-zinc-200 bg-white text-zinc-700 text-xs font-mono">
              Câu hỏi {index + 1}/{total}
            </Badge>
            <button onClick={onReport} className="text-zinc-400 hover:text-zinc-900 transition-colors p-1 rounded-md" title="Báo cáo câu hỏi">
              <Flag className="h-4 w-4" />
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        <div className="p-5 rounded-xl bg-zinc-50/80 border border-zinc-200/80 leading-10 text-base text-zinc-800">
          {tokens.map((token: string, i: number) => {
            if (token.startsWith("[blank_")) {
              const wordStr = currentValue[token] || "";
              return (
                <Input
                  key={i}
                  value={wordStr}
                  onChange={(e) => handleChange(token, e.target.value)}
                  className="inline-flex items-center min-w-[96px] h-8 px-2 mx-1 border-b-2 border-zinc-300 focus:border-zinc-900 bg-transparent text-center text-sm font-medium text-zinc-900 w-auto focus-visible:ring-0 focus:outline-none transition-colors"
                  placeholder="điền vào đây..."
                />
              );
            }
            return <span key={i}>{token} </span>;
          })}
        </div>
        <div className="flex gap-2 pt-2">
          <Button variant="outline" onClick={reset} size="sm" className="border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50 text-zinc-700 rounded-xl">
            <RotateCcw className="h-4 w-4 mr-2 text-zinc-500" /> Làm lại
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function AudioPlayer({ question, index, total, onAnswer, onReport, currentValue = {} }: any) {
  const content = question.content || { mediaUrl: '', subQuestions: [] };

  return (
    <Card className="border border-zinc-200/80 bg-white rounded-2xl shadow-xs overflow-hidden">
      <CardHeader className="pb-3 border-b border-zinc-100 bg-zinc-50/50 px-6 py-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base font-semibold text-zinc-900">
            {question.type === 'Audio' ? <Headphones className="h-4 w-4 text-zinc-700" /> : <Video className="h-4 w-4 text-zinc-700" />} {question.type === 'Audio' ? 'Nghe hiểu (Listening)' : 'Video bài thi'}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-zinc-200 bg-white text-zinc-700 text-xs font-mono">
              Câu hỏi {index + 1}/{total}
            </Badge>
            <button onClick={onReport} className="text-zinc-400 hover:text-zinc-900 transition-colors p-1 rounded-md" title="Báo cáo câu hỏi">
              <Flag className="h-4 w-4" />
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        {content.mediaUrl && (
          <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200/80 flex justify-center">
            {question.type === 'Audio' ? (
              <audio src={content.mediaUrl} controls className="w-full max-w-md" />
            ) : (
              <video src={content.mediaUrl} controls className="w-full max-w-md rounded-lg" />
            )}
          </div>
        )}

        <div className="space-y-5 pt-2">
          {content.subQuestions?.map((sq: any, i: number) => (
             <div key={sq.id} className="space-y-3 p-4 bg-zinc-50/70 border border-zinc-200/80 rounded-xl">
                <p className="font-semibold text-sm text-zinc-900">
                  <span className="font-bold text-zinc-900 mr-1.5">{i + 1}.</span>
                  {sq.text}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-2">
                  {sq.options?.map((opt: string) => {
                    const isSelected = currentValue[sq.id] === opt;
                    return (
                      <button 
                        key={opt}
                        onClick={() => onAnswer(question._id, { ...currentValue, [sq.id]: opt })}
                        className={`w-full text-left p-3.5 rounded-xl border text-sm transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                          isSelected 
                            ? 'border-zinc-900 bg-zinc-900/[0.04] text-zinc-900 font-semibold shadow-xs' 
                            : 'border-zinc-200/80 bg-white text-zinc-800 hover:border-zinc-400 hover:bg-zinc-50 hover:translate-x-0.5'
                        }`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
             </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function ReadingQuestion({ question, index, total, onAnswer, onReport, currentValue = {} }: any) {
  const content = question.content || { title: '', passage: '', subQuestions: [] };
  const subQuestions = Array.isArray(content.subQuestions) ? content.subQuestions : [];

  return (
    <Card className="border border-zinc-200/80 bg-white rounded-2xl shadow-xs overflow-hidden">
      <CardHeader className="pb-3 border-b border-zinc-100 bg-zinc-50/50 px-6 py-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base font-semibold text-zinc-900">
            <BookOpen className="h-4 w-4 text-zinc-700" /> Đọc hiểu (Reading Comprehension)
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-zinc-200 bg-white text-zinc-700 text-xs font-mono">
              Câu hỏi {index + 1}/{total}
            </Badge>
            <button onClick={onReport} className="text-zinc-400 hover:text-zinc-900 transition-colors p-1 rounded-md" title="Báo cáo câu hỏi">
              <Flag className="h-4 w-4" />
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        {/* Reading Passage Card */}
        <div className="p-5 rounded-2xl bg-zinc-50 border border-zinc-200/80 space-y-2">
          {content.title && (
            <h4 className="font-bold text-base text-zinc-900 mb-1">{content.title}</h4>
          )}
          <div className="text-sm leading-relaxed text-zinc-800 whitespace-pre-wrap font-serif">
            {content.passage || 'Chưa có đoạn văn bản.'}
          </div>
        </div>

        {/* Subquestions */}
        <div className="space-y-5 pt-1">
          <h5 className="text-xs uppercase tracking-wider text-zinc-500 font-semibold">
            Các câu hỏi liên quan ({subQuestions.length})
          </h5>
          {subQuestions.map((sq: any, i: number) => (
            <div key={sq.id || i} className="space-y-3 p-4 bg-zinc-50/70 border border-zinc-200/80 rounded-xl">
              <p className="font-semibold text-sm text-zinc-900">
                <span className="font-bold text-zinc-900 mr-1.5">{i + 1}.</span>
                {sq.text}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-2">
                {(sq.options || []).map((opt: string) => {
                  const isSelected = currentValue[sq.id] === opt;
                  return (
                    <button
                      key={opt}
                      onClick={() => onAnswer(question._id, { ...currentValue, [sq.id]: opt })}
                      className={`w-full text-left p-3.5 rounded-xl border text-sm transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                        isSelected
                          ? 'border-zinc-900 bg-zinc-900/[0.04] text-zinc-900 font-semibold shadow-xs'
                          : 'border-zinc-200/80 bg-white text-zinc-800 hover:border-zinc-400 hover:bg-zinc-50 hover:translate-x-0.5'
                      }`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
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
    <Card className="border border-zinc-200/80 bg-white rounded-2xl shadow-xs overflow-hidden">
      <CardHeader className="pb-3 border-b border-zinc-100 bg-zinc-50/50 px-6 py-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base font-semibold text-zinc-900">
            <FileText className="h-4 w-4 text-zinc-700" /> Trắc nghiệm
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-zinc-200 bg-white text-zinc-700 text-xs font-mono">
              Câu hỏi {index + 1}/{total}
            </Badge>
            <button onClick={onReport} className="text-zinc-400 hover:text-zinc-900 transition-colors p-1 rounded-md" title="Báo cáo câu hỏi">
              <Flag className="h-4 w-4" />
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6 space-y-4">
        <div className="space-y-3">
          <p className="text-base font-medium text-zinc-900">{content.text}</p>
          <div className="space-y-2.5 pt-2">
            {(content.options || []).map((opt: string) => {
              const isSelected = currentValue === opt;
              return (
                <button 
                  key={opt} 
                  onClick={() => onAnswer(question._id, opt)}
                  className={`w-full text-left p-3.5 rounded-xl border text-sm transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                    isSelected 
                      ? 'border-zinc-900 bg-zinc-900/[0.04] text-zinc-900 font-semibold shadow-xs' 
                      : 'border-zinc-200/80 bg-white text-zinc-800 hover:border-zinc-400 hover:bg-zinc-50 hover:translate-x-0.5'
                  }`}
                >
                  {opt}
                </button>
              );
            })}
          </div>
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
          <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900">Exam Center</h1>
          <p className="text-zinc-500 text-sm mt-1">Kiểm tra năng lực ngoại ngữ và đánh giá tiến độ thực tế</p>
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Input 
            placeholder="Tìm kiếm bài thi..." 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
            onKeyDown={(e) => e.key === 'Enter' && fetchExams()}
            className="max-w-[220px] bg-white border-zinc-200 text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:ring-4 focus:ring-zinc-900/5 rounded-xl transition-all duration-200"
          />
          <Button variant="outline" onClick={fetchExams} className="border-zinc-200 hover:border-zinc-400 hover:bg-zinc-50 rounded-xl text-zinc-700">
            <Search className="h-4 w-4" />
          </Button>
          <select 
            value={sort} 
            onChange={(e) => setSort(e.target.value)}
            className="flex h-9 w-[140px] items-center justify-between rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800 shadow-2xs focus:outline-none focus:border-zinc-900 focus:ring-4 focus:ring-zinc-900/5 transition-all"
          >
            <option value="newest">Mới nhất</option>
            <option value="oldest">Cũ nhất</option>
            <option value="highest_rated">Đánh giá cao</option>
          </select>
        </div>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {exams.length === 0 ? (
          <div className="col-span-full text-center py-16 text-zinc-500 border border-dashed border-zinc-300 rounded-2xl bg-zinc-50/50">
            Chưa có bài thi nào khả dụng. Vui lòng quay lại sau!
          </div>
        ) : (
          exams.map((exam) => (
            <Card key={exam._id} className="group border border-zinc-200/80 bg-white hover:border-zinc-900 hover:-translate-y-0.5 hover:shadow-[0_10px_26px_-6px_rgba(0,0,0,0.07)] transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] rounded-2xl overflow-hidden flex flex-col justify-between">
              <div>
                <div className="relative h-44 overflow-hidden bg-zinc-100">
                  {exam.thumbnail ? (
                    <img src={exam.thumbnail} alt={exam.title} className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500 ease-out" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <BookOpen className="h-10 w-10 text-zinc-400" />
                    </div>
                  )}
                  {exam.progress && exam.progress.status === 'Completed' && (
                    <div className="absolute top-3 right-3">
                      <span className="bg-zinc-900 text-white font-mono text-xs px-2.5 py-1 rounded-full shadow-xs">
                        Điểm: {Math.round(exam.progress.score)}%
                      </span>
                    </div>
                  )}
                </div>
                <CardContent className="p-5">
                  <h3 className="font-bold text-base text-zinc-900 group-hover:text-zinc-700 transition-colors line-clamp-1">{exam.title}</h3>
                  <p className="text-xs text-zinc-500 line-clamp-2 mt-1.5 h-8 leading-relaxed">{exam.description || "Chưa có mô tả cho bài kiểm tra này."}</p>
                  
                  <div className="flex flex-wrap items-center gap-1.5 mt-4 pt-3 border-t border-zinc-100">
                    <Badge variant="outline" className="border-zinc-200 bg-zinc-50 text-zinc-700 text-[11px] font-mono rounded-lg">
                      <FileText className="w-3 h-3 mr-1 text-zinc-500" /> {exam.totalQuestions} câu
                    </Badge>
                    {exam.durationMinutes && (
                      <Badge variant="outline" className="border-zinc-200 bg-zinc-50 text-zinc-700 text-[11px] font-mono rounded-lg">
                        <Clock className="w-3 h-3 mr-1 text-zinc-500" /> {exam.durationMinutes}p
                      </Badge>
                    )}
                    {exam.level && (
                      <Badge variant="secondary" className="bg-zinc-100 text-zinc-800 text-[11px] font-medium rounded-lg">
                        {exam.level}
                      </Badge>
                    )}
                    {exam.passingScore && (
                      <Badge variant="outline" className="border-zinc-200 bg-zinc-50 text-zinc-700 text-[11px] rounded-lg">
                        Đạt: {exam.passingScore}%
                      </Badge>
                    )}
                    {exam.hasPassword && <Lock className="w-3.5 h-3.5 text-zinc-400 ml-auto" />}
                  </div>
                  
                  {exam.totalRatings && exam.totalRatings > 0 ? (
                    <div 
                      className="flex items-center gap-1.5 mt-3 cursor-pointer bg-zinc-100 hover:bg-zinc-200 px-2.5 py-1 rounded-lg w-fit transition-colors"
                      onClick={(e) => { e.stopPropagation(); openRatingsModal(exam._id); }}
                    >
                      <span className="text-xs font-semibold text-zinc-900">★ {(exam.averageRating || 0).toFixed(1)}</span>
                      <span className="text-xs text-zinc-500">({exam.totalRatings} đánh giá)</span>
                    </div>
                  ) : null}
                </CardContent>
              </div>
              <CardFooter className="p-5 pt-0">
                <Button 
                  className="w-full bg-[#161616] hover:bg-black text-white font-medium rounded-xl h-10 shadow-xs hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99] transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]" 
                  onClick={() => handleStartExam(exam)}
                >
                  {exam.progress?.status === 'Completed' ? 'Làm lại bài thi' : 'Bắt đầu làm bài'}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </CardFooter>
            </Card>
          ))
        )}
      </div>

      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs">
          <div className="bg-white border border-zinc-200 rounded-2xl shadow-2xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-bold text-zinc-900 mb-2 flex items-center gap-2"><Lock className="h-5 w-5 text-zinc-700" /> Bài thi có mật khẩu</h3>
            <p className="text-sm text-zinc-500 mb-4">Vui lòng nhập mật khẩu để bắt đầu làm bài.</p>
            <Input 
              type="password" 
              placeholder="Nhập mật khẩu" 
              value={passwordInput} 
              onChange={e => setPasswordInput(e.target.value)} 
              onKeyDown={e => e.key === 'Enter' && handleVerifyPassword()}
              className="border-zinc-200 focus:border-zinc-900 rounded-xl"
            />
            {passwordError && <p className="text-xs text-rose-600 mt-2">{passwordError}</p>}
            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" onClick={() => setShowPasswordModal(null)} className="border-zinc-200 hover:bg-zinc-50 rounded-xl">Hủy</Button>
              <Button onClick={handleVerifyPassword} className="bg-[#161616] hover:bg-black text-white rounded-xl">Xác nhận</Button>
            </div>
          </div>
        </div>
      )}

      {viewingRatingsId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs">
          <div className="bg-white border border-zinc-200 rounded-2xl shadow-2xl p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-zinc-900 mb-4">Thống kê & Đánh giá</h3>
            
            {/* Biểu đồ thống kê */}
            <div className="bg-zinc-50 p-4 rounded-xl mb-6 border border-zinc-200/80">
              <h4 className="text-sm font-semibold text-zinc-900 mb-3">Biểu đồ phân bổ sao</h4>
              {[5,4,3,2,1].map(star => {
                const count = ratingsData.filter(r => r.rating === star).length;
                const pct = ratingsData.length > 0 ? (count / ratingsData.length) * 100 : 0;
                return (
                  <div key={star} className="flex items-center gap-3 text-sm mb-2">
                    <span className="w-8 font-medium text-zinc-600">{star} ★</span>
                    <div className="flex-1 h-2 bg-zinc-200 rounded-full overflow-hidden">
                      <div className="h-full bg-zinc-900 transition-all duration-500" style={{ width: `${pct}%` }}></div>
                    </div>
                    <span className="w-8 text-right font-medium text-zinc-700">{count}</span>
                  </div>
                )
              })}
            </div>

            <h4 className="text-sm font-semibold text-zinc-900 mb-3">Chi tiết nhận xét</h4>
            <div className="space-y-4">
              {ratingsData.length === 0 ? (
                <p className="text-center text-zinc-500 py-8">Chưa có dữ liệu chi tiết.</p>
              ) : (
                ratingsData.map((rating, idx) => (
                  <div key={idx} className="border-b border-zinc-100 pb-4 last:border-0 last:pb-0">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="text-zinc-900 text-sm font-bold">★ {rating.rating}</div>
                      <div className="text-xs text-zinc-400">{new Date(rating.createdAt).toLocaleDateString('vi-VN')}</div>
                    </div>
                    <p className="text-sm text-zinc-700">{rating.review || <span className="text-zinc-400 italic">Không có nhận xét</span>}</p>
                  </div>
                ))
              )}
            </div>
            <div className="flex justify-end mt-6">
              <Button onClick={() => setViewingRatingsId(null)} className="bg-[#161616] hover:bg-black text-white rounded-xl">Đóng</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- Post-Exam Review Screen ---
function ExamReviewScreen({
  result,
  exam,
  onRetake,
  onBack,
  onRate,
  ratingSubmitted,
  rating,
  setRating,
  review,
  setReview
}: {
  result: any;
  exam: any;
  onRetake: () => void;
  onBack: () => void;
  onRate: () => void;
  ratingSubmitted: boolean;
  rating: number;
  setRating: (n: number) => void;
  review: string;
  setReview: (s: string) => void;
}) {
  const isPassed = result.passed;
  const reviews = Array.isArray(result.questionReviews) ? result.questionReviews : [];
  const spentMinutes = Math.floor((result.durationSpentSeconds || 0) / 60);
  const spentSecs = (result.durationSpentSeconds || 0) % 60;
  const timeFormatted = spentMinutes > 0 ? `${spentMinutes}m ${spentSecs}s` : `${spentSecs}s`;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pt-4 pb-12">
      {/* Top Hero Banner */}
      <Card className="border border-zinc-200/80 bg-white shadow-xs rounded-2xl overflow-hidden">
        <CardContent className="p-8 text-center space-y-5">
          <div className="flex justify-center">
            {isPassed ? (
              <div className="w-16 h-16 rounded-full bg-zinc-100 text-zinc-900 flex items-center justify-center border border-zinc-200 shadow-2xs">
                <CheckCircle2 className="w-9 h-9 text-zinc-900" />
              </div>
            ) : (
              <div className="w-16 h-16 rounded-full bg-zinc-100 text-zinc-700 flex items-center justify-center border border-zinc-200 shadow-2xs">
                <AlertCircle className="w-9 h-9 text-zinc-700" />
              </div>
            )}
          </div>

          <div>
            <h2 className="text-2xl font-extrabold tracking-tight text-zinc-900">
              {isPassed ? "Chúc Mừng! Bạn Đã Đạt Bài Thi 🎉" : "Hoàn Thành Bài Kiểm Tra"}
            </h2>
            <p className="text-sm text-zinc-500 mt-1 font-medium">{exam.title}</p>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl mx-auto pt-2">
            <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-200/80">
              <div className="text-xs text-zinc-500 font-medium">Điểm số</div>
              <div className="text-2xl font-extrabold text-zinc-900 mt-0.5 font-mono">{Math.round(result.score)}%</div>
            </div>
            <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-200/80">
              <div className="text-xs text-zinc-500 font-medium">Kết quả</div>
              <div className="text-base font-bold mt-1 text-zinc-900">
                {isPassed ? 'ĐẠT (Passed)' : 'CHƯA ĐẠT'}
              </div>
            </div>
            <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-200/80">
              <div className="text-xs text-zinc-500 font-medium">Số câu đúng</div>
              <div className="text-2xl font-extrabold text-zinc-900 mt-0.5 font-mono">{result.correctCount}/{result.total}</div>
            </div>
            <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-200/80">
              <div className="text-xs text-zinc-500 font-medium">Thời gian làm</div>
              <div className="text-base font-bold mt-1 font-mono text-zinc-900">{timeFormatted}</div>
            </div>
          </div>

          <div className="flex justify-center gap-3 pt-3">
            <Button 
              onClick={onRetake} 
              className="gap-2 bg-[#161616] hover:bg-black text-white rounded-xl shadow-xs hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
            >
              <RotateCcw className="w-4 h-4" /> Làm lại bài thi
            </Button>
            <Button 
              onClick={onBack} 
              variant="outline" 
              className="border-zinc-200 hover:bg-zinc-50 text-zinc-800 rounded-xl"
            >
              Quay lại danh sách
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Question by Question Review Header */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-zinc-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-zinc-700" />
            Chi tiết kết quả & Lời giải thích từng câu ({reviews.length})
          </h3>
          <span className="text-xs text-zinc-500">
            Đối chiếu đáp án chuẩn kèm giải thích
          </span>
        </div>

        {reviews.map((rev: any, idx: number) => {
          const isCorrect = rev.isCorrect;
          return (
            <Card key={rev.questionId || idx} className="border border-zinc-200/80 bg-white rounded-2xl shadow-xs overflow-hidden">
              <CardHeader className="py-3.5 px-5 bg-zinc-50/70 border-b border-zinc-200/80 flex flex-row items-center justify-between space-y-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs bg-white border border-zinc-200 px-2.5 py-1 rounded-lg font-mono text-zinc-800">
                    Câu {idx + 1}
                  </span>
                  <Badge variant="outline" className="text-xs border-zinc-200 bg-white text-zinc-700">
                    {rev.type === 'MultipleChoice' ? 'Trắc nghiệm' :
                     rev.type === 'Reading' ? 'Đọc hiểu' :
                     rev.type === 'Audio' ? 'Nghe hiểu' :
                     rev.type === 'DragDrop' ? 'Kéo thả' : 'Điền khuyết'}
                  </Badge>
                </div>
                <Badge 
                  variant="outline" 
                  className={`gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg ${
                    isCorrect 
                      ? "border-zinc-900 bg-zinc-900 text-white" 
                      : "border-zinc-200 bg-zinc-100 text-zinc-700"
                  }`}
                >
                  {isCorrect ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                  {isCorrect ? "Chính xác" : "Chưa chính xác"}
                </Badge>
              </CardHeader>

              <CardContent className="p-6 space-y-4">
                {/* For Reading */}
                {rev.type === 'Reading' && rev.content?.passage && (
                  <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200/80 text-xs font-serif leading-relaxed space-y-1 text-zinc-800">
                    {rev.content.title && <div className="font-bold font-sans text-sm text-zinc-900 mb-1">{rev.content.title}</div>}
                    <div>{rev.content.passage}</div>
                  </div>
                )}

                {/* For Audio Transcript */}
                {rev.type === 'Audio' && rev.content?.transcript && (
                  <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200/80 text-xs space-y-1">
                    <div className="font-bold text-zinc-900 flex items-center gap-1.5">
                      <Headphones className="w-3.5 h-3.5 text-zinc-700" /> Bản gỡ băng (Audio Transcript):
                    </div>
                    <div className="font-mono text-zinc-600 whitespace-pre-wrap">{rev.content.transcript}</div>
                  </div>
                )}

                {/* Subquestions Reviews if Reading or Audio */}
                {Array.isArray(rev.subQuestionReviews) && rev.subQuestionReviews.length > 0 ? (
                  <div className="space-y-3">
                    {rev.subQuestionReviews.map((sqRev: any, sIdx: number) => (
                      <div key={sqRev.id || sIdx} className="p-4 bg-zinc-50/70 border border-zinc-200/80 rounded-xl space-y-2.5 text-xs">
                        <div className="flex items-center justify-between font-semibold text-zinc-900">
                          <span>{sIdx + 1}. {sqRev.text}</span>
                          <span className={sqRev.isCorrect ? "text-zinc-900 font-bold" : "text-zinc-500 font-medium"}>
                            {sqRev.isCorrect ? "Đúng ✓" : "Sai ✗"}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                          <div className="p-3 rounded-lg bg-white border border-zinc-200">
                            <span className="text-zinc-500 block text-[11px] mb-0.5">Bạn chọn:</span>
                            <span className={sqRev.isCorrect ? "text-zinc-900 font-semibold" : "text-zinc-600 font-medium"}>
                              {sqRev.userAnswer || <span className="italic text-zinc-400">Bỏ trống</span>}
                            </span>
                          </div>
                          <div className="p-3 rounded-lg bg-zinc-100 border border-zinc-200">
                            <span className="text-zinc-500 block text-[11px] mb-0.5">Đáp án đúng:</span>
                            <span className="text-zinc-900 font-bold">{sqRev.correctAnswer}</span>
                          </div>
                        </div>
                        {sqRev.explanation && (
                          <div className="p-2.5 bg-zinc-50 rounded-lg border border-zinc-200 text-[11px] text-zinc-700 leading-relaxed">
                            💡 {sqRev.explanation}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  /* Standard MCQ / DragDrop / FillBlank question review */
                  <div className="space-y-2 text-xs">
                    {rev.content?.text && (
                      <div className="font-semibold text-sm text-zinc-900">{rev.content.text}</div>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      <div className="p-3 rounded-xl bg-white border border-zinc-200">
                        <span className="text-zinc-500 block text-[11px] mb-0.5">Câu trả lời của bạn:</span>
                        <span className={isCorrect ? "text-zinc-900 font-semibold" : "text-zinc-600 font-medium"}>
                          {typeof rev.userAnswer === 'object' ? JSON.stringify(rev.userAnswer) : (rev.userAnswer || <span className="italic text-zinc-400">Bỏ trống</span>)}
                        </span>
                      </div>
                      <div className="p-3 rounded-xl bg-zinc-100 border border-zinc-200">
                        <span className="text-zinc-500 block text-[11px] mb-0.5">Đáp án chính xác:</span>
                        <span className="text-zinc-900 font-bold">
                          {typeof rev.correctAnswer === 'object' ? JSON.stringify(rev.correctAnswer) : rev.correctAnswer}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Question Explanation Box */}
                {rev.explanation && (
                  <div className="p-3.5 bg-zinc-50 rounded-xl border border-zinc-200/80 text-xs space-y-1">
                    <div className="font-semibold text-zinc-900 flex items-center gap-1.5">
                      <HelpCircle className="w-3.5 h-3.5 text-zinc-700" /> Lời giải thích chi tiết:
                    </div>
                    <div className="text-zinc-600 leading-relaxed pl-5">{rev.explanation}</div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Ratings Section */}
      {!ratingSubmitted ? (
        <Card className="mt-8 border border-zinc-200/80 bg-white shadow-xs rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base font-bold text-zinc-900">Đánh giá chất lượng đề thi</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star 
                  key={star} 
                  className={`h-8 w-8 cursor-pointer transition-transform hover:scale-110 duration-150 ${rating >= star ? 'fill-zinc-900 text-zinc-900' : 'text-zinc-300'}`} 
                  onClick={() => setRating(star)} 
                />
              ))}
            </div>
            <Textarea 
              placeholder="Nhận xét của bạn về đề thi này (Độ khó, chất lượng âm thanh, độ bám sát thực tế)..." 
              value={review} 
              onChange={e => setReview(e.target.value)} 
              rows={3} 
              className="text-xs border-zinc-200 focus:border-zinc-900 rounded-xl"
            />
            <Button onClick={onRate} className="w-full bg-[#161616] hover:bg-black text-white rounded-xl h-10 font-medium">Gửi đánh giá</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="p-4 bg-zinc-100 text-zinc-800 rounded-xl border border-zinc-200 text-center text-sm font-medium">
          Cảm ơn bạn đã đóng góp ý kiến đánh giá đề thi!
        </div>
      )}

      <div className="flex justify-center pt-4">
        <Button onClick={onBack} size="lg" variant="outline" className="border-zinc-200 hover:bg-zinc-50 rounded-xl">
          ← Quay lại danh sách đề thi
        </Button>
      </div>
    </div>
  );
}

// --- Taking View ---
export function ExamTakingView({ examId, onBack }: { examId: string; onBack: () => void }) {
  const [exam, setExam] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [reportOpen, setReportOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Countdown timer state
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [totalSeconds, setTotalSeconds] = useState<number>(0);
  const timerRef = useRef<any>(null);
  
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState("");
  const [ratingSubmitted, setRatingSubmitted] = useState(false);

  useEffect(() => {
    axios.get(`/api/exams/${examId}`, { withCredentials: true })
      .then(res => {
        const examData = res.data?.data || null;
        setExam(examData);
        if (examData) {
          const duration = (examData.durationMinutes || 45) * 60;
          setTotalSeconds(duration);
          setTimeLeft(duration);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError("Không thể tải chi tiết bài thi. Vui lòng thử lại sau.");
        setLoading(false);
      });
  }, [examId]);

  // Countdown Interval
  useEffect(() => {
    if (!exam || result || loading || timeLeft <= 0) return;

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          toast.warning("Hết thời gian làm bài! Đang tự động nộp bài...");
          handleSubmit(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [exam, result, loading]);

  const handleAnswer = (questionId: string, value: any) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const handleSubmit = async (auto = false) => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const spentSeconds = Math.max(0, totalSeconds - timeLeft);
      const res = await axios.post(`/api/exams/${examId}/submit`, { 
        answers,
        durationSpentSeconds: spentSeconds
      }, { withCredentials: true });

      if (res.data.success) {
        setResult(res.data.data);
        if (auto) {
          toast.info("Đã tự động nộp bài khi hết giờ!");
        } else {
          toast.success("Nộp bài thi thành công!");
        }
      }
    } catch (err) {
      toast.error("Không thể nộp bài thi. Vui lòng thử lại.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRetake = () => {
    setResult(null);
    setAnswers({});
    setCurrentIndex(0);
    const duration = (exam?.durationMinutes || 45) * 60;
    setTimeLeft(duration);
    setRatingSubmitted(false);
    setRating(0);
    setReview("");
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
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
        <div className="w-8 h-8 border-4 border-zinc-900 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-12 text-zinc-900 border border-zinc-200 rounded-2xl bg-zinc-50">
        <p>{error}</p>
        <Button className="mt-4 bg-[#161616] hover:bg-black text-white rounded-xl" onClick={onBack}>Trở về danh sách</Button>
      </div>
    );
  }

  if (result) {
    return (
      <ExamReviewScreen
        result={result}
        exam={exam}
        onRetake={handleRetake}
        onBack={onBack}
        onRate={handleRate}
        ratingSubmitted={ratingSubmitted}
        rating={rating}
        setRating={setRating}
        review={review}
        setReview={setReview}
      />
    );
  }

  if (!exam || !exam.questions || exam.questions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center space-y-4 max-w-md mx-auto">
        <FileText className="w-12 h-12 text-zinc-400 mb-2" />
        <h3 className="text-lg font-bold text-zinc-900">Bài kiểm tra chưa có câu hỏi</h3>
        <p className="text-sm text-zinc-500">
          Đề thi này hiện chưa có câu hỏi nào. Bạn có thể vào Creator Studio để thêm câu hỏi cho đề thi.
        </p>
        <Button variant="outline" className="mt-2 border-zinc-200 hover:bg-zinc-50 rounded-xl" onClick={onBack}>← Quay lại</Button>
      </div>
    );
  }

  const currentQuestion = exam.questions[currentIndex];
  const progressPercent = ((currentIndex) / exam.questions.length) * 100;

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-10">
      <div className="flex items-center justify-between">
        <div>
          <Button variant="ghost" onClick={onBack} className="mb-1 -ml-4 text-xs text-zinc-500 hover:text-zinc-900">
            ← Quay lại
          </Button>
          <h1 className="text-2xl font-extrabold tracking-tight text-zinc-900">{exam.title}</h1>
          <div className="flex items-center gap-2 mt-1">
            {exam.level && <Badge variant="outline" className="text-[11px] font-mono border-zinc-200 text-zinc-700">{exam.level}</Badge>}
            {exam.skills && exam.skills.map((s: string) => (
              <Badge key={s} variant="secondary" className="text-[11px] bg-zinc-100 text-zinc-800">{s}</Badge>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Countdown Timer Display */}
          <div className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border font-mono font-bold text-xs ${
            timeLeft < 300 
              ? 'border-zinc-900 bg-zinc-900 text-white animate-pulse' 
              : 'border-zinc-200 bg-zinc-50 text-zinc-900 shadow-2xs'
          }`}>
            <Clock className="w-3.5 h-3.5" />
            <span>{formatTime(timeLeft)}</span>
          </div>

          <div className="text-right">
            <p className="text-xs text-zinc-500">Tiến độ</p>
            <p className="font-bold text-sm text-zinc-900">{currentIndex + 1} / {exam.questions.length}</p>
          </div>
          <div className="w-20">
            <Progress value={progressPercent} className="h-2 bg-zinc-100 [&>div]:bg-zinc-900" />
          </div>
        </div>
      </div>

      {/* Questions Bar */}
      <div className="flex gap-2 text-sm overflow-x-auto pb-2">
        {exam.questions.map((q: any, i: number) => {
          let Icon = FileText;
          if (q.type === 'Audio') Icon = Headphones;
          if (q.type === 'Reading') Icon = BookOpen;
          if (q.type === 'Video') Icon = Video;

          const active = i === currentIndex;
          const done = answers[q._id] !== undefined && answers[q._id] !== null;

          return (
            <button
              key={q._id} 
              onClick={() => setCurrentIndex(i)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs whitespace-nowrap cursor-pointer transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                active 
                  ? "border-zinc-900 bg-zinc-900 text-white font-bold shadow-xs scale-105" 
                  : done 
                    ? "bg-zinc-100 border-zinc-200 text-zinc-900 font-medium hover:border-zinc-300" 
                    : "border-dashed border-zinc-300 text-zinc-500 hover:bg-zinc-50 hover:border-zinc-400"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              Câu {i + 1}
              {done && <CheckCircle2 className="h-3 w-3 text-zinc-900" />}
            </button>
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
      {currentQuestion.type === 'Reading' && (
        <ReadingQuestion 
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
        <Button variant="outline" onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))} disabled={currentIndex === 0} className="border-zinc-200 hover:bg-zinc-50 rounded-xl text-zinc-700">
          <SkipBack className="h-4 w-4 mr-2" /> Câu trước
        </Button>
        
        {currentIndex < exam.questions.length - 1 ? (
          <Button onClick={() => setCurrentIndex(prev => Math.min(exam.questions.length - 1, prev + 1))} className="bg-[#161616] hover:bg-black text-white rounded-xl shadow-xs hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200">
            Câu tiếp theo <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        ) : (
          <Button 
            onClick={() => handleSubmit(false)} 
            disabled={submitting || Object.keys(answers).length < exam.questions.length}
            className="bg-[#161616] hover:bg-black text-white font-semibold rounded-xl shadow-xs hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
          >
            {submitting ? 'Đang nộp bài...' : 'Nộp bài thi'}
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
