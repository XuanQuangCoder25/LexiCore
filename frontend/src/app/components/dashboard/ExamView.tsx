import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Progress } from "../ui/progress";
import { Separator } from "../ui/separator";
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
} from "lucide-react";
import { ReportIssueModal } from "../global/ReportIssueModal";

interface WordChip {
  id: string;
  word: string;
}

interface SlotState {
  id: string;
  word: WordChip | null;
}

const paragraphTemplate = [
  "The research team",
  "__1__",
  "that climate change",
  "__2__",
  "a significant",
  "__3__",
  "on global food",
  "__4__",
  ".",
];

const correctOrder = ["discovered", "poses", "threat", "security"];
const wordBank: WordChip[] = [
  { id: "w1", word: "discovered" },
  { id: "w2", word: "poses" },
  { id: "w3", word: "threat" },
  { id: "w4", word: "security" },
  { id: "w5", word: "avoided" },
  { id: "w6", word: "minor" },
];

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
  isChecked,
  isCorrect,
}: {
  slot: SlotState;
  onDrop: (slotId: string, chip: WordChip) => void;
  onRemove: (slotId: string) => void;
  isChecked: boolean;
  isCorrect?: boolean;
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
      // ignore malformed data
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
          ? isChecked
            ? isCorrect
              ? "border-green-600 bg-green-50"
              : "border-destructive bg-red-50"
            : "border-foreground bg-muted"
          : "border-dashed border-muted-foreground"
      }`}
      onClick={() => slot.word && !isChecked && onRemove(slot.id)}
      title={slot.word ? "Click to remove" : "Drop word here"}
    >
      {slot.word ? (
        <span className={`text-sm font-medium ${isChecked ? (isCorrect ? "text-green-700" : "text-destructive") : ""}`}>
          {slot.word.word}
          {isChecked && isCorrect && <CheckCircle2 className="inline h-3 w-3 ml-1 text-green-600" />}
          {isChecked && !isCorrect && <XCircle className="inline h-3 w-3 ml-1 text-destructive" />}
        </span>
      ) : (
        <span className="text-xs text-muted-foreground">drop here</span>
      )}
    </span>
  );
}

function DragDropQuestion({ onReport }: { onReport: () => void }) {
  const initialSlots: SlotState[] = ["__1__", "__2__", "__3__", "__4__"].map((id) => ({ id, word: null }));
  const [slots, setSlots] = useState<SlotState[]>(initialSlots);
  const [isChecked, setIsChecked] = useState(false);
  const [usedWords, setUsedWords] = useState<string[]>([]);

  const handleDrop = (slotId: string, chip: WordChip) => {
    setSlots((prev) => {
      return prev.map((s) => s.id === slotId ? { ...s, word: chip } : s);
    });
    setUsedWords((prev) => {
      const slot = slots.find((s) => s.id === slotId);
      const newUsed = prev.filter((id) => id !== slot?.word?.id);
      return [...newUsed, chip.id];
    });
  };

  const handleRemove = (slotId: string) => {
    const slot = slots.find((s) => s.id === slotId);
    if (slot?.word) {
      setUsedWords((prev) => prev.filter((id) => id !== slot.word!.id));
      setSlots((prev) => prev.map((s) => s.id === slotId ? { ...s, word: null } : s));
    }
  };

  const checkAnswers = () => setIsChecked(true);
  const reset = () => {
    setSlots(initialSlots);
    setUsedWords([]);
    setIsChecked(false);
  };

  const slotIndex = (id: string) => parseInt(id.replace("__", "")) - 1;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4" /> Drag & Drop — Fill in the Blanks
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline">Question 3/5</Badge>
            <button onClick={onReport} className="text-muted-foreground hover:text-foreground transition-colors" title="Report issue">
              <Flag className="h-4 w-4" />
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Paragraph with slots */}
        <div className="p-5 rounded-lg bg-muted/40 border leading-9 text-base">
          {paragraphTemplate.map((token, i) =>
            token.startsWith("__") ? (
              <DropSlot
                key={token}
                slot={slots.find((s) => s.id === token)!}
                onDrop={handleDrop}
                onRemove={handleRemove}
                isChecked={isChecked}
                isCorrect={slots.find((s) => s.id === token)?.word?.word === correctOrder[slotIndex(token)]}
              />
            ) : (
              <span key={i}>{token} </span>
            )
          )}
        </div>

        {/* Word Bank */}
        <div>
          <p className="text-xs text-muted-foreground mb-3 uppercase tracking-wide">Word Bank — drag words into the blanks</p>
          <div className="flex flex-wrap gap-2">
            {wordBank.map((chip) => (
              <DraggableWord key={chip.id} chip={chip} isUsed={usedWords.includes(chip.id)} />
            ))}
          </div>
        </div>

        {isChecked && (
          <div className={`p-3 rounded-lg border text-sm ${slots.every((s, i) => s.word?.word === correctOrder[i]) ? "bg-green-50 border-green-200 text-green-700" : "bg-red-50 border-red-200 text-destructive"}`}>
            {slots.every((s, i) => s.word?.word === correctOrder[i])
              ? "Perfect! All answers are correct."
              : `Correct answers: ${correctOrder.join(", ")}`}
          </div>
        )}

        <div className="flex gap-2">
          <Button variant="outline" onClick={reset} size="sm">
            <RotateCcw className="h-4 w-4 mr-2" /> Reset
          </Button>
          <Button onClick={checkAnswers} size="sm" disabled={isChecked || slots.some((s) => !s.word)}>
            Check Answers
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function AudioPlayer({ onReport }: { onReport: () => void }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(35);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Headphones className="h-4 w-4" /> Listening Comprehension
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline">Audio</Badge>
            <button onClick={onReport} className="text-muted-foreground hover:text-foreground transition-colors" title="Report issue">
              <Flag className="h-4 w-4" />
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Listen to the audio recording and answer the questions below.
        </p>
        <div className="p-4 rounded-lg bg-muted/40 border space-y-3">
          <div className="flex items-center gap-3">
            <Button size="sm" variant="outline" onClick={() => setProgress(0)}>
              <SkipBack className="h-4 w-4" />
            </Button>
            <Button size="sm" onClick={() => setIsPlaying(!isPlaying)}>
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setProgress(100)}>
              <SkipForward className="h-4 w-4" />
            </Button>
            <div className="flex-1">
              <Progress value={progress} className="h-2 cursor-pointer" onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                setProgress(Math.round(((e.clientX - rect.left) / rect.width) * 100));
              }} />
            </div>
            <span className="text-xs text-muted-foreground tabular-nums">1:23 / 3:45</span>
            <Volume2 className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="text-xs text-center text-muted-foreground">BBC English Interview Excerpt · 3:45</p>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-medium">Q: What is the main topic discussed in the recording?</p>
          {["Remote work policies post-pandemic", "Climate change initiatives", "Economic recovery strategies", "Digital education reform"].map((opt) => (
            <button key={opt} className="w-full text-left p-3 rounded-lg border hover:bg-muted/50 text-sm transition-colors">
              {opt}
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function VideoPlayer({ onReport }: { onReport: () => void }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(20);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Video className="h-4 w-4" /> Video Comprehension
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline">Video</Badge>
            <button onClick={onReport} className="text-muted-foreground hover:text-foreground transition-colors" title="Report issue">
              <Flag className="h-4 w-4" />
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg bg-zinc-950 aspect-video flex flex-col items-center justify-center relative overflow-hidden">
          <div className="absolute inset-0 flex items-center justify-center">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="h-14 w-14 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors backdrop-blur-sm"
            >
              {isPlaying ? <Pause className="h-7 w-7 text-white" /> : <Play className="h-7 w-7 text-white ml-1" />}
            </button>
          </div>
          <p className="absolute top-4 left-4 text-white/60 text-xs">TED Talk: The Future of Education</p>
          <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/60">
            <Progress value={progress} className="h-1 mb-1" />
            <div className="flex justify-between text-xs text-white/70">
              <span>2:18</span>
              <span>11:45</span>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">Fill in the transcript (0:45 – 1:10):</p>
          <p className="text-sm leading-8 p-4 rounded-lg bg-muted/40 border">
            "Education is not just about{" "}
            <span className="inline-block border-b-2 border-foreground min-w-[80px] mx-1 text-center">_______</span>{" "}
            facts, but about developing the ability to{" "}
            <span className="inline-block border-b-2 border-foreground min-w-[100px] mx-1 text-center">_______</span>{" "}
            critically."
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export function ExamView() {
  const [reportOpen, setReportOpen] = useState(false);
  const [examProgress] = useState(60);

  return (
    <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Multimedia Exam</h1>
            <p className="text-muted-foreground">Reading, Listening & Video Comprehension</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Progress</p>
              <p className="font-bold">3 / 5 Questions</p>
            </div>
            <div className="w-20">
              <Progress value={examProgress} className="h-2" />
            </div>
          </div>
        </div>

        <div className="flex gap-2 text-sm">
          {[
            { icon: FileText, label: "Q1–2: Reading", done: true },
            { icon: Headphones, label: "Q3: Listening", done: true },
            { icon: FileText, label: "Q4: Fill-Blank", active: true },
            { icon: Video, label: "Q5: Video", done: false },
          ].map((step, i) => (
            <div key={i} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs ${step.active ? "border-foreground font-medium" : step.done ? "bg-muted border-transparent text-muted-foreground" : "border-dashed text-muted-foreground"}`}>
              <step.icon className="h-3.5 w-3.5" />
              {step.label}
              {step.done && <CheckCircle2 className="h-3 w-3 text-green-600" />}
            </div>
          ))}
        </div>

        <DragDropQuestion onReport={() => setReportOpen(true)} />
        <AudioPlayer onReport={() => setReportOpen(true)} />
        <VideoPlayer onReport={() => setReportOpen(true)} />

        <div className="flex justify-between items-center pt-2">
          <Button variant="outline">
            <SkipBack className="h-4 w-4 mr-2" /> Previous
          </Button>
          <Button>
            Next <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        </div>

        <ReportIssueModal open={reportOpen} onClose={() => setReportOpen(false)} />
      </div>
  );
}
