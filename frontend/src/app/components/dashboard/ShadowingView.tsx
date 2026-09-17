import { useState, useEffect, useRef } from "react";
import YouTube, { YouTubeEvent, YouTubePlayer } from "react-youtube";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Input } from "../ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";
import { Progress } from "../ui/progress";
import {
  Play, Mic, MicOff, Settings, BookOpen, Youtube, Loader2, PlusCircle
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
  const [playbackSpeed, setPlaybackSpeed] = useState([1]);
  const [currentTime, setCurrentTime] = useState(0);

  // Recording State
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  
  // AI Feedback State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [feedback, setFeedback] = useState<{ accuracy: number; feedback: SyllableToken[] } | null>(null);

  useEffect(() => {
    fetchVideos();
  }, []);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isPlaying && playerRef.current) {
      interval = setInterval(async () => {
        const time = await playerRef.current.getCurrentTime();
        setCurrentTime(time);
        
        // Auto update active segment
        if (segments.length > 0) {
          const currentIndex = segments.findIndex(s => time >= s.start_time && time <= s.end_time);
          if (currentIndex !== -1 && currentIndex !== activeSegmentIndex) {
            setActiveSegmentIndex(currentIndex);
          }
        }
      }, 500);
    }
    return () => clearInterval(interval);
  }, [isPlaying, segments, activeSegmentIndex]);

  const fetchVideos = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/shadowing/videos', {credentials: 'include'});
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
    try {
      const res = await fetch(`http://localhost:5000/api/shadowing/videos/${videoId}`, {credentials: 'include'});
      const data = await res.json();
      if (data.status === 'success') {
        setCurrentVideo(data.data);
        setSegments(data.data.segments);
        setActiveSegmentIndex(0);
      }
    } catch (e) {
      console.error(e);
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
      }
    } catch (err) {
      console.error(err);
      alert("Lỗi khi kết nối AI");
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (currentView === "practice" && currentVideo) {
    return (
      <div className="space-y-4">
        {/* Practice Header */}
        <div className="flex items-center justify-between">
          <div>
            <Button variant="ghost" onClick={handleBackToLibrary} className="mb-2">
              ← Back to Library
            </Button>
            <h1 className="text-2xl font-bold">{currentVideo.title}</h1>
            <p className="text-muted-foreground">{currentVideo.channel}</p>
          </div>
        </div>

        {/* Video Player Area */}
        <Card className="border-2 border-dashed border-gray-300">
          <CardContent className="p-8 text-center">
            <div className="rounded-lg aspect-video flex items-center justify-center mb-4 overflow-hidden bg-black relative">
              <YouTube 
                videoId={currentVideo.youtube_id} 
                opts={{ width: '100%', height: '100%', playerVars: { autoplay: 0 } }}
                onReady={onPlayerReady}
                onStateChange={onPlayerStateChange}
                className="absolute inset-0 w-full h-full"
              />
            </div>
            
            <div className="space-y-2 mt-4">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>{Math.floor(currentTime)}s</span>
                <span>Segment {activeSegmentIndex + 1}/{segments.length}</span>
                <span>{currentVideo.duration}s</span>
              </div>
              <Progress value={(currentTime / currentVideo.duration) * 100} className="h-2" />
            </div>
          </CardContent>
        </Card>

        {/* Practice Controls */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Left Panel - Controls */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Practice Controls
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Recording */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="font-medium">Voice Recording</label>
                  <Button 
                    variant={isRecording ? "destructive" : "default"}
                    onClick={isRecording ? stopRecording : startRecording}
                    className={isRecording ? "animate-pulse" : ""}
                    disabled={isAnalyzing}
                  >
                    {isRecording ? <MicOff className="h-4 w-4 mr-2" /> : <Mic className="h-4 w-4 mr-2" />}
                    {isRecording ? "Stop & Analyze" : "Start Shadowing"}
                  </Button>
                </div>
                {isRecording && (
                  <div className="text-sm text-red-600 flex items-center gap-2">
                    <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse"></div>
                    Recording your pronunciation...
                  </div>
                )}
                {isAnalyzing && (
                  <div className="text-sm text-blue-600 flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    AI is analyzing your voice...
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Right Panel - Subtitles */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Subtitles
              </CardTitle>
            </CardHeader>
            <CardContent>
               <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
                  {segments.map((subtitle, index) => {
                    const isActive = index === activeSegmentIndex;
                    return (
                      <div 
                        key={subtitle.id}
                        onClick={() => {
                          setActiveSegmentIndex(index);
                          if(playerRef.current) playerRef.current.seekTo(subtitle.start_time, true);
                        }}
                        className={`p-4 rounded-lg border transition-all duration-300 cursor-pointer ${
                          isActive
                            ? 'bg-primary/10 border-primary text-primary font-medium'
                            : 'bg-muted/30 border-border text-muted-foreground hover:bg-muted/50'
                        }`}
                      >
                        <p className="text-sm">
                          {subtitle.transcript}
                        </p>
                      </div>
                    );
                  })}
                </div>
            </CardContent>
          </Card>
        </div>

        {/* AI Pronunciation Feedback */}
        {feedback && (
          <Card className="border-2 border-primary/20 bg-primary/5">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Mic className="h-4 w-4 text-primary" /> AI Pronunciation Feedback
                </CardTitle>
                <Badge variant="default" className="text-xs bg-primary text-primary-foreground">
                  Score: {feedback.accuracy}%
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <TooltipProvider delayDuration={100}>
                <div className="p-4 rounded-lg bg-background border leading-8 text-lg font-medium shadow-sm">
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
            </CardContent>
          </Card>
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