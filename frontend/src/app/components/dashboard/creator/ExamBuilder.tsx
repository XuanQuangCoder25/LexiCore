import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import { Textarea } from "../../ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import { Badge } from "../../ui/badge";
import { Switch } from "../../ui/switch";
import { 
  Plus, Save, Globe, Lock, Trash2, ArrowLeft, GripVertical, 
  FileText, Headphones, Video as VideoIcon, CheckCircle2, 
  BookOpen, Clock, Award, Shuffle, Sparkles, HelpCircle, EyeOff
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../ui/select";
import { PublishRestrictedModal } from "./PublishRestrictedModal";

interface ExamBuilderProps {
  examId: string;
  onBack: () => void;
  userRole?: string;
  onNavigateTab?: (tab: string) => void;
}

const AVAILABLE_SKILLS = ['Listening', 'Reading', 'Grammar', 'Vocabulary', 'General'];
const CEFR_LEVELS = ['All', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

export function ExamBuilder({ examId, onBack, userRole = "user", onNavigateTab }: ExamBuilderProps) {
  const isCreatorOrAdmin = userRole?.toLowerCase() === "content_creator" || userRole?.toLowerCase() === "admin";
  const [showPublishRestrictedModal, setShowPublishRestrictedModal] = useState(false);
  const [exam, setExam] = useState<any>({
    title: "",
    description: "",
    thumbnail: "",
    durationMinutes: 45,
    passingScore: 70,
    level: "All",
    shuffleQuestions: false,
    skills: ["General"],
    status: "Draft",
    password: ""
  });
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
        const data = res.data.data;
        setExam({
          ...data,
          durationMinutes: typeof data.durationMinutes === 'number' ? data.durationMinutes : 45,
          passingScore: typeof data.passingScore === 'number' ? data.passingScore : 70,
          level: data.level || "All",
          shuffleQuestions: !!data.shuffleQuestions,
          skills: Array.isArray(data.skills) && data.skills.length > 0 ? data.skills : ["General"],
          password: data.password || ""
        });
        setQuestions(data.questions || []);
      }
    } catch (err) {
      toast.error("Không thể tải thông tin bài kiểm tra");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDraft = async (exitAfterSave = false) => {
    setSaving(true);
    try {
      const payload = {
        ...exam,
        status: 'Draft',
        questions: questions.map((q, idx) => ({ ...q, order: idx }))
      };

      const res = await axios.post(`/api/v1/creator/exams/${examId}/save-full`, payload, { withCredentials: true });
      if (res.data.success) {
        setExam((prev: any) => ({ ...prev, status: 'Draft' }));
        toast.success("Đã lưu nháp bài kiểm tra thành công");
        if (exitAfterSave) {
          onBack();
        }
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Lỗi khi lưu bài kiểm tra");
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!isCreatorOrAdmin) {
      setShowPublishRestrictedModal(true);
      return;
    }
    if (questions.length === 0) {
      return toast.error("Bài kiểm tra phải có ít nhất 1 câu hỏi để xuất bản ra cộng đồng.");
    }
    
    setSaving(true);
    try {
      const payload = {
        ...exam,
        status: 'Published',
        questions: questions.map((q, idx) => ({ ...q, order: idx }))
      };

      const res = await axios.post(`/api/v1/creator/exams/${examId}/save-full`, payload, { withCredentials: true });
      if (res.data.success) {
        setExam((prev: any) => ({ ...prev, status: 'Published' }));
        toast.success("Xuất bản bài kiểm tra ra cộng đồng thành công!");
      }
    } catch (err: any) {
      if (err.response?.status === 403 && err.response?.data?.requires_creator) {
        setShowPublishRestrictedModal(true);
      } else {
        toast.error(err.response?.data?.message || "Lỗi khi xuất bản bài kiểm tra");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleUnpublish = async () => {
    setSaving(true);
    try {
      const res = await axios.post(`/api/v1/creator/exams/${examId}/unpublish`, {}, { withCredentials: true });
      if (res.data.success) {
        setExam((prev: any) => ({ ...prev, status: 'Draft' }));
        toast.success("Đã chuyển bài kiểm tra về Bản nháp trong Private Space.");
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Lỗi khi hủy xuất bản bài kiểm tra");
    } finally {
      setSaving(false);
    }
  };

  const addQuestion = (type: string) => {
    const qId = Date.now().toString();
    let newQ: any = { type, id: qId, explanation: "" };

    if (type === 'MultipleChoice') {
      newQ.content = { text: "", options: ["", ""] };
      newQ.answerData = { correctOption: "" };
    } else if (type === 'Reading') {
      newQ.content = { 
        title: "", 
        passage: "", 
        subQuestions: [
          { id: `sq_${qId}_1`, text: "", options: ["", "", "", ""], explanation: "" }
        ] 
      };
      newQ.answerData = { mapping: {} };
    } else if (type === 'DragDrop' || type === 'FillBlank') {
      newQ.content = { text: "", wordBank: [], distractors: [] };
      newQ.answerData = { mapping: {} };
    } else if (type === 'Audio' || type === 'Video') {
      newQ.content = { 
        mediaUrl: "", 
        transcript: "",
        subQuestions: [
          { id: `sq_${qId}_1`, text: "", options: ["", "", "", ""], explanation: "" }
        ] 
      };
      newQ.answerData = { mapping: {} };
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

  const toggleSkill = (skill: string) => {
    const current = exam.skills || [];
    if (current.includes(skill)) {
      if (current.length === 1) return; // keep at least 1
      setExam({ ...exam, skills: current.filter((s: string) => s !== skill) });
    } else {
      setExam({ ...exam, skills: [...current, skill] });
    }
  };

  const handleUploadMedia = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await axios.post('/api/upload/media', formData, { withCredentials: true });
      return res.data.data.url;
    } catch (err) {
      toast.error("Tải tệp media thất bại");
      return null;
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!exam) return (
    <div className="p-10 text-center text-destructive">
      <p>Không tìm thấy đề thi.</p>
      <Button className="mt-4" onClick={onBack}>Quay lại</Button>
    </div>
  );

  return (
    <div className="flex h-[calc(100vh-80px)] overflow-hidden bg-background">
      {/* Sidebar - Tools */}
      <div className="w-72 border-r border-zinc-200/80 bg-zinc-50/50 p-4 flex flex-col gap-4 overflow-y-auto">
        <Button variant="ghost" onClick={onBack} className="justify-start -ml-2 mb-1 w-fit text-sm text-zinc-600 hover:text-zinc-900 rounded-xl hover:bg-zinc-100">
          <ArrowLeft className="h-4 w-4 mr-2" /> Trở lại danh sách
        </Button>

        <div className="space-y-1">
          <h3 className="font-semibold text-xs text-zinc-500 uppercase tracking-wider">Thêm Loại Câu Hỏi</h3>
          <p className="text-[11px] text-zinc-400">Chọn định dạng đề thi ngoại ngữ</p>
        </div>

        <div className="space-y-2">
          <Button variant="outline" className="justify-start w-full text-left font-normal bg-white border-zinc-200 hover:border-zinc-900 hover:-translate-y-0.5 hover:shadow-xs transition-all duration-200 rounded-xl py-2.5 h-auto" onClick={() => addQuestion('MultipleChoice')}>
            <CheckCircle2 className="h-4 w-4 mr-2.5 text-zinc-800 shrink-0" />
            <div>
              <div className="text-xs font-semibold text-zinc-900">Trắc nghiệm (MCQ)</div>
              <div className="text-[10px] text-zinc-500">Câu hỏi lựa chọn 1 đáp án</div>
            </div>
          </Button>

          <Button variant="outline" className="justify-start w-full text-left font-normal bg-white border-zinc-200 hover:border-zinc-900 hover:-translate-y-0.5 hover:shadow-xs transition-all duration-200 rounded-xl py-2.5 h-auto" onClick={() => addQuestion('Reading')}>
            <BookOpen className="h-4 w-4 mr-2.5 text-zinc-800 shrink-0" />
            <div>
              <div className="text-xs font-semibold text-zinc-900">Đọc hiểu (Reading)</div>
              <div className="text-[10px] text-zinc-500">Đoạn văn + bộ câu hỏi con</div>
            </div>
          </Button>

          <Button variant="outline" className="justify-start w-full text-left font-normal bg-white border-zinc-200 hover:border-zinc-900 hover:-translate-y-0.5 hover:shadow-xs transition-all duration-200 rounded-xl py-2.5 h-auto" onClick={() => addQuestion('Audio')}>
            <Headphones className="h-4 w-4 mr-2.5 text-zinc-800 shrink-0" />
            <div>
              <div className="text-xs font-semibold text-zinc-900">Nghe hiểu (Audio)</div>
              <div className="text-[10px] text-zinc-500">File âm thanh + Transcript</div>
            </div>
          </Button>

          <Button variant="outline" className="justify-start w-full text-left font-normal bg-white border-zinc-200 hover:border-zinc-900 hover:-translate-y-0.5 hover:shadow-xs transition-all duration-200 rounded-xl py-2.5 h-auto" onClick={() => addQuestion('DragDrop')}>
            <Shuffle className="h-4 w-4 mr-2.5 text-zinc-800 shrink-0" />
            <div>
              <div className="text-xs font-semibold text-zinc-900">Kéo thả điền từ</div>
              <div className="text-[10px] text-zinc-500">Drag & Drop vào ô khuyết</div>
            </div>
          </Button>

          <Button variant="outline" className="justify-start w-full text-left font-normal bg-white border-zinc-200 hover:border-zinc-900 hover:-translate-y-0.5 hover:shadow-xs transition-all duration-200 rounded-xl py-2.5 h-auto" onClick={() => addQuestion('FillBlank')}>
            <FileText className="h-4 w-4 mr-2.5 text-zinc-800 shrink-0" />
            <div>
              <div className="text-xs font-semibold text-zinc-900">Gõ từ điền khuyết</div>
              <div className="text-[10px] text-zinc-500">Học viên tự nhập text</div>
            </div>
          </Button>

          <Button variant="outline" className="justify-start w-full text-left font-normal bg-white border-zinc-200 hover:border-zinc-900 hover:-translate-y-0.5 hover:shadow-xs transition-all duration-200 rounded-xl py-2.5 h-auto" onClick={() => addQuestion('Video')}>
            <VideoIcon className="h-4 w-4 mr-2.5 text-zinc-800 shrink-0" />
            <div>
              <div className="text-xs font-semibold text-zinc-900">Xem video tình huống</div>
              <div className="text-[10px] text-zinc-500">Video + trắc nghiệm</div>
            </div>
          </Button>
        </div>

        {/* Action Controls */}
        <div className="mt-auto pt-4 border-t border-zinc-200/80 space-y-2">
          <div className="flex items-center justify-between text-xs text-zinc-500 px-1 mb-1">
            <span>Trạng thái:</span>
            <Badge variant={exam.status === 'Published' ? 'default' : 'secondary'} className="text-[11px] rounded-full border-zinc-200">
              {exam.status === 'Published' ? 'Công khai (Public)' : 'Bản nháp (Private)'}
            </Badge>
          </div>

          <Button onClick={() => handleSaveDraft(false)} disabled={saving} variant="outline" className="w-full justify-center rounded-xl border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-800">
            <Save className="h-4 w-4 mr-2" /> Lưu nháp
          </Button>

          <Button onClick={() => handleSaveDraft(true)} disabled={saving} variant="outline" className="w-full justify-center rounded-xl border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-800">
            <ArrowLeft className="h-4 w-4 mr-2" /> Lưu & Trở về
          </Button>

          {exam.status === 'Published' ? (
            <Button onClick={handleUnpublish} disabled={saving} variant="outline" className="w-full justify-center rounded-xl border-zinc-300 text-zinc-700 hover:bg-zinc-100">
              <EyeOff className="h-4 w-4 mr-2" /> Hủy xuất bản
            </Button>
          ) : (
            <Button onClick={handlePublish} disabled={saving} className="w-full justify-center bg-[#161616] hover:bg-black text-white shadow-xs rounded-xl active:scale-[0.99] transition-all duration-200 font-semibold">
              <Globe className="h-4 w-4 mr-2" />
              {saving ? "Đang xử lý..." : "Xuất bản cộng đồng"}
            </Button>
          )}
        </div>
      </div>

      {/* Main Content - Builder */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <div className="max-w-4xl mx-auto space-y-6">
          
          {/* Exam Academic Config Header */}
          <Card className="border-zinc-200/80 shadow-xs rounded-2xl overflow-hidden bg-white">
            <CardHeader className="py-4 px-6 bg-zinc-50/80 border-b border-zinc-200/80 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg font-bold flex items-center gap-2 text-zinc-900">
                  <Award className="w-5 h-5 text-zinc-900" />
                  Cấu hình chuẩn hóa đề thi
                </CardTitle>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Thiết lập thời gian làm bài, điểm đậu, trình độ CEFR và các kỹ năng đánh giá
                </p>
              </div>
              <Badge variant="outline" className="font-mono text-xs rounded-full border-zinc-200 bg-white text-zinc-700">
                {questions.length} câu hỏi
              </Badge>
            </CardHeader>

            <CardContent className="p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-zinc-700">Tên bài kiểm tra <span className="text-destructive">*</span></Label>
                  <Input 
                    value={exam.title} 
                    onChange={e => setExam({ ...exam, title: e.target.value })} 
                    placeholder="vd: IELTS Academic Placement Test B2" 
                    className="font-medium border-zinc-200 focus:border-zinc-900 focus:ring-4 focus:ring-zinc-900/5 rounded-xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-zinc-700">URL Ảnh bìa (Thumbnail)</Label>
                  <Input 
                    value={exam.thumbnail} 
                    onChange={e => setExam({ ...exam, thumbnail: e.target.value })} 
                    placeholder="https://images.unsplash.com/..." 
                    className="border-zinc-200 focus:border-zinc-900 focus:ring-4 focus:ring-zinc-900/5 rounded-xl"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-zinc-700">Mô tả bài kiểm tra</Label>
                <Textarea 
                  value={exam.description} 
                  onChange={e => setExam({ ...exam, description: e.target.value })} 
                  placeholder="Mô tả mục tiêu, yêu cầu và nội dung kiến thức bài thi hướng tới..." 
                  rows={2} 
                  className="border-zinc-200 focus:border-zinc-900 focus:ring-4 focus:ring-zinc-900/5 rounded-xl"
                />
              </div>

              {/* Grid 4 thông số học thuật */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-zinc-50 rounded-xl border border-zinc-200/80">
                <div className="space-y-1.5">
                  <Label className="text-xs flex items-center gap-1.5 font-semibold text-zinc-700">
                    <Clock className="w-3.5 h-3.5 text-zinc-700" /> Thời gian (phút)
                  </Label>
                  <Input 
                    type="number"
                    min={1}
                    max={300}
                    value={exam.durationMinutes} 
                    onChange={e => setExam({ ...exam, durationMinutes: Math.max(1, parseInt(e.target.value) || 45) })}
                    className="h-9 font-medium bg-white border-zinc-200 rounded-lg"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs flex items-center gap-1.5 font-semibold text-zinc-700">
                    <Award className="w-3.5 h-3.5 text-zinc-700" /> Điểm đạt chuẩn (%)
                  </Label>
                  <Input 
                    type="number"
                    min={1}
                    max={100}
                    value={exam.passingScore} 
                    onChange={e => setExam({ ...exam, passingScore: Math.min(100, Math.max(1, parseInt(e.target.value) || 70)) })}
                    className="h-9 font-medium bg-white border-zinc-200 rounded-lg"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs flex items-center gap-1.5 font-semibold text-zinc-700">
                    <Sparkles className="w-3.5 h-3.5 text-zinc-700" /> Trình độ CEFR
                  </Label>
                  <Select value={exam.level} onValueChange={(val) => setExam({ ...exam, level: val })}>
                    <SelectTrigger className="h-9 font-medium bg-white border-zinc-200 rounded-lg">
                      <SelectValue placeholder="Chọn cấp độ" />
                    </SelectTrigger>
                    <SelectContent>
                      {CEFR_LEVELS.map(lvl => (
                        <SelectItem key={lvl} value={lvl}>{lvl === 'All' ? 'Tất cả cấp độ' : `Cấp độ ${lvl}`}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs flex items-center gap-1.5 font-semibold text-zinc-700">
                    <Lock className="w-3.5 h-3.5 text-zinc-700" /> Mật khẩu bài thi
                  </Label>
                  <Input 
                    type="text"
                    value={exam.password || ""} 
                    onChange={e => setExam({ ...exam, password: e.target.value })}
                    placeholder="Bỏ trống = tự do"
                    className="h-9 font-mono text-xs bg-white border-zinc-200 rounded-lg"
                  />
                </div>
              </div>

              {/* Skills & Shuffle Row */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold block text-zinc-700">Kỹ năng đánh giá</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {AVAILABLE_SKILLS.map(skill => {
                      const active = (exam.skills || []).includes(skill);
                      return (
                        <button
                          key={skill}
                          type="button"
                          onClick={() => toggleSkill(skill)}
                          className={`text-xs px-3 py-1 rounded-lg border font-medium transition-all ${
                            active 
                              ? 'bg-[#161616] text-white border-zinc-900 shadow-xs' 
                              : 'bg-white hover:bg-zinc-100 text-zinc-600 border-zinc-200'
                          }`}
                        >
                          {skill}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center gap-3 bg-zinc-50 px-3.5 py-2.5 rounded-xl border border-zinc-200/80">
                  <Switch 
                    id="shuffle-toggle"
                    checked={exam.shuffleQuestions}
                    onCheckedChange={(checked) => setExam({ ...exam, shuffleQuestions: checked })}
                  />
                  <Label htmlFor="shuffle-toggle" className="text-xs font-medium cursor-pointer text-zinc-700">
                    Xáo trộn thứ tự câu hỏi khi làm bài
                  </Label>
                </div>
              </div>

            </CardContent>
          </Card>

          {/* Questions Header */}
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold flex items-center gap-2 text-zinc-900">
              <FileText className="w-5 h-5 text-zinc-900" />
              Danh sách câu hỏi ({questions.length})
            </h3>
            <span className="text-xs text-zinc-500">
              Mỗi câu hỏi đều hỗ trợ lời giải thích chi tiết cho học viên sau khi nộp bài
            </span>
          </div>

          {/* Question List */}
          <div className="space-y-4">
            {questions.length === 0 ? (
              <div className="text-center py-16 border-2 border-dashed border-zinc-200 rounded-2xl bg-zinc-50/50 text-zinc-500">
                <FileText className="h-10 w-10 mx-auto mb-3 text-zinc-400" />
                <p className="font-semibold text-zinc-900">Đề thi chưa có câu hỏi nào</p>
                <p className="text-sm mt-1 text-zinc-500">Chọn loại câu hỏi từ thanh công cụ bên trái để bắt đầu tạo đề thi chuẩn ngoại ngữ.</p>
              </div>
            ) : (
              questions.map((q, idx) => (
                <Card key={q.id || idx} className="relative group transition-all border border-zinc-200/80 hover:border-zinc-400 shadow-xs rounded-2xl overflow-hidden bg-white">
                  <div className="absolute -left-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 cursor-grab text-zinc-400 p-1 bg-white border border-zinc-200 rounded shadow-xs">
                    <GripVertical className="h-4 w-4" />
                  </div>

                  <CardHeader className="py-3 px-5 bg-zinc-50/70 border-b border-zinc-200/80 flex flex-row items-center justify-between space-y-0">
                    <div className="flex items-center gap-2.5">
                      <span className="font-bold text-xs bg-white border border-zinc-200 text-zinc-900 px-2.5 py-1 rounded-md shadow-2xs">
                        Câu {idx + 1}
                      </span>
                      <Badge variant="outline" className="text-xs font-medium border-zinc-200 text-zinc-700 bg-white">
                        {q.type === 'MultipleChoice' ? 'Trắc nghiệm (MCQ)' : 
                         q.type === 'Reading' ? 'Đọc hiểu (Reading)' :
                         q.type === 'Audio' ? 'Nghe hiểu (Audio)' :
                         q.type === 'DragDrop' ? 'Kéo thả điền từ' :
                         q.type === 'FillBlank' ? 'Gõ từ điền khuyết' : 'Xem video'}
                      </Badge>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => deleteQuestion(idx)} 
                      className="text-zinc-500 hover:text-rose-600 h-8 px-2 hover:bg-rose-50 rounded-lg"
                      title="Xóa câu hỏi này"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </CardHeader>

                  <CardContent className="p-5">
                    {/* Render form tương ứng với từng question type */}
                    {q.type === 'MultipleChoice' && (
                      <MultipleChoiceForm question={q} onChange={(val) => updateQuestion(idx, val)} />
                    )}
                    {q.type === 'Reading' && (
                      <ReadingForm question={q} onChange={(val) => updateQuestion(idx, val)} />
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

      {/* Shared Publish Restricted Modal */}
      <PublishRestrictedModal
        open={showPublishRestrictedModal}
        onOpenChange={setShowPublishRestrictedModal}
        onNavigateTab={onNavigateTab}
        contentType="bài kiểm tra"
      />
    </div>
  );
}

// ============================================================================
// QUESTION FORMS (Trắc nghiệm, Đọc hiểu, Nghe hiểu, Điền khuyết)
// ============================================================================

function MultipleChoiceForm({ question, onChange }: { question: any, onChange: (q: any) => void }) {
  const content = question.content || { text: '', options: ['', ''] };
  const answerData = question.answerData || { correctOption: '' };
  const explanation = question.explanation || content.explanation || '';
  const options = Array.isArray(content.options) ? content.options : ['', ''];

  const addOption = () => {
    onChange({
      ...question,
      content: { ...content, options: [...options, ""] }
    });
  };

  const updateOption = (index: number, val: string) => {
    const newOpts = [...options];
    newOpts[index] = val;
    onChange({
      ...question,
      content: { ...content, options: newOpts }
    });
  };

  const removeOption = (index: number) => {
    const newOpts = [...options];
    newOpts.splice(index, 1);
    onChange({
      ...question,
      content: { ...content, options: newOpts }
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-xs font-semibold">Nội dung câu hỏi</Label>
        <Textarea 
          value={content.text || ''} 
          onChange={e => onChange({ ...question, content: { ...content, text: e.target.value } })}
          placeholder="Nhập đề bài câu hỏi trắc nghiệm..."
          className="mt-1"
          rows={2}
        />
      </div>

      <div>
        <Label className="text-xs font-semibold mb-2 block">
          Các phương án lựa chọn (Chọn nút tròn để đánh dấu đáp án đúng)
        </Label>
        <div className="space-y-2">
          {options.map((opt: string, i: number) => {
            const isCorrect = answerData.correctOption === opt && opt !== "";
            return (
              <div key={i} className="flex items-center gap-2">
                <input 
                  type="radio" 
                  name={`correct-${question.id}`} 
                  checked={isCorrect}
                  onChange={() => onChange({ ...question, answerData: { ...answerData, correctOption: opt } })}
                  className="w-4 h-4 cursor-pointer accent-emerald-600"
                  title="Đánh dấu là đáp án đúng"
                />
                <Input 
                  value={opt} 
                  onChange={e => updateOption(i, e.target.value)} 
                  placeholder={`Lựa chọn ${i + 1}`} 
                  className={isCorrect ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 font-medium" : ""}
                />
                <Button variant="ghost" size="icon" onClick={() => removeOption(i)} disabled={options.length <= 2}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            );
          })}
        </div>
        <Button variant="outline" size="sm" onClick={addOption} className="mt-2.5 text-xs">
          <Plus className="h-3.5 w-3.5 mr-1.5" /> Thêm lựa chọn
        </Button>
      </div>

      <div className="pt-2 border-t">
        <Label className="text-xs font-semibold flex items-center gap-1.5 text-muted-foreground">
          <HelpCircle className="w-3.5 h-3.5 text-amber-500" />
          Lời giải thích chi tiết (Hiển thị cho học viên sau khi nộp bài)
        </Label>
        <Textarea 
          value={explanation} 
          onChange={e => onChange({ ...question, explanation: e.target.value, content: { ...content, explanation: e.target.value } })}
          placeholder="Giải thích vì sao phương án này chính xác, trích dẫn quy tắc ngữ pháp hoặc từ vựng..."
          className="mt-1 text-xs"
          rows={2}
        />
      </div>
    </div>
  );
}

function ReadingForm({ question, onChange }: { question: any, onChange: (q: any) => void }) {
  const content = question.content || { title: '', passage: '', subQuestions: [] };
  const answerData = question.answerData || { mapping: {} };
  const subQuestions = Array.isArray(content.subQuestions) ? content.subQuestions : [];
  const mapping = (answerData && typeof answerData.mapping === 'object') ? answerData.mapping : {};

  const addSubQuestion = () => {
    const sqId = `sq_${Date.now()}`;
    const newSubQ = {
      id: sqId,
      text: '',
      options: ['', '', '', ''],
      explanation: ''
    };
    onChange({
      ...question,
      content: { ...content, subQuestions: [...subQuestions, newSubQ] }
    });
  };

  const updateSubQuestion = (idx: number, updatedSq: any) => {
    const newSqs = [...subQuestions];
    newSqs[idx] = updatedSq;
    onChange({
      ...question,
      content: { ...content, subQuestions: newSqs }
    });
  };

  const deleteSubQuestion = (idx: number) => {
    const newSqs = [...subQuestions];
    const removed = newSqs.splice(idx, 1)[0];
    const newMapping = { ...mapping };
    if (removed?.id) delete newMapping[removed.id];

    onChange({
      ...question,
      content: { ...content, subQuestions: newSqs },
      answerData: { ...answerData, mapping: newMapping }
    });
  };

  const setSubCorrectAnswer = (sqId: string, opt: string) => {
    onChange({
      ...question,
      answerData: { ...answerData, mapping: { ...mapping, [sqId]: opt } }
    });
  };

  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold">Tiêu đề đoạn văn đọc hiểu</Label>
        <Input 
          value={content.title || ''} 
          onChange={e => onChange({ ...question, content: { ...content, title: e.target.value } })}
          placeholder="vd: Passage 1: The Evolution of Renewable Energy"
          className="font-medium"
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs font-semibold">Đoạn văn đọc hiểu (Reading Passage)</Label>
        <Textarea 
          value={content.passage || ''} 
          onChange={e => onChange({ ...question, content: { ...content, passage: e.target.value } })}
          placeholder="Dán hoặc nhập toàn bộ nội dung bài đọc hiểu tại đây..."
          className="font-serif text-sm leading-relaxed"
          rows={7}
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs font-semibold flex items-center gap-1.5 text-muted-foreground">
          <HelpCircle className="w-3.5 h-3.5 text-amber-500" /> Lời giải thích tổng quan bài đọc (Tùy chọn)
        </Label>
        <Textarea 
          value={question.explanation || ''} 
          onChange={e => onChange({ ...question, explanation: e.target.value })}
          placeholder="Tóm tắt ý chính của bài đọc hoặc chiến lược làm bài..."
          className="text-xs"
          rows={2}
        />
      </div>

      {/* Subquestions */}
      <div className="pt-3 border-t space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            Các câu hỏi trắc nghiệm theo bài đọc ({subQuestions.length})
          </Label>
          <Button variant="outline" size="sm" onClick={addSubQuestion} className="text-xs">
            <Plus className="h-3.5 w-3.5 mr-1" /> Thêm câu hỏi con
          </Button>
        </div>

        {subQuestions.map((sq: any, sqIdx: number) => {
          const sqOptions = Array.isArray(sq.options) ? sq.options : ['', '', '', ''];
          return (
            <Card key={sq.id || sqIdx} className="p-4 bg-muted/20 border-border/70 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-primary">Câu hỏi {sqIdx + 1}</span>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => deleteSubQuestion(sqIdx)} 
                  disabled={subQuestions.length <= 1}
                  className="h-7 px-2 text-destructive hover:bg-destructive hover:text-white"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>

              <Input 
                value={sq.text || ''} 
                onChange={e => updateSubQuestion(sqIdx, { ...sq, text: e.target.value })}
                placeholder="Nhập nội dung câu hỏi phụ..."
                className="font-medium text-sm"
              />

              <div className="space-y-2 pl-3 border-l-2 border-primary/30">
                {sqOptions.map((opt: string, optIdx: number) => {
                  const isCorrect = mapping[sq.id] === opt && opt !== "";
                  return (
                    <div key={optIdx} className="flex items-center gap-2">
                      <input 
                        type="radio" 
                        name={`reading-sq-${sq.id}`}
                        checked={isCorrect}
                        onChange={() => setSubCorrectAnswer(sq.id, opt)}
                        className="w-3.5 h-3.5 accent-emerald-600"
                        title="Đánh dấu đáp án đúng"
                      />
                      <Input 
                        value={opt} 
                        onChange={e => {
                          const newOpts = [...sqOptions];
                          newOpts[optIdx] = e.target.value;
                          updateSubQuestion(sqIdx, { ...sq, options: newOpts });
                        }}
                        placeholder={`Lựa chọn ${optIdx + 1}`}
                        className={`h-8 text-xs ${isCorrect ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 font-medium' : ''}`}
                      />
                    </div>
                  );
                })}
              </div>

              <div className="pt-2">
                <Input 
                  value={sq.explanation || ''} 
                  onChange={e => updateSubQuestion(sqIdx, { ...sq, explanation: e.target.value })}
                  placeholder="💡 Giải thích đáp án cho câu hỏi này (Trích dẫn dòng/đoạn chứng minh)..."
                  className="text-xs h-8 text-muted-foreground"
                />
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function FillBlankForm({ question, onChange }: { question: any, onChange: (q: any) => void }) {
  const content = question.content || { text: '', wordBank: [], distractors: [] };
  const answerData = question.answerData || { mapping: {} };
  const mapping = answerData.mapping || {};
  const [distractorText, setDistractorText] = useState((content.distractors || []).join(', '));

  useEffect(() => {
    if (content.distractors) {
      setDistractorText(content.distractors.join(', '));
    }
  }, [content.distractors]);

  useEffect(() => {
    const text = content.text || "";
    let newMapping: Record<string, string> = {};
    let wordBank: string[] = [];
    
    let counter = 1;
    const matches = text.match(/\[([^\]]+)\]/g);
    if (matches) {
      matches.forEach((match: string) => {
        const p1 = match.slice(1, -1);
        const blankId = `[blank_${counter}]`;
        newMapping[blankId] = mapping[blankId] !== undefined ? mapping[blankId] : p1;
        wordBank.push(p1);
        counter++;
      });
    }

    const mappingChanged = JSON.stringify(newMapping) !== JSON.stringify(mapping);
    const wordBankChanged = JSON.stringify(wordBank) !== JSON.stringify(content.wordBank);
    
    if (mappingChanged || wordBankChanged) {
      onChange({
        ...question,
        content: { ...content, wordBank },
        answerData: { ...answerData, mapping: newMapping }
      });
    }
  }, [content.text]);

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-xs font-semibold">Đoạn văn bản (Sử dụng cú pháp [từ cần điền] để tạo ô trống tự động)</Label>
        <Textarea 
          value={content.text || ''} 
          onChange={e => onChange({ ...question, content: { ...content, text: e.target.value } })}
          placeholder="Ví dụ: Climate change poses a significant [threat] to global [security]."
          className="mt-1 font-mono text-xs"
          rows={4}
        />
      </div>

      {Object.keys(mapping).length > 0 && (
        <div className="p-4 bg-muted/30 rounded-xl border">
          <Label className="mb-2 block text-xs font-semibold">Cấu hình từ đáp án ô trống</Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {Object.entries(mapping).map(([blankId, answer]) => (
              <div key={blankId} className="flex items-center gap-2">
                <span className="font-mono bg-background px-2 py-1 rounded border min-w-[80px] text-center font-bold text-xs">{blankId}</span>
                <span>=</span>
                <Input 
                  value={String(answer)}
                  onChange={e => {
                    const updatedMapping = { ...mapping, [blankId]: e.target.value };
                    onChange({ ...question, answerData: { ...answerData, mapping: updatedMapping } });
                  }}
                  className="font-semibold text-emerald-600 dark:text-emerald-400 border-emerald-500 h-8 text-xs"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {question.type === 'DragDrop' && (
        <div>
          <Label className="text-xs font-semibold">Từ gây nhiễu (Distractors) - phân cách bởi dấu phẩy</Label>
          <Input 
            value={distractorText} 
            onChange={e => setDistractorText(e.target.value)}
            onBlur={() => {
              const distractors = distractorText.split(',').map((s: string) => s.trim()).filter(Boolean);
              onChange({ ...question, content: { ...content, distractors } });
            }}
            placeholder="vd: avoidance, minor, temporary"
            className="mt-1 text-xs"
          />
        </div>
      )}

      <div className="pt-2 border-t">
        <Label className="text-xs font-semibold flex items-center gap-1.5 text-muted-foreground">
          <HelpCircle className="w-3.5 h-3.5 text-amber-500" />
          Lời giải thích chi tiết
        </Label>
        <Textarea 
          value={question.explanation || ''} 
          onChange={e => onChange({ ...question, explanation: e.target.value })}
          placeholder="Gợi ý từ loại (danh từ, động từ), ngữ cảnh hoặc collocations..."
          className="mt-1 text-xs"
          rows={2}
        />
      </div>
    </div>
  );
}

function MediaForm({ question, onUpload, onChange }: { question: any, onUpload: (file: File) => Promise<string|null>, onChange: (q: any) => void }) {
  const content = question.content || { mediaUrl: '', transcript: '', subQuestions: [] };
  const answerData = question.answerData || { mapping: {} };
  const subQuestions = Array.isArray(content.subQuestions) ? content.subQuestions : [];
  const mapping = (answerData && typeof answerData.mapping === 'object') ? answerData.mapping : {};
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
    const sqId = `sq_${Date.now()}`;
    const newSubQ = {
      id: sqId,
      text: '',
      options: ['', '', '', ''],
      explanation: ''
    };
    onChange({
      ...question,
      content: { ...content, subQuestions: [...subQuestions, newSubQ] }
    });
  };

  const updateSubQuestion = (idx: number, updatedSq: any) => {
    const newSqs = [...subQuestions];
    newSqs[idx] = updatedSq;
    onChange({ ...question, content: { ...content, subQuestions: newSqs } });
  };

  const deleteSubQuestion = (idx: number) => {
    const newSqs = [...subQuestions];
    const removed = newSqs.splice(idx, 1)[0];
    const newMapping = { ...mapping };
    if (removed?.id) delete newMapping[removed.id];

    onChange({
      ...question,
      content: { ...content, subQuestions: newSqs },
      answerData: { ...answerData, mapping: newMapping }
    });
  };

  const updateSubAnswer = (sqId: string, opt: string) => {
    onChange({
      ...question,
      answerData: { ...answerData, mapping: { ...mapping, [sqId]: opt } }
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-xs font-semibold">Tệp Media ({question.type === 'Audio' ? 'Âm thanh' : 'Video'})</Label>
        <div className="flex gap-2 mt-1">
          <Input 
            value={content.mediaUrl || ''} 
            onChange={e => onChange({ ...question, content: { ...content, mediaUrl: e.target.value } })}
            placeholder={`Dán URL file ${question.type} hoặc bấm Tải lên`} 
            className="text-xs"
          />
          <div className="relative overflow-hidden w-28">
            <Button variant="outline" className="w-full text-xs" disabled={uploading}>
              {uploading ? 'Đang tải...' : 'Tải lên'}
            </Button>
            <input 
              type="file" 
              accept={question.type === 'Audio' ? 'audio/*' : 'video/*'} 
              className="absolute inset-0 opacity-0 cursor-pointer" 
              onChange={handleFileChange} 
            />
          </div>
        </div>

        {content.mediaUrl && (
          <div className="mt-3 p-3 bg-muted/30 rounded-xl flex justify-center border">
            {question.type === 'Audio' ? (
              <audio src={content.mediaUrl} controls className="w-full max-w-md" />
            ) : (
              <video src={content.mediaUrl} controls className="w-full max-w-sm rounded-lg" />
            )}
          </div>
        )}
      </div>

      {/* Transcript for Audio */}
      {question.type === 'Audio' && (
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-purple-500" />
            Bản gỡ băng / Lời thoại (Audio Transcript)
          </Label>
          <Textarea 
            value={content.transcript || ''} 
            onChange={e => onChange({ ...question, content: { ...content, transcript: e.target.value } })}
            placeholder="Dán toàn bộ lời thoại audio tại đây (Học viên sẽ được xem lại sau khi nộp bài thi để đối chiếu)..."
            className="font-mono text-xs"
            rows={4}
          />
        </div>
      )}

      {/* Explanation */}
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold flex items-center gap-1.5 text-muted-foreground">
          <HelpCircle className="w-3.5 h-3.5 text-amber-500" />
          Lời giải thích chung cho phần {question.type === 'Audio' ? 'Nghe' : 'Xem Video'}
        </Label>
        <Textarea 
          value={question.explanation || ''} 
          onChange={e => onChange({ ...question, explanation: e.target.value })}
          placeholder="Hướng dẫn phương pháp nghe, các từ khóa (keywords) cần chú ý..."
          className="text-xs"
          rows={2}
        />
      </div>

      {/* Subquestions */}
      <div className="pt-3 border-t space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-purple-500" />
            Các câu hỏi phụ theo tệp {question.type === 'Audio' ? 'nghe' : 'video'} ({subQuestions.length})
          </Label>
          <Button variant="outline" size="sm" onClick={addSubQuestion} className="text-xs">
            <Plus className="h-3.5 w-3.5 mr-1" /> Thêm câu hỏi phụ
          </Button>
        </div>

        {subQuestions.map((sq: any, sqIdx: number) => {
          const sqOptions = Array.isArray(sq.options) ? sq.options : ['', '', '', ''];
          return (
            <Card key={sq.id || sqIdx} className="p-4 bg-muted/20 border-border/70 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-primary">Câu hỏi {sqIdx + 1}</span>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => deleteSubQuestion(sqIdx)} 
                  disabled={subQuestions.length <= 1}
                  className="h-7 px-2 text-destructive hover:bg-destructive hover:text-white"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>

              <Input 
                value={sq.text || ''} 
                onChange={e => updateSubQuestion(sqIdx, { ...sq, text: e.target.value })} 
                placeholder="Nội dung câu hỏi phụ..." 
                className="font-medium text-sm"
              />

              <div className="space-y-2 pl-3 border-l-2 border-primary/30">
                {sqOptions.map((opt: string, optIdx: number) => {
                  const isCorrect = mapping[sq.id] === opt && opt !== "";
                  return (
                    <div key={optIdx} className="flex items-center gap-2">
                      <input 
                        type="radio" 
                        name={`media-sq-${sq.id}`}
                        checked={isCorrect}
                        onChange={() => updateSubAnswer(sq.id, opt)}
                        className="w-3.5 h-3.5 accent-purple-600"
                        title="Đánh dấu đáp án đúng"
                      />
                      <Input 
                        value={opt} 
                        onChange={e => {
                          const newOpts = [...sqOptions];
                          newOpts[optIdx] = e.target.value;
                          updateSubQuestion(sqIdx, { ...sq, options: newOpts });
                        }} 
                        placeholder={`Lựa chọn ${optIdx + 1}`}
                        className={`h-8 text-xs ${isCorrect ? "bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-500 font-medium" : ""}`}
                      />
                    </div>
                  );
                })}
              </div>

              <div className="pt-2">
                <Input 
                  value={sq.explanation || ''} 
                  onChange={e => updateSubQuestion(sqIdx, { ...sq, explanation: e.target.value })}
                  placeholder="💡 Giải thích đáp án cho câu hỏi phụ này..."
                  className="text-xs h-8 text-muted-foreground"
                />
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
