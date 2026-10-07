import { useState, useEffect } from "react";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import { Progress } from "../ui/progress";
import { ArrowLeft, PlayCircle, FileText, CheckCircle, Circle } from "lucide-react";
import { studentCourseService } from "../../services/student-course-service";
import { toast } from "sonner";
import { ScrollArea } from "../ui/scroll-area";


const InteractiveBlock = ({ block }: { block: any }) => {
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [showResult, setShowResult] = useState(false);
  const [availableWords, setAvailableWords] = useState<string[]>([]);
  const [draggedWord, setDraggedWord] = useState<string | null>(null);

  useEffect(() => {
    if (block.type === 'drag_drop') {
      const parts = block.content.split(/(\[.*?\])/g);
      const words = parts.filter(p => p.startsWith('[') && p.endsWith(']')).map(p => p.slice(1, -1));
      setAvailableWords(words.sort(() => Math.random() - 0.5));
    }
  }, [block]);

  const checkAnswers = () => {
    setShowResult(true);
  };

  const isCorrect = (index: number, answer: string) => {
    let count = 0;
    const parts = block.content.split(/(\[.*?\])/g);
    for (let i = 0; i <= index; i++) {
      if (parts[i].startsWith('[') && parts[i].endsWith(']')) {
        if (i === index) return parts[i].slice(1, -1).toLowerCase().trim() === answer.toLowerCase().trim();
        count++;
      }
    }
    return false;
  };

  if (block.type === 'fill_in_the_blank') {
    return (
      <div className="flex flex-col gap-3">
        <span className="text-sm font-semibold text-primary uppercase tracking-wider">Bài tập: Điền từ</span>
        <div className="p-4 bg-background rounded-lg border border-border leading-relaxed text-lg">
          {block.content.split(/(\[.*?\])/g).map((part: string, i: number) => {
            if (part.startsWith('[') && part.endsWith(']')) {
              return (
                <input
                  key={i}
                  type="text"
                  className={`inline-block mx-1 px-2 py-1 w-24 bg-muted font-mono text-sm rounded border-b-2 outline-none focus:border-primary transition-colors ${showResult ? (isCorrect(i, answers[i] || '') ? 'border-green-500 text-green-600' : 'border-red-500 text-red-600') : 'border-primary/50'}`}
                  value={answers[i] || ''}
                  onChange={(e) => { setAnswers({ ...answers, [i]: e.target.value }); setShowResult(false); }}
                />
              );
            }
            return <span key={i}>{part}</span>;
          })}
        </div>
        <Button variant="outline" className="self-end" onClick={checkAnswers}>Kiểm tra</Button>
      </div>
    );
  }

  if (block.type === 'drag_drop') {
    return (
      <div className="flex flex-col gap-3">
        <span className="text-sm font-semibold text-primary uppercase tracking-wider">Bài tập: Kéo thả từ</span>
        
        <div className="flex flex-wrap gap-2 mb-4 p-4 bg-muted/30 rounded-lg min-h-[60px]">
          {availableWords.map((word, i) => (
            <div 
              key={i} 
              draggable 
              onDragStart={(e) => { e.dataTransfer.setData('text/plain', word); setDraggedWord(word); }}
              onDragEnd={() => setDraggedWord(null)}
              className="px-3 py-1 bg-white border shadow-sm rounded cursor-grab active:cursor-grabbing hover:border-primary select-none font-medium text-primary"
            >
              {word}
            </div>
          ))}
          {availableWords.length === 0 && <span className="text-muted-foreground italic text-sm">Tuyệt vời! Bạn đã ghép xong.</span>}
        </div>

        <div className="p-4 bg-background rounded-lg border border-border leading-relaxed text-lg">
          {block.content.split(/(\[.*?\])/g).map((part: string, i: number) => {
            if (part.startsWith('[') && part.endsWith(']')) {
              const answered = answers[i];
              return (
                <span 
                  key={i} 
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const word = e.dataTransfer.getData('text/plain');
                    if (word) {
                      setAnswers({ ...answers, [i]: word });
                      setAvailableWords(prev => prev.filter(w => w !== word));
                      if (answered) setAvailableWords(prev => [...prev, answered]);
                      setShowResult(false);
                    }
                  }}
                  onClick={() => {
                    if (answered) {
                      setAnswers(prev => { const n = {...prev}; delete n[i]; return n; });
                      setAvailableWords(prev => [...prev, answered]);
                    }
                  }}
                  className={`inline-flex items-center justify-center mx-1 min-w-[80px] h-8 px-2 bg-muted font-mono text-sm rounded border-b-2 transition-colors cursor-pointer ${answered ? 'bg-primary/10 text-primary border-primary' : 'border-dashed border-muted-foreground/50 text-transparent'} ${showResult ? (isCorrect(i, answers[i] || '') ? 'border-green-500 text-green-600 bg-green-50' : 'border-red-500 text-red-600 bg-red-50') : ''}`}
                >
                  {answered || part.slice(1,-1)}
                </span>
              );
            }
            return <span key={i}>{part}</span>;
          })}
        </div>
        <Button variant="outline" className="self-end" onClick={checkAnswers}>Kiểm tra</Button>
      </div>
    );
  }

  return null;
};

export const LearningWorkspace = ({ courseId, onBack }: { courseId: string; onBack: () => void }) => {
  const [data, setData] = useState<any>(null);
  const [activeLesson, setActiveLesson] = useState<any>(null);
  const [lessonContent, setLessonContent] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchCourseData = async () => {
    try {
      const res = await studentCourseService.getCourseDetails(courseId);
      if (res.status === 'success') {
        setData(res.data);
        // Tự động chọn bài học đầu tiên nếu chưa chọn
        if (res.data.syllabus.length > 0 && res.data.syllabus[0].lessons.length > 0 && !activeLesson) {
          handleSelectLesson(res.data.syllabus[0].lessons[0]);
        }
      }
    } catch (error) {
      toast.error("Không thể tải khóa học");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourseData();
  }, [courseId]);

  const handleSelectLesson = async (lesson: any) => {
    setActiveLesson(lesson);
    setLessonContent(null);
    try {
      const res = await studentCourseService.getLessonContent(courseId, lesson._id);
      if (res.status === 'success') {
        setLessonContent(res.data);
      }
    } catch (error) {
      toast.error("Lỗi khi tải nội dung bài học");
    }
  };

  const handleMarkComplete = async () => {
    if (!activeLesson) return;
    try {
      const res = await studentCourseService.completeLesson(courseId, activeLesson._id);
      if (res.status === 'success') {
        toast.success(res.message);
        fetchCourseData(); // Reload progress
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Lỗi khi hoàn thành bài học");
    }
  };

  if (loading) return <div className="p-8 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
  if (!data) return <div>Không có dữ liệu.</div>;

  return (
    <div className="flex h-[calc(100vh-80px)] overflow-hidden bg-background">
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <div className="p-4 border-b flex items-center gap-4 bg-card">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="font-bold text-lg">{data.course.title}</h1>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Tiến độ: {data.progress}%</span>
              <Progress value={data.progress} className="w-32 h-2" />
            </div>
          </div>
        </div>

        <ScrollArea className="flex-1 p-6">
          {lessonContent ? (
            <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div>
                <h2 className="text-3xl font-bold tracking-tight mb-2">{lessonContent.title}</h2>
                <div className="text-sm text-muted-foreground flex items-center gap-2">
                  <PlayCircle className="w-4 h-4" /> {lessonContent.durationMinutes} phút
                </div>
              </div>

              {lessonContent.videoUrl && (
                <div className="aspect-video w-full rounded-xl overflow-hidden bg-black shadow-lg border">
                  {/* Fake Video Player or actual iframe */}
                  {lessonContent.videoUrl.includes('youtube') ? (
                    <iframe 
                      className="w-full h-full"
                      src={lessonContent.videoUrl.replace('watch?v=', 'embed/')} 
                      title="Video Player"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                      allowFullScreen 
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white">
                      <video src={lessonContent.videoUrl} controls className="w-full h-full" />
                    </div>
                  )}
                </div>
              )}

              
              {lessonContent.blocks && lessonContent.blocks.length > 0 && (
                <div className="space-y-6 my-6">
                  {lessonContent.blocks.map((block: any) => (
                    <Card key={block.id} className="border-none shadow-sm bg-muted/10 overflow-hidden">
                      <CardContent className="p-6">
                        {block.type === 'text' && (
                          <div className="prose dark:prose-invert max-w-none whitespace-pre-wrap">{block.content}</div>
                        )}
                        {block.type === 'audio' && (
                          <div className="flex flex-col gap-2">
                            <span className="text-sm font-semibold text-primary uppercase tracking-wider">Audio</span>
                            <audio controls src={block.content} className="w-full" />
                          </div>
                        )}
                        {block.type === 'video' && (
                          <div className="flex flex-col gap-2">
                            <span className="text-sm font-semibold text-primary uppercase tracking-wider">Video</span>
                            <div className="aspect-video bg-black rounded-lg overflow-hidden flex items-center justify-center">
                              {block.content.includes('youtube.com') || block.content.includes('youtu.be') ? (
                                <iframe 
                                  className="w-full h-full" 
                                  src={block.content.replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/')} 
                                  allowFullScreen 
                                />
                              ) : (
                                <video controls src={block.content} className="w-full h-full" />
                              )}
                            </div>
                          </div>
                        )}
                        {(block.type === 'fill_in_the_blank' || block.type === 'drag_drop') && (
                          <InteractiveBlock block={block} />
                        )}
                        {block.type === 'speech_recognition' && (
                          <div className="flex flex-col gap-3">
                            <span className="text-sm font-semibold text-primary uppercase tracking-wider">Luyện nói</span>
                            <div className="p-4 bg-background rounded-lg border border-border text-xl text-center italic">
                              "{block.content}"
                            </div>
                            <Button variant="outline" className="w-full max-w-sm mx-auto rounded-full gap-2 border-primary text-primary hover:bg-primary/10">
                              <Mic className="w-4 h-4" /> Bấm để thu âm
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {lessonContent.content && (
                <Card className="border-none shadow-sm bg-muted/20">
                  <CardContent className="p-6 prose dark:prose-invert max-w-none">
                     <div className="whitespace-pre-wrap">{lessonContent.content}</div>
                  </CardContent>
                </Card>
              )}

              <div className="pt-6 border-t flex justify-between items-center">
                 <Button variant="outline" onClick={onBack}>Thoát</Button>
                 {data.completedLessons?.includes(activeLesson?._id) ? (
                   <Button size="lg" className="bg-green-500 hover:bg-green-600 shadow-md cursor-default text-white" disabled>
                     <CheckCircle className="w-5 h-5 mr-2" /> Đã hoàn thành
                   </Button>
                 ) : (
                   <Button size="lg" className="bg-primary hover:bg-primary/90 shadow-md" onClick={handleMarkComplete}>
                     <CheckCircle className="w-5 h-5 mr-2" /> Hoàn thành bài học
                   </Button>
                 )}
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground">
               <div className="animate-pulse">Đang tải nội dung...</div>
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Syllabus Sidebar */}
      <div className="w-80 border-l bg-card flex flex-col">
        <div className="p-4 border-b font-semibold bg-muted/10">Nội dung khóa học</div>
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-6">
            {data.syllabus.map((chapter: any) => (
              <div key={chapter._id} className="space-y-2">
                <h3 className="font-semibold text-sm uppercase text-muted-foreground tracking-wider">
                  Chương {chapter.order}: {chapter.title}
                </h3>
                <div className="space-y-1">
                  {chapter.lessons.map((lesson: any) => {
                    const isCompleted = data.completedLessons?.includes(lesson._id);
                    const isActive = activeLesson?._id === lesson._id;
                    return (
                      <button
                        key={lesson._id}
                        onClick={() => handleSelectLesson(lesson)}
                        className={`w-full flex items-start gap-3 p-3 rounded-lg text-left transition-all ${isActive ? 'bg-primary/10 border-primary/20 border shadow-sm' : 'hover:bg-muted/50 border border-transparent'}`}
                      >
                        <div className="mt-0.5 shrink-0">
                          {isCompleted ? <CheckCircle className="w-5 h-5 text-green-500" /> : <Circle className={`w-5 h-5 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />}
                        </div>
                        <div>
                          <div className={`font-medium text-sm leading-tight ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>
                            {lesson.order}. {lesson.title}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                            <PlayCircle className="w-3 h-3" /> {lesson.durationMinutes} phút
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};
