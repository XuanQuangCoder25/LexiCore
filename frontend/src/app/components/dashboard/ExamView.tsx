import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
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
  BookOpen
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
  
  const tokens = content.text.split(/(\[blank_\d+\])/).filter(Boolean);
  const blankIds = tokens.filter((t: string) => t.startsWith("[blank_"));
  
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

  useEffect(() => {
    axios.get("/api/exams", { withCredentials: true })
      .then(res => {
        setExams(res.data?.data || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError("Không thể tải danh sách bài thi. Vui lòng thử lại sau.");
        setLoading(false);
      });
  }, []);

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
      <div>
        <h1 className="text-3xl font-bold">Exam Center</h1>
        <p className="text-muted-foreground">Test your knowledge and earn rewards</p>
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
                </div>
              </CardContent>
              <CardFooter className="p-4 pt-0">
                <Button className="w-full" onClick={() => onSelectExam(exam._id)}>
                  {exam.progress?.status === 'Completed' ? 'Retake Exam' : 'Start Exam'}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </CardFooter>
            </Card>
          ))
        )}
      </div>
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
        <Button onClick={onBack} size="lg">Back to Exams</Button>
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

      {(currentQuestion.type === 'DragDrop' || currentQuestion.type === 'FillBlank') && (
        <DragDropQuestion 
          question={currentQuestion} 
          index={currentIndex} 
          total={exam.questions.length} 
          onAnswer={handleAnswer} 
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

      <ReportIssueModal open={reportOpen} onClose={() => setReportOpen(false)} />
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
