import { useState, useEffect, useRef } from "react";
import YouTube, { YouTubeEvent, YouTubePlayer } from "react-youtube";
import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Input } from "../ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";
import {
  Play, Pause, RotateCcw, RotateCw, Timer, Repeat, Mic, MicOff, BookOpen, Loader2, PlusCircle, Sparkles, Notebook, Save, Captions, CaptionsOff, Volume2, X
} from "lucide-react";

interface Video {
  id: string;
  youtube_id: string;
  title: string;
  channel: string;
  duration: number;
  difficulty: string;
}

interface Segment {
  id: string;
  start_time: number;
  end_time: number;
  transcript: string;
  order_index: number;
}

interface SyllableToken {
  text: string;
  status: "correct" | "wrong" | "neutral";
  ipa?: string;
}

export function ShadowingView() {
  const [currentView, setCurrentView] = useState<"library" | "practice">("library");

  // Library State
  const [videos, setVideos] = useState<Video[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [addVideoUrl, setAddVideoUrl] = useState("");
  const [addVideoDifficulty, setAddVideoDifficulty] = useState("Intermediate");
  const [isAddingVideo, setIsAddingVideo] = useState(false);
  const [addVideoError, setAddVideoError] = useState("");

  // Practice State
  const [currentVideo, setCurrentVideo] = useState<Video | null>(null);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [activeSegmentIndex, setActiveSegmentIndex] = useState(0);

  // Player State
  const playerRef = useRef<YouTubePlayer | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);

  // Custom Player Controls
  const [autoPause, setAutoPause] = useState(false);
  const [loopSegment, setLoopSegment] = useState(false);
  const playerContainerRef = useRef<HTMLDivElement>(null);

  // Context Menu State
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; segmentIndex: number } | null>(null);

  // Recording State
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // AI Feedback State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [feedback, setFeedback] = useState<{ accuracy: number; feedback: SyllableToken[] } | null>(null);

  // Right Column Tabs State
  const [activeTab, setActiveTab] = useState<"transcript" | "gemini" | "notebook">("transcript");

  // Gemini AI State
  const [aiSummary, setAiSummary] = useState<any>(null);
  const [isLoadingAi, setIsLoadingAi] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // Notebook State
  const [noteContent, setNoteContent] = useState("");
  const [isSavingNote, setIsSavingNote] = useState(false);
  const noteSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Subtitle & Dictionary State
  const [showSubtitles, setShowSubtitles] = useState(true);
  const [dictWord, setDictWord] = useState<{ word: string; sentence: string; anchorRect: DOMRect } | null>(null);
  const [dictData, setDictData] = useState<any>(null);
  const [dictLoading, setDictLoading] = useState(false);
  const [dictError, setDictError] = useState<string | null>(null);
  const [dictAiExplanation, setDictAiExplanation] = useState<string | null>(null);
  const [dictAiLoading, setDictAiLoading] = useState(false);

  // Dictionary Popup Dragging State
  const popupRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!popupRef.current) return;
    isDragging.current = true;
    const rect = popupRef.current.getBoundingClientRect();
    dragOffset.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
    document.body.style.userSelect = 'none'; // prevent text selection while dragging
  };

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (!isDragging.current || !popupRef.current) return;
      const newX = e.clientX - dragOffset.current.x;
      const newY = e.clientY - dragOffset.current.y;

      const maxX = window.innerWidth - popupRef.current.offsetWidth;
      const maxY = window.innerHeight - popupRef.current.offsetHeight;

      const boundedX = Math.max(0, Math.min(newX, maxX));
      const boundedY = Math.max(0, Math.min(newY, maxY));

      popupRef.current.style.left = `${boundedX}px`;
      popupRef.current.style.top = `${boundedY}px`;
      popupRef.current.style.bottom = 'auto'; // override initial bottom/right
      popupRef.current.style.right = 'auto';
    };

    const handlePointerUp = () => {
      isDragging.current = false;
      document.body.style.userSelect = '';
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, []);

  useEffect(() => {
    fetchVideos();
  }, []);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isPlaying && playerRef.current) {
      interval = setInterval(async () => {
        const time = await playerRef.current.getCurrentTime();
        setCurrentTime(time);

        // Auto update active segment based on current time
        if (segments.length > 0) {
          const seg = segments[activeSegmentIndex];

          // Loop: seek back to start of current segment (takes priority over auto-pause)
          if (loopSegment && seg && time >= seg.end_time) {
            playerRef.current.seekTo(seg.start_time, true);
            return;
          }

          // Auto-pause at end of segment → advance to NEXT segment so next play starts fresh
          if (autoPause && seg && time >= seg.end_time) {
            playerRef.current.pauseVideo();
            // Advance index so the next play checks the next segment
            const nextIndex = activeSegmentIndex + 1;
            if (nextIndex < segments.length) {
              setActiveSegmentIndex(nextIndex);
            }
            return;
          }

          // Normal playback: track active segment by time
          const currentIndex = segments.findIndex(s => time >= s.start_time && time <= s.end_time);
          if (currentIndex !== -1 && currentIndex !== activeSegmentIndex) {
            setActiveSegmentIndex(currentIndex);
          }
        }
      }, 200);
    }
    return () => clearInterval(interval);
  }, [isPlaying, segments, activeSegmentIndex, autoPause, loopSegment]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only when practice view is active and not typing in input
      if (currentView !== 'practice') return;
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      if (e.code === 'Space') {
        e.preventDefault();
        handleTogglePlay();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        handleRewind();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentView, isPlaying]);

  // Close context menu on click elsewhere
  useEffect(() => {
    const close = () => setContextMenu(null);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, []);

  const fetchVideos = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/shadowing/videos', { credentials: 'include' });
      const data = await res.json();
      if (data.status === 'success') {
        setVideos(data.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddVideo = async () => {
    if (!addVideoUrl.trim()) return;
    setIsAddingVideo(true);
    setAddVideoError("");
    try {
      const res = await fetch('http://localhost:5000/api/shadowing/videos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ url: addVideoUrl, difficulty: addVideoDifficulty }),
      });
      const data = await res.json();
      if (data.status === 'success') {
        setAddVideoUrl("");
        await fetchVideos(); // Reload library
      } else {
        setAddVideoError(data.message || 'Đã có lỗi xảy ra.');
      }
    } catch (e) {
      setAddVideoError('Không thể kết nối server.');
    } finally {
      setIsAddingVideo(false);
    }
  };

  const handleStartPractice = async (videoId: string) => {
    setCurrentView("practice");
    setFeedback(null);
    setAiSummary(null);
    setNoteContent("");
    setActiveTab("transcript");
    setAiError(null);
    try {
      const res = await fetch(`http://localhost:5000/api/shadowing/videos/${videoId}`, { credentials: 'include' });
      const data = await res.json();
      if (data.status === 'success') {
        setCurrentVideo(data.data);
        setSegments(data.data.segments);
        setActiveSegmentIndex(0);

        // Fetch AI Summary & Notebook in background
        fetchAiSummary(videoId);
        fetchNotebook(videoId);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchAiSummary = async (videoId: string) => {
    setIsLoadingAi(true);
    setAiError(null);
    try {
      const res = await fetch(`http://localhost:5000/api/shadowing/videos/${videoId}/summary`, { credentials: 'include' });
      const data = await res.json();
      if (data.status === 'success') {
        setAiSummary(data.data);
      } else {
        // Thông báo lỗi kỹ thuật
        const rawMsg: string = data.message || '';
        let friendlyMsg = 'Gemini AI không thể phân tích video này.';
        if (rawMsg.includes('503') || rawMsg.includes('high demand') || rawMsg.includes('Service Unavailable')) {
          friendlyMsg = 'Gemini đang quá tải. Vui lòng thử lại sau vài giây.';
        } else if (rawMsg.includes('404') || rawMsg.includes('not found') || rawMsg.includes('no longer available')) {
          friendlyMsg = 'Model AI không khả dụng. Đang tự động thử lại.';
        } else if (rawMsg.includes('401') || rawMsg.includes('API_KEY_INVALID')) {
          friendlyMsg = 'API key Gemini không hợp lệ. Kiểm tra lại .env.';
        }
        setAiError(friendlyMsg);
      }
    } catch (e) {
      console.error('[Gemini]', e);
      setAiError('Không thể kết nối tới AI server. Vui lòng thử lại.');
    } finally {
      setIsLoadingAi(false);
    }
  };

  const fetchNotebook = async (videoId: string) => {
    try {
      const res = await fetch(`http://localhost:5000/api/shadowing/notes/${videoId}`, { credentials: 'include' });
      const data = await res.json();
      if (data.status === 'success') {
        setNoteContent(data.data.content);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleNoteChange = (text: string) => {
    setNoteContent(text);
    if (noteSaveTimeoutRef.current) clearTimeout(noteSaveTimeoutRef.current);
    noteSaveTimeoutRef.current = setTimeout(() => {
      saveNotebook(videoIdForSaveRef.current, text);
    }, 1500);
  };

  const videoIdForSaveRef = useRef<string | null>(null);
  useEffect(() => {
    if (currentVideo) videoIdForSaveRef.current = currentVideo.id;
  }, [currentVideo]);

  const saveNotebook = async (vidId: string | null, text: string) => {
    if (!vidId) return;
    setIsSavingNote(true);
    try {
      await fetch(`http://localhost:5000/api/shadowing/notes/${vidId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ content: text })
      });
    } catch (e) {
      console.error(e);
    } finally {
      setIsSavingNote(false);
    }
  };

  const handleBackToLibrary = () => {
    setCurrentView("library");
    setCurrentVideo(null);
    setSegments([]);
    setFeedback(null);
    if (playerRef.current) {
      playerRef.current.pauseVideo();
    }
  };

  const onPlayerReady = (event: YouTubeEvent) => {
    playerRef.current = event.target;
  };

  const onPlayerStateChange = (event: YouTubeEvent) => {
    // 1 = playing, 2 = paused
    setIsPlaying(event.data === 1);
  };

  const handleTogglePlay = () => {
    if (!playerRef.current) return;
    if (isPlaying) {
      playerRef.current.pauseVideo();
    } else {
      playerRef.current.playVideo();
    }
  };

  const handleRewind = () => {
    if (!playerRef.current) return;
    playerRef.current.seekTo(Math.max(0, currentTime - 5), true);
  };

  const handleForward = () => {
    if (!playerRef.current || !currentVideo) return;
    playerRef.current.seekTo(Math.min(currentVideo.duration, currentTime + 5), true);
  };


  const handleContextMenu = (e: React.MouseEvent, segmentIndex: number) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, segmentIndex });
  };

  const handleSaveSegmentToNotebook = () => {
    if (!contextMenu || !segments[contextMenu.segmentIndex]) return;
    const line = segments[contextMenu.segmentIndex].transcript;
    const newContent = noteContent ? `${noteContent}\n${line}` : line;
    handleNoteChange(newContent);
    setContextMenu(null);
  };

  // ─── Dictionary Functions ────────────────────────────────────────────────────

  const lookupWord = async (word: string, sentence: string, anchorRect: DOMRect) => {
    if (playerRef.current) playerRef.current.pauseVideo();
    // Clean up word: remove non-alphabet/hyphen/apostrophe, lowercase, and trim edges
    let cleanWord = word.replace(/[^a-zA-Z'-]/g, '').toLowerCase();
    cleanWord = cleanWord.replace(/^['-]+|['-]+$/g, '');

    if (!cleanWord) return;
    setDictWord({ word: cleanWord, sentence, anchorRect });
    setDictData(null);
    setDictError(null);
    setDictAiExplanation(null);
    setDictLoading(true);
    try {
      const res = await fetch(`https://en.wiktionary.org/api/rest_v1/page/definition/${cleanWord}`);
      if (!res.ok) throw new Error('Không tìm thấy từ này.');
      const data = await res.json();

      if (!data.en || data.en.length === 0) throw new Error('Không có nghĩa tiếng Anh.');

      const transformedData = {
        meanings: data.en.map((m: any) => ({
          partOfSpeech: m.partOfSpeech,
          definitions: m.definitions.map((d: any) => ({
            definition: d.definition.replace(/<[^>]+>/g, ''),
            example: d.parsedExamples ? d.parsedExamples[0]?.example.replace(/<[^>]+>/g, '') : null
          }))
        }))
      };

      setDictData(transformedData);
    } catch (e: any) {
      setDictError(e.message || 'Lỗi tra từ điển.');
    } finally {
      setDictLoading(false);
    }
  };


  const lookupAiContext = async () => {
    if (!dictWord) return;
    setDictAiLoading(true);
    setDictAiExplanation(null);
    try {
      const res = await fetch('http://localhost:5000/api/shadowing/dictionary/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ word: dictWord.word, sentence: dictWord.sentence }),
      });
      const data = await res.json();
      if (data.status === 'success') {
        setDictAiExplanation(data.data.explanation);
      } else {
        setDictAiExplanation('Không thể lấy giải nghĩa AI.');
      }
    } catch {
      setDictAiExplanation('Lỗi kết nối server.');
    } finally {
      setDictAiLoading(false);
    }
  };

  const handleLoopCurrentSegment = () => {
    if (!contextMenu) return;
    setLoopSegment(true);
    setActiveSegmentIndex(contextMenu.segmentIndex);
    if (playerRef.current && segments[contextMenu.segmentIndex]) {
      playerRef.current.seekTo(segments[contextMenu.segmentIndex].start_time, true);
      playerRef.current.playVideo();
    }
    setContextMenu(null);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await sendAudioToAI(audioBlob);
        stream.getTracks().forEach(track => track.stop()); // Turn off mic
      };

      mediaRecorder.start();
      setIsRecording(true);
      setFeedback(null);
      // Pause video when recording
      if (playerRef.current) playerRef.current.pauseVideo();
    } catch (err) {
      console.error("Microphone access denied", err);
      alert("Vui lòng cấp quyền Microphone để luyện nói.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsAnalyzing(true);
    }
  };

  const sendAudioToAI = async (audioBlob: Blob) => {
    if (segments.length === 0) return;
    const activeSegment = segments[activeSegmentIndex];

    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.webm');
    formData.append('videoId', currentVideo?.id || '');

    try {
      const res = await fetch(`http://localhost:5000/api/shadowing/analyze/${activeSegment.id}`, {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });
      const data = await res.json();
      if (data.status === 'success') {
        setFeedback(data.data);
      } else {
        // Backend trả lọi lỗi (402, 500, v.v.)
        const serverMsg = data.message || 'Lỗi khi phân tích giọng nói.';
        alert(serverMsg);
      }
    } catch (err) {
      // Lỗi mạng (backend không phản hồi)
      console.error('[Whisper]', err);
      alert('Không thể kết nối tới server. Vui lòng kiểm tra backend.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (currentView === "practice" && currentVideo) {
    return (
      <div className="flex flex-col h-[calc(100vh-8rem)]">
        {/* Practice Header */}
        <div className="flex items-center justify-between mb-4 shrink-0">
          <div>
            <Button variant="ghost" onClick={handleBackToLibrary} className="mb-2 -ml-4">
              ← Back to Library
            </Button>
            <h1 className="text-2xl font-bold">{currentVideo.title}</h1>
            <p className="text-muted-foreground">{currentVideo.channel}</p>
          </div>
        </div>

        {/* 60/40 Layout */}
        <div className="flex-1 grid grid-cols-10 gap-6 min-h-0">

          {/* LEFT COLUMN (60%): Practice Zone */}
          <div className="col-span-10 lg:col-span-6 flex flex-col space-y-4 overflow-y-auto pr-2 pb-4">

            {/* Video Player Card: Top Bar + Video + Bottom Control Bar */}
            <Card className="shrink-0 overflow-hidden gap-0">

              {/* TOP BAR: Subtitle / Interactive Dictionary */}
              <div className={`border-b bg-muted/30 flex items-center transition-all duration-300 ${showSubtitles ? 'min-h-[60px] px-4 py-2' : 'h-10 px-4'
                }`}>
                {showSubtitles && segments[activeSegmentIndex] ? (
                  <div className="flex-1 flex flex-wrap gap-x-1 gap-y-1 items-center text-sm font-medium leading-relaxed pr-2">
                    {segments[activeSegmentIndex].transcript.split(' ').map((word, wi) => (
                      <span
                        key={wi}
                        className="cursor-pointer hover:text-primary hover:underline transition-colors"
                        onClick={(e) => {
                          const rect = (e.target as HTMLElement).getBoundingClientRect();
                          lookupWord(word, segments[activeSegmentIndex].transcript, rect);
                        }}
                      >
                        {word}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="flex-1 text-xs text-muted-foreground italic">
                    {showSubtitles ? 'Đang chờ video phát...' : ''}
                  </div>
                )}
                <button
                  onClick={() => setShowSubtitles(p => !p)}
                  className={`ml-auto flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium transition-all border ${showSubtitles
                    ? 'text-primary border-primary/40 bg-primary/10 hover:bg-primary/20'
                    : 'text-muted-foreground border-border hover:border-primary hover:text-primary'
                    }`}
                  title={showSubtitles ? 'Tắt phụ đề nổi' : 'Bật phụ đề nổi'}
                >
                  {showSubtitles
                    ? <><CaptionsOff className="h-4 w-4" /> <span className="hidden sm:inline">Turn off</span></>
                    : <><Captions className="h-4 w-4" /> <span className="hidden sm:inline">Turn on Interactive Subtitles</span></>}
                </button>
              </div>

              <div
                ref={playerContainerRef}
                className="aspect-video overflow-hidden bg-black relative"
              >
                <YouTube
                  videoId={currentVideo.youtube_id}
                  opts={{ width: '100%', height: '100%', playerVars: { autoplay: 0, controls: 1 } }}
                  onReady={onPlayerReady}
                  onStateChange={onPlayerStateChange}
                  className="absolute inset-0 w-full h-full"
                />

              </div>

              {/* Control Bar — dưới video, trong cùng Card */}
              <div className="px-4 py-3 bg-muted/20 border-t flex items-center">
                {/* Left: Auto-Pause */}
                <div className="flex-1 flex justify-start">
                  <button
                    onClick={() => setAutoPause(p => !p)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${autoPause
                      ? 'bg-amber-100 border-amber-400 text-amber-700 dark:bg-amber-900/30 dark:border-amber-500 dark:text-amber-400'
                      : 'border-border text-muted-foreground hover:border-amber-400 hover:text-amber-600'
                      }`}
                    title="Tự dừng video sau mỗi câu để bạn nhại lại"
                  >
                    <Timer className="h-4 w-4" /> Auto-Pause {autoPause && <span className="text-amber-500">●</span>}
                  </button>
                </div>

                {/* Center: Rewind / Play–Pause / Forward */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleRewind}
                    className="h-9 w-9 rounded-full border border-border flex items-center justify-center hover:bg-muted transition-colors text-base font-bold text-muted-foreground hover:text-foreground"
                    title="Tua lùi 5 giây (←)"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </button>
                  <button
                    onClick={handleTogglePlay}
                    className="h-11 w-11 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:opacity-90 transition-opacity shadow-md"
                    title="Play / Pause (Space)"
                  >
                    {isPlaying
                      ? <Pause className="h-5 w-5" />
                      : <Play className="h-5 w-5 ml-0.5" />}
                  </button>
                  <button
                    onClick={handleForward}
                    className="h-9 w-9 rounded-full border border-border flex items-center justify-center hover:bg-muted transition-colors text-base font-bold text-muted-foreground hover:text-foreground"
                    title="Tua tới 5 giây (→)"
                  >
                    <RotateCw className="h-4 w-4" />
                  </button>
                </div>

                {/* Right: Loop */}
                <div className="flex-1 flex justify-end">
                  <button
                    onClick={() => setLoopSegment(p => !p)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${loopSegment
                      ? 'bg-blue-100 border-blue-400 text-blue-700 dark:bg-blue-900/30 dark:border-blue-500 dark:text-blue-400'
                      : 'border-border text-muted-foreground hover:border-blue-400 hover:text-blue-600'
                      }`}
                    title="Lặp lại câu đang học"
                  >
                    <Repeat className="h-4 w-4" /> Loop {loopSegment && <span className="text-blue-500">●</span>}
                  </button>
                </div>
              </div>
            </Card>

            {/* Voice Analysis Station */}
            <Card className="shrink-0">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                      <Mic className="h-5 w-5 text-primary" />
                      Voice Analysis
                    </h3>
                    <p className="text-sm text-muted-foreground">Shadow the speaker and record your voice.</p>
                  </div>
                  <Button
                    size="lg"
                    variant={isRecording ? "destructive" : "default"}
                    onClick={isRecording ? stopRecording : startRecording}
                    className={isRecording ? "animate-pulse shadow-lg shadow-destructive/20" : "shadow-lg shadow-primary/20"}
                    disabled={isAnalyzing}
                  >
                    {isRecording ? <MicOff className="h-5 w-5 mr-2" /> : <Mic className="h-5 w-5 mr-2" />}
                    {isRecording ? "Stop & Analyze" : "Start Shadowing"}
                  </Button>
                </div>

                {isRecording && (
                  <div className="mt-4 text-sm text-red-600 flex items-center gap-2 bg-red-50 p-3 rounded-md">
                    <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse"></div>
                    Recording your pronunciation...
                  </div>
                )}
                {isAnalyzing && (
                  <div className="mt-4 text-sm text-blue-600 flex items-center gap-2 bg-blue-50 p-3 rounded-md">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    AI is analyzing your voice...
                  </div>
                )}

                {/* AI Pronunciation Feedback */}
                {feedback && (
                  <div className="mt-6 border-t pt-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-medium text-sm text-muted-foreground">Feedback Result</span>
                      <Badge variant="default" className="text-xs bg-primary text-primary-foreground">
                        Score: {feedback.accuracy}%
                      </Badge>
                    </div>
                    <TooltipProvider delayDuration={100}>
                      <div className="p-4 rounded-lg bg-muted/30 border leading-8 text-lg font-medium shadow-inner">
                        {feedback.feedback.map((token, ti) =>
                          token.status === "wrong" ? (
                            <Tooltip key={ti}>
                              <TooltipTrigger asChild>
                                <span className="text-destructive font-bold underline decoration-wavy decoration-destructive/60 cursor-help mx-1">
                                  {token.text}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent className="flex items-center gap-2 max-w-xs" side="top">
                                <div>
                                  <p className="text-xs text-muted-foreground">Correct IPA</p>
                                  <p className="font-mono font-bold text-base">{token.ipa}</p>
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          ) : (
                            <span key={ti} className="text-foreground mx-1">
                              {token.text}
                            </span>
                          )
                        )}
                      </div>
                    </TooltipProvider>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* RIGHT COLUMN (40%): Data Zone */}
          <div className="col-span-10 lg:col-span-4 h-full flex flex-col bg-card border rounded-xl overflow-hidden shadow-sm">
            {/* Tabs Header */}
            <div className="flex items-center border-b bg-muted/10 shrink-0">
              <button
                onClick={() => setActiveTab("transcript")}
                className={`flex-1 py-3 px-4 text-sm font-medium flex items-center justify-center gap-2 transition-colors border-b-2 ${activeTab === "transcript" ? "border-primary text-primary bg-background" : "border-transparent text-muted-foreground hover:bg-muted/30 hover:text-foreground"
                  }`}
              >
                <BookOpen className="h-4 w-4" /> Transcript
              </button>
              <button
                onClick={() => setActiveTab("gemini")}
                className={`flex-1 py-3 px-4 text-sm font-medium flex items-center justify-center gap-2 transition-colors border-b-2 ${activeTab === "gemini" ? "border-primary text-primary bg-background" : "border-transparent text-muted-foreground hover:bg-muted/30 hover:text-foreground"
                  }`}
              >
                <Sparkles className="h-4 w-4" /> Vocab AI
              </button>
              <button
                onClick={() => setActiveTab("notebook")}
                className={`flex-1 py-3 px-4 text-sm font-medium flex items-center justify-center gap-2 transition-colors border-b-2 ${activeTab === "notebook" ? "border-primary text-primary bg-background" : "border-transparent text-muted-foreground hover:bg-muted/30 hover:text-foreground"
                  }`}
              >
                <Notebook className="h-4 w-4" /> Notebook
              </button>
            </div>

            {/* Tabs Content */}
            <div className="flex-1 overflow-y-auto p-4 bg-muted/5 relative">

              {/* Transcript Tab */}
              {activeTab === "transcript" && (
                <div className="space-y-3">
                  {segments.map((subtitle, index) => {
                    const isActive = index === activeSegmentIndex;
                    return (
                      <div
                        key={subtitle.id}
                        onClick={() => {
                          setActiveSegmentIndex(index);
                          if (playerRef.current) playerRef.current.seekTo(subtitle.start_time, true);
                        }}
                        onContextMenu={(e) => handleContextMenu(e, index)}
                        className={`p-3 rounded-lg border transition-all duration-300 cursor-pointer ${isActive
                          ? 'bg-primary/10 border-primary/50 text-primary font-medium shadow-sm'
                          : 'bg-background border-border text-muted-foreground hover:bg-muted/50'
                          }`}
                      >
                        <p className="text-sm leading-relaxed">{subtitle.transcript}</p>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Gemini Vocab Tab */}
              {activeTab === "gemini" && (
                <div className="space-y-4">
                  {isLoadingAi ? (
                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                      <Loader2 className="h-8 w-8 animate-spin mb-4 text-primary" />
                      <p className="text-sm">Gemini AI is analyzing the video...</p>
                      <p className="text-xs opacity-70 mt-1">Extracting context-aware vocabulary</p>
                    </div>
                  ) : !aiSummary ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                      <Sparkles className="h-8 w-8 mb-4 opacity-50" />
                      {aiError ? (
                        <>
                          <p className="text-sm text-destructive font-medium mb-2">Phân tích thất bại</p>
                          <p className="text-xs text-muted-foreground mb-4 max-w-[200px]">{aiError}</p>
                        </>
                      ) : (
                        <p className="text-sm mb-4">Chưa có phân tích AI cho video này.</p>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => currentVideo && fetchAiSummary(currentVideo.id)}
                        disabled={isLoadingAi}
                      >
                        <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                        {aiError ? 'Thử lại' : 'Phân tích ngay'}
                      </Button>
                    </div>
                  ) : (
                    <div className="animate-in fade-in duration-500">
                      <div className="bg-primary/10 p-4 rounded-lg border border-primary/20 mb-6 text-sm leading-relaxed text-foreground/90 italic">
                        "{aiSummary.summary}"
                      </div>
                      <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-primary" /> Top 20 Context Words
                      </h4>
                      <div className="space-y-3">
                        {aiSummary.vocabulary?.map((v: any, i: number) => (
                          <div key={i} className="bg-background border rounded-lg p-3 hover:shadow-sm transition-shadow">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <span className="font-bold text-base text-primary mr-2">{v.word}</span>
                                <span className="text-xs text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded">{v.ipa}</span>
                                <span className="text-xs italic text-muted-foreground ml-2">({v.partOfSpeech})</span>
                              </div>
                              <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full shrink-0" title="Add to Notebook">
                                <PlusCircle className="h-4 w-4" />
                              </Button>
                            </div>
                            <p className="text-sm font-medium mb-1">{v.definition}</p>
                            <p className="text-xs text-muted-foreground italic border-l-2 border-primary/30 pl-2">"{v.exampleSentence}"</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Notebook Tab */}
              {activeTab === "notebook" && (
                <div className="h-full flex flex-col">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">My Notes</p>
                    {isSavingNote ? (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Loader2 className="h-3 w-3 animate-spin" /> Saving...
                      </span>
                    ) : (
                      <span className="text-xs text-green-600 flex items-center gap-1">
                        <Save className="h-3 w-3" /> Saved
                      </span>
                    )}
                  </div>
                  <textarea
                    className="flex-1 w-full bg-background border rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none shadow-inner"
                    placeholder="Type your notes here... (Auto-saves while you type)"
                    value={noteContent}
                    onChange={(e) => handleNoteChange(e.target.value)}
                    spellCheck={false}
                  />
                </div>
              )}

            </div>
          </div>
        </div>

        {/* Global Context Menu for Transcript */}
        {contextMenu && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setContextMenu(null)} onContextMenu={(e) => { e.preventDefault(); setContextMenu(null); }} />
            <div
              className="fixed z-50 bg-gray-900 text-white rounded-lg shadow-2xl py-1 min-w-[200px] text-sm border border-white/10"
              style={{ left: contextMenu.x, top: contextMenu.y }}
            >
              <button
                onClick={handleSaveSegmentToNotebook}
                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-white/10 transition-colors"
              >
                <Notebook className="h-4 w-4 opacity-70" /> Lưu câu vào Sổ tay
              </button>
              <button
                onClick={handleLoopCurrentSegment}
                className={`w-full flex items-center gap-2 px-3 py-2 hover:bg-white/10 transition-colors ${loopSegment && activeSegmentIndex === contextMenu.segmentIndex ? 'text-primary font-semibold' : ''}`}
              >
                <Repeat className="h-4 w-4 opacity-70" /> {loopSegment && activeSegmentIndex === contextMenu.segmentIndex ? 'Đang lặp câu này' : 'Lặp câu này'}
              </button>
              <div className="border-t border-white/10 my-1" />
              <button
                onClick={() => {
                  if (segments[contextMenu.segmentIndex]) {
                    navigator.clipboard.writeText(segments[contextMenu.segmentIndex].transcript);
                  }
                  setContextMenu(null);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-white/10 transition-colors"
              >
                <BookOpen className="h-4 w-4 opacity-70" /> Chép script
              </button>
            </div>
          </>
        )}

        {/* Dictionary Popup (Fixed bottom-right, draggable) */}
        {dictWord && (
          <>
            <div
              ref={popupRef}
              className="fixed bottom-6 right-6 z-50 w-80 bg-background border rounded-xl shadow-2xl overflow-hidden"
              style={{ touchAction: 'none' }} // Prevent scrolling when dragging on touch devices
            >
              {/* Header (Drag handle) */}
              <div
                className="flex items-center justify-between px-4 py-3 bg-primary/10 border-b cursor-grab active:cursor-grabbing select-none"
                onPointerDown={handlePointerDown}
              >
                <div className="flex items-center gap-2">
                  <div>
                    <p className="text-lg font-bold text-primary capitalize">{dictWord.word}</p>
                    {dictData?.phonetics?.find((p: any) => p.text) && (
                      <p className="text-xs text-muted-foreground">{dictData.phonetics.find((p: any) => p.text)?.text}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {/* Audio play button using browser TTS */}
                  <button
                    onClick={() => {
                      if ('speechSynthesis' in window) {
                        const utterance = new SpeechSynthesisUtterance(dictWord.word);
                        utterance.lang = 'en-US';
                        window.speechSynthesis.speak(utterance);
                      }
                    }}
                    className="h-8 w-8 rounded-full hover:bg-primary/10 flex items-center justify-center transition-colors"
                    title="Nghe phát âm"
                  >
                    <Volume2 className="h-4 w-4 text-primary" />
                  </button>
                  <button onClick={() => setDictWord(null)} className="h-8 w-8 rounded-full hover:bg-primary/10 flex items-center justify-center transition-colors">
                    <X className="h-4 w-4 text-primary" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="max-h-64 overflow-y-auto px-4 py-3 space-y-3">
                {dictLoading && (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  </div>
                )}
                {dictError && !dictLoading && (
                  <p className="text-sm text-muted-foreground text-center py-4">{dictError}</p>
                )}
                {dictData && !dictLoading && dictData.meanings?.slice(0, 2).map((meaning: any, mi: number) => (
                  <div key={mi}>
                    <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">{meaning.partOfSpeech}</p>
                    {meaning.definitions?.slice(0, 2).map((def: any, di: number) => (
                      <div key={di} className="mb-1">
                        <p className="text-sm">• {def.definition}</p>
                        {def.example && <p className="text-xs text-muted-foreground italic ml-2">"{def.example}"</p>}
                      </div>
                    ))}
                  </div>
                ))}

                {/* Context sentence */}
                <div className="border-t pt-2">
                  <p className="text-xs text-muted-foreground italic">"{dictWord.sentence}"</p>
                </div>

                {/* AI Contextual Explanation */}
                {dictAiExplanation ? (
                  <div className="bg-primary/5 rounded-lg p-3 border border-primary/20">
                    <p className="text-xs font-semibold text-primary flex items-center gap-1 mb-1"><Sparkles className="h-3 w-3" /> Gemini giải nghĩa theo ngữ cảnh</p>
                    <p className="text-sm">{dictAiExplanation}</p>
                  </div>
                ) : (
                  <button
                    onClick={lookupAiContext}
                    disabled={dictAiLoading}
                    className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-xs font-semibold transition-colors border border-primary/20 disabled:opacity-60"
                  >
                    {dictAiLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                    {dictAiLoading ? 'Đang hỏi AI...' : 'Hỏi AI giải nghĩa theo ngữ cảnh'}
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    );

  }

  // Library View
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">YouTube Shadowing</h1>
        <p className="text-muted-foreground">Practice pronunciation and rhythm with real videos and AI feedback</p>
      </div>

      {/* Add Video Card */}
      <Card className="border-dashed border-2">
        <CardContent className="p-5">
          <p className="text-sm font-medium mb-3 flex items-center gap-2">
            <PlusCircle className="h-4 w-4 text-primary" />
            Thêm video YouTube để luyện tập
          </p>
          <div className="flex gap-2">
            <Input
              placeholder="Dán URL YouTube vào đây (ví dụ: https://youtu.be/...)"
              value={addVideoUrl}
              onChange={(e) => setAddVideoUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddVideo()}
              disabled={isAddingVideo}
              className="flex-1"
            />
            <select
              value={addVideoDifficulty}
              onChange={(e) => setAddVideoDifficulty(e.target.value)}
              disabled={isAddingVideo}
              className="border rounded-md px-3 text-sm bg-background"
            >
              <option value="Beginner">Beginner</option>
              <option value="Intermediate">Intermediate</option>
              <option value="Advanced">Advanced</option>
            </select>
            <Button onClick={handleAddVideo} disabled={isAddingVideo || !addVideoUrl.trim()}>
              {isAddingVideo ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <PlusCircle className="h-4 w-4 mr-2" />}
              {isAddingVideo ? 'Đang tải phụ đề...' : 'Thêm Video'}
            </Button>
          </div>
          {addVideoError && (
            <p className="text-sm text-destructive mt-2">{addVideoError}</p>
          )}
          <p className="text-xs text-muted-foreground mt-2">
            AI sẽ tự động tải phụ đề từ YouTube và tạo bài luyện tập cho bạn.
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {isLoading ? (
          <div className="col-span-3 flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>
        ) : videos.map((video) => (
          <Card key={video.id} className="hover:shadow-lg transition-all duration-300 group">
            <div className="relative">
              <img
                src={`https://img.youtube.com/vi/${video.youtube_id}/mqdefault.jpg`}
                alt={video.title}
                className="w-full h-48 object-cover rounded-t-lg"
              />
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all duration-300 rounded-t-lg flex items-center justify-center">
                <Button
                  className="opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  onClick={() => handleStartPractice(video.id)}
                >
                  <Play className="h-4 w-4 mr-2" />
                  Practice Now
                </Button>
              </div>
              <div className="absolute top-2 right-2">
                <Badge variant={video.difficulty === "Beginner" ? "secondary" : video.difficulty === "Intermediate" ? "default" : "destructive"}>
                  {video.difficulty}
                </Badge>
              </div>
              <div className="absolute bottom-2 right-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">
                {Math.floor(video.duration / 60)}:{(video.duration % 60).toString().padStart(2, '0')}
              </div>
            </div>

            <CardContent className="p-4">
              <h3 className="font-semibold mb-1 line-clamp-2 group-hover:text-primary transition-colors">
                {video.title}
              </h3>
              <p className="text-sm text-muted-foreground">{video.channel}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}