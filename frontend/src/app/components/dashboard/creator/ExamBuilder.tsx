import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import { Textarea } from "../../ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "../../ui/card";
import { 
  Plus, Save, Globe, Lock, Trash2, ArrowLeft, GripVertical, FileText, Headphones, Video as VideoIcon, CheckCircle2 
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../ui/select";
import { Switch } from "../../ui/switch";

interface ExamBuilderProps {
  examId: string;
  onBack: () => void;
}

export function ExamBuilder({ examId, onBack }: ExamBuilderProps) {
  const [exam, setExam] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchExam();
  }, [examId]);

  const fetchExam = async () => {
    try {
      const res = await axios.get(`/api/v1/creator/exams/${examId}`, { withCredentials: true });
      if (res.data.success) {
        setExam(res.data.data);
        setQuestions(res.data.data.questions || []);
      }
    } catch (err) {
      toast.error("Failed to load exam details");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDraft = async () => {
    setSaving(true);
    try {
      // 1. Update general info
      await axios.put(`/api/v1/creator/exams/${examId}`, {
        title: exam.title,
        description: exam.description,
        thumbnail: exam.thumbnail,
        status: exam.status
      }, { withCredentials: true });

      // 2. Update questions
      await axios.post(`/api/v1/creator/exams/${examId}/questions`, {
        questions: questions.map((q, idx) => ({ ...q, order: idx }))
      }, { withCredentials: true });

      toast.success("Đã lưu nháp thành công");
    } catch (err) {
      toast.error("Lỗi khi lưu bài kiểm tra");
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    // Basic validation
    if (questions.length === 0) {
      return toast.error("Bài kiểm tra phải có ít nhất 1 câu hỏi");
    }
    
    // Update status locally and save
    setExam({ ...exam, status: 'Published' });
    
    setSaving(true);
    try {
      await axios.put(`/api/v1/creator/exams/${examId}`, {
        ...exam,
        status: 'Published'
      }, { withCredentials: true });

      await axios.post(`/api/v1/creator/exams/${examId}/questions`, {
        questions: questions.map((q, idx) => ({ ...q, order: idx }))
      }, { withCredentials: true });

      toast.success("Đã xuất bản bài kiểm tra!");
    } catch (err) {
      toast.error("Lỗi khi xuất bản");
    } finally {
      setSaving(false);
    }
  };

  const addQuestion = (type: string) => {
    let newQ: any = { type, id: Date.now().toString() };
    if (type === 'MultipleChoice') {
      newQ.content = { text: "", options: ["", ""] };
      newQ.answerData = { correctOption: "" };
    } else if (type === 'DragDrop' || type === 'FillBlank') {
      newQ.content = { text: "The research team [blank_1] that...", wordBank: [], distractors: [] };
      newQ.answerData = { mapping: { "[blank_1]": "" } };
    } else if (type === 'Audio' || type === 'Video') {
      newQ.content = { mediaUrl: "", subQuestions: [] };
      newQ.answerData = { mapping: {} }; // map subquestion id to answer
    }
    setQuestions([...questions, newQ]);
  };

  const updateQuestion = (index: number, updatedQ: any) => {
    const newQs = [...questions];
    newQs[index] = updatedQ;
    setQuestions(newQs);
  };

  const deleteQuestion = (index: number) => {
    const newQs = [...questions];
    newQs.splice(index, 1);
    setQuestions(newQs);
  };

  const handleUploadMedia = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await axios.post('/api/upload/media', formData, { withCredentials: true });
      return res.data.data.url;
    } catch (err) {
      toast.error("Upload failed");
      return null;
    }
  };

  if (loading) return <div className="p-10 text-center animate-pulse">Loading builder...</div>;
  if (!exam) return <div className="p-10 text-center text-red-500">Exam not found</div>;

  return (
    <div className="flex h-[calc(100vh-80px)] overflow-hidden bg-background">
      {/* Sidebar - Tools */}
      <div className="w-64 border-r bg-muted/20 p-4 flex flex-col gap-4 overflow-y-auto">
        <Button variant="ghost" onClick={onBack} className="justify-start -ml-2 mb-2 w-fit">
          <ArrowLeft className="h-4 w-4 mr-2" /> Trở lại
        </Button>
        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Thêm Câu Hỏi</h3>
        <Button variant="outline" className="justify-start w-full" onClick={() => addQuestion('MultipleChoice')}>
          <CheckCircle2 className="h-4 w-4 mr-2" /> Trắc nghiệm (MCQ)
        </Button>
        <Button variant="outline" className="justify-start w-full" onClick={() => addQuestion('DragDrop')}>
          <FileText className="h-4 w-4 mr-2" /> Kéo Thả (Drag & Drop)
        </Button>
        <Button variant="outline" className="justify-start w-full" onClick={() => addQuestion('FillBlank')}>
          <FileText className="h-4 w-4 mr-2" /> Điền Khuyết
        </Button>
        <Button variant="outline" className="justify-start w-full" onClick={() => addQuestion('Audio')}>
          <Headphones className="h-4 w-4 mr-2" /> Nghe (Audio)
        </Button>
        <Button variant="outline" className="justify-start w-full" onClick={() => addQuestion('Video')}>
          <VideoIcon className="h-4 w-4 mr-2" /> Xem Video
        </Button>

        <div className="mt-auto pt-6 border-t flex flex-col gap-2">
           <Button onClick={handleSaveDraft} disabled={saving} variant="secondary">
              <Save className="h-4 w-4 mr-2" /> Lưu nháp
           </Button>
           <Button onClick={handlePublish} disabled={saving} className={exam.status === 'Published' ? "bg-green-600 hover:bg-green-700 text-white" : ""}>
              {exam.status === 'Published' ? <Lock className="h-4 w-4 mr-2" /> : <Globe className="h-4 w-4 mr-2" />}
              {saving ? "Đang xuất bản..." : (exam.status === 'Published' ? "Đã xuất bản" : "Xuất bản")}
           </Button>
        </div>
      </div>

      {/* Main Content - Builder */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Exam Info */}
          <Card className="border-primary/20 shadow-sm">
            <CardHeader className="pb-3 bg-muted/10">
              <CardTitle className="text-lg">Cài đặt chung bài thi</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div>
                <Label>Tên bài kiểm tra</Label>
                <Input value={exam.title} onChange={e => setExam({...exam, title: e.target.value})} className="mt-1" />
              </div>
              <div>
                <Label>Mô tả chi tiết</Label>
                <Textarea value={exam.description} onChange={e => setExam({...exam, description: e.target.value})} className="mt-1" rows={2} />
              </div>
              <div>
                <Label>URL Ảnh bìa (Thumbnail)</Label>
                <Input value={exam.thumbnail} onChange={e => setExam({...exam, thumbnail: e.target.value})} className="mt-1" />
              </div>
            </CardContent>
          </Card>

          {/* Question List */}
          <div className="space-y-4">
            {questions.length === 0 ? (
              <div className="text-center py-16 border-2 border-dashed rounded-xl bg-muted/20 text-muted-foreground">
                <FileText className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p>Chưa có câu hỏi nào.</p>
                <p className="text-sm">Hãy chọn một loại câu hỏi từ thanh bên trái để bắt đầu.</p>
              </div>
            ) : (
              questions.map((q, idx) => (
                <Card key={q.id || idx} className="relative group transition-all hover:border-foreground/30">
                  <div className="absolute -left-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 cursor-grab text-muted-foreground p-1 bg-background border rounded shadow-sm">
                    <GripVertical className="h-4 w-4" />
                  </div>
                  <CardHeader className="py-3 px-4 bg-muted/30 border-b flex flex-row items-center justify-between space-y-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm bg-background border px-2 py-0.5 rounded shadow-sm">Câu {idx + 1}</span>
                      <span className="text-sm font-medium text-muted-foreground">
                        {q.type === 'MultipleChoice' ? 'Trắc nghiệm' : 
                         q.type === 'DragDrop' ? 'Kéo thả điền từ' :
                         q.type === 'FillBlank' ? 'Gõ từ điền khuyết' :
                         q.type === 'Audio' ? 'Nghe hiểu' : 'Xem video'}
                      </span>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => deleteQuestion(idx)} className="text-destructive h-8 px-2 hover:bg-destructive hover:text-white">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </CardHeader>
                  <CardContent className="p-4">
                    {/* Render specific form based on question type */}
                    {q.type === 'MultipleChoice' && (
                      <MultipleChoiceForm question={q} onChange={(val) => updateQuestion(idx, val)} />
                    )}
                    {(q.type === 'DragDrop' || q.type === 'FillBlank') && (
                      <FillBlankForm question={q} onChange={(val) => updateQuestion(idx, val)} />
                    )}
                    {(q.type === 'Audio' || q.type === 'Video') && (
                      <MediaForm question={q} onUpload={handleUploadMedia} onChange={(val) => updateQuestion(idx, val)} />
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Specific Forms ---

function MultipleChoiceForm({ question, onChange }: { question: any, onChange: (q: any) => void }) {
  const content = question.content || { text: '', options: ['', ''] };
  const answerData = question.answerData || { correctOption: '' };

  const addOption = () => {
    onChange({
      ...question,
      content: { ...content, options: [...content.options, ""] }
    });
  };

  const updateOption = (index: number, val: string) => {
    const newOpts = [...content.options];
    newOpts[index] = val;
    onChange({
      ...question,
      content: { ...content, options: newOpts }
    });
  };

  const removeOption = (index: number) => {
    const newOpts = [...content.options];
    newOpts.splice(index, 1);
    onChange({
      ...question,
      content: { ...content, options: newOpts }
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <Label>Câu hỏi</Label>
        <Textarea 
          value={content.text} 
          onChange={e => onChange({ ...question, content: { ...content, text: e.target.value } })}
          placeholder="Nhập nội dung câu hỏi..."
          className="mt-1"
          rows={2}
        />
      </div>
      <div>
        <Label className="mb-2 block">Các lựa chọn</Label>
        <div className="space-y-2">
          {content.options.map((opt: string, i: number) => (
            <div key={i} className="flex items-center gap-2">
              <input 
                type="radio" 
                name={`correct-${question.id}`} 
                checked={answerData.correctOption === opt && opt !== ""}
                onChange={() => onChange({ ...question, answerData: { ...answerData, correctOption: opt } })}
                className="w-4 h-4 cursor-pointer"
                title="Đánh dấu là đáp án đúng"
              />
              <Input 
                value={opt} 
                onChange={e => updateOption(i, e.target.value)} 
                placeholder={`Lựa chọn ${i + 1}`} 
                className={answerData.correctOption === opt && opt !== "" ? "border-green-500 bg-green-50 dark:bg-green-900/10" : ""}
              />
              <Button variant="ghost" size="icon" onClick={() => removeOption(i)} disabled={content.options.length <= 2}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
        <Button variant="outline" size="sm" onClick={addOption} className="mt-3">
          <Plus className="h-4 w-4 mr-2" /> Thêm lựa chọn
        </Button>
      </div>
    </div>
  );
}

function FillBlankForm({ question, onChange }: { question: any, onChange: (q: any) => void }) {
  const content = question.content || { text: '', wordBank: [], distractors: [] };
  const answerData = question.answerData || { mapping: {} };
  const [distractorText, setDistractorText] = useState((content.distractors || []).join(', '));

  // Sync when question changes from outside
  useEffect(() => {
    if (content.distractors) {
      setDistractorText(content.distractors.join(', '));
    }
  }, [content.distractors]);

  // Simple parser: automatically extract [word] -> to [blank_1] and map answer
  const handleParseText = () => {
    const text = content.text;
    let newText = text;
    let mapping: Record<string, string> = {};
    let wordBank: string[] = [];

    // Regex to match [word]
    let counter = 1;
    newText = newText.replace(/\[([^\]]+)\]/g, (match: string, p1: string) => {
      const blankId = `[blank_${counter}]`;
      mapping[blankId] = p1;
      wordBank.push(p1);
      counter++;
      return blankId;
    });

    onChange({
      ...question,
      content: { ...content, text: newText, wordBank },
      answerData: { mapping }
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <Label>Đoạn văn bản (Sử dụng cú pháp [từ cần điền] để tạo ô trống tự động)</Label>
        <Textarea 
          value={content.text} 
          onChange={e => onChange({ ...question, content: { ...content, text: e.target.value } })}
          placeholder="Ví dụ: Climate change poses a significant [threat] to global [security]."
          className="mt-1 font-mono text-sm"
          rows={4}
        />
        <Button variant="secondary" size="sm" onClick={handleParseText} className="mt-2">
          Phân tích & Tạo ô trống
        </Button>
      </div>

      {Object.keys(answerData.mapping).length > 0 && (
        <div className="p-4 bg-muted/40 rounded-lg border">
          <Label className="mb-2 block">Cấu hình ô trống</Label>
          <div className="grid grid-cols-2 gap-4 text-sm">
            {Object.entries(answerData.mapping).map(([blankId, answer]) => (
              <div key={blankId} className="flex items-center gap-2">
                <span className="font-mono bg-background px-2 py-1 rounded border min-w-[80px] text-center">{blankId}</span>
                <span>=</span>
                <Input 
                  value={String(answer)}
                  onChange={e => {
                    const newMapping = { ...answerData.mapping, [blankId]: e.target.value };
                    onChange({ ...question, answerData: { ...answerData, mapping: newMapping } });
                  }}
                  className="font-semibold text-green-600 dark:text-green-400 border-green-500 h-8"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {question.type === 'DragDrop' && (
        <div>
          <Label>Từ gây nhiễu (Distractors) - phân cách bởi dấu phẩy</Label>
          <Input 
            value={distractorText} 
            onChange={e => setDistractorText(e.target.value)}
            onBlur={() => {
              const distractors = distractorText.split(',').map((s: string) => s.trim()).filter(Boolean);
              onChange({ ...question, content: { ...content, distractors } });
            }}
            placeholder="vd: avoidance, minor"
            className="mt-1"
          />
        </div>
      )}
    </div>
  );
}

function MediaForm({ question, onUpload, onChange }: { question: any, onUpload: (file: File) => Promise<string|null>, onChange: (q: any) => void }) {
  const content = question.content || { mediaUrl: '', subQuestions: [] };
  const answerData = question.answerData || { mapping: {} };
  const [uploading, setUploading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setUploading(true);
      const url = await onUpload(e.target.files[0]);
      if (url) {
        onChange({ ...question, content: { ...content, mediaUrl: url } });
      }
      setUploading(false);
    }
  };

  const addSubQuestion = () => {
    const sqId = Date.now().toString();
    onChange({
      ...question,
      content: { 
        ...content, 
        subQuestions: [...content.subQuestions, { id: sqId, text: '', options: ['', ''] }]
      }
    });
  };

  const updateSubQuestion = (idx: number, sq: any) => {
    const newSqs = [...content.subQuestions];
    newSqs[idx] = sq;
    onChange({ ...question, content: { ...content, subQuestions: newSqs } });
  };

  const updateSubAnswer = (sqId: string, opt: string) => {
    onChange({
      ...question,
      answerData: { ...answerData, mapping: { ...answerData.mapping, [sqId]: opt } }
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <Label>Media URL ({question.type})</Label>
        <div className="flex gap-2 mt-1">
          <Input 
            value={content.mediaUrl} 
            onChange={e => onChange({ ...question, content: { ...content, mediaUrl: e.target.value } })}
            placeholder={`Paste ${question.type} URL or upload`} 
          />
          <div className="relative overflow-hidden w-24">
            <Button variant="outline" className="w-full relative z-0" disabled={uploading}>
              {uploading ? '...' : 'Upload'}
            </Button>
            <input type="file" accept={question.type === 'Audio' ? 'audio/*' : 'video/*'} className="absolute inset-0 opacity-0 cursor-pointer z-10" onChange={handleFileChange} />
          </div>
        </div>
        {content.mediaUrl && (
          <div className="mt-4 p-2 bg-black/5 rounded flex justify-center">
            {question.type === 'Audio' ? (
              <audio src={content.mediaUrl} controls className="w-full max-w-md" />
            ) : (
              <video src={content.mediaUrl} controls className="w-full max-w-sm rounded" />
            )}
          </div>
        )}
      </div>

      <div className="pt-4 border-t space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-base">Các câu hỏi phụ (Sub-questions)</Label>
          <Button variant="outline" size="sm" onClick={addSubQuestion}>
            <Plus className="h-4 w-4 mr-2" /> Thêm câu hỏi phụ
          </Button>
        </div>

        {content.subQuestions.map((sq: any, sqIdx: number) => (
          <Card key={sq.id} className="p-4 bg-muted/20">
            <div className="space-y-3">
              <Input 
                value={sq.text} 
                onChange={e => updateSubQuestion(sqIdx, { ...sq, text: e.target.value })} 
                placeholder="Nội dung câu hỏi phụ..." 
              />
              <div className="space-y-2 pl-4 border-l-2 border-primary/20">
                {sq.options.map((opt: string, optIdx: number) => (
                  <div key={optIdx} className="flex items-center gap-2">
                    <input 
                      type="radio" 
                      checked={answerData.mapping[sq.id] === opt && opt !== ""}
                      onChange={() => updateSubAnswer(sq.id, opt)}
                      className="w-3 h-3"
                    />
                    <Input 
                      value={opt} 
                      onChange={e => {
                        const newOpts = [...sq.options];
                        newOpts[optIdx] = e.target.value;
                        updateSubQuestion(sqIdx, { ...sq, options: newOpts });
                      }} 
                      placeholder={`Lựa chọn ${optIdx + 1}`}
                      className={`h-8 text-sm ${answerData.mapping[sq.id] === opt && opt !== "" ? "bg-green-50 dark:bg-green-900/20 border-green-500" : ""}`}
                    />
                  </div>
                ))}
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6 text-xs mt-1"
                  onClick={() => updateSubQuestion(sqIdx, { ...sq, options: [...sq.options, ""] })}
                >
                  + Thêm lựa chọn
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
