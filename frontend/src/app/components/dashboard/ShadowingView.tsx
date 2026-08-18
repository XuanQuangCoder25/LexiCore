import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Input } from "../ui/input";
import { Progress } from "../ui/progress";
import { Slider } from "../ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Mic,
  MicOff,
  Settings,
  Download,
  ExternalLink,
  Clock,
  Repeat,
  SkipBack,
  SkipForward,
  BookOpen,
  Target,
  TrendingUp,
  Youtube,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
} from "lucide-react";

const recentVideos = [
  {
    id: 1,
    title: "TED Talk: The Power of Vulnerability",
    channel: "TED",
    duration: "20:19",
    difficulty: "Advanced",
    thumbnail: "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=300&h=200&fit=crop",
    url: "https://youtube.com/watch?v=iCvmsMzlF7o",
    completedSegments: 15,
    totalSegments: 45,
    accuracy: 87,
    lastWatched: "2 hours ago"
  },
  {
    id: 2,
    title: "BBC News: Climate Change Update",
    channel: "BBC News",
    duration: "8:32",
    difficulty: "Intermediate",
    thumbnail: "https://images.unsplash.com/photo-1611273426858-450d8e3c9fce?w=300&h=200&fit=crop",
    url: "https://youtube.com/watch?v=example2",
    completedSegments: 8,
    totalSegments: 20,
    accuracy: 92,
    lastWatched: "1 day ago"
  },
  {
    id: 3,
    title: "Daily English Conversation Practice",
    channel: "English with Emma",
    duration: "15:47",
    difficulty: "Beginner",
    thumbnail: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300&h=200&fit=crop",
    url: "https://youtube.com/watch?v=example3",
    completedSegments: 25,
    totalSegments: 30,
    accuracy: 78,
    lastWatched: "3 days ago"
  }
];

const currentVideo = {
  title: "TED Talk: The Power of Vulnerability",
  channel: "TED",
  currentTime: "5:23",
  totalTime: "20:19",
  currentSegment: 15,
  totalSegments: 45,
  subtitles: [
    {
      start: 323,
      end: 327,
      text: "So I had a choice. I could go back to the way things were,",
      isActive: true
    },
    {
      start: 327, 
      end: 332,
      text: "or I could be brave and continue this vulnerable conversation.",
      isActive: false
    },
    {
      start: 332,
      end: 337,
      text: "And that's when I learned something about vulnerability.",
      isActive: false
    }
  ]
};

interface SyllableToken {
  text: string;
  status: "correct" | "wrong" | "neutral";
  ipa?: string;
}

const feedbackSentences: SyllableToken[][] = [
  [
    { text: "So ", status: "correct" },
    { text: "I ", status: "correct" },
    { text: "had ", status: "correct" },
    { text: "a ", status: "correct" },
    { text: "choice. ", status: "correct" },
    { text: "I ", status: "correct" },
    { text: "could ", status: "correct" },
    { text: "go ", status: "correct" },
    { text: "back ", status: "wrong", ipa: "/bæk/" },
    { text: "to ", status: "correct" },
    { text: "the ", status: "correct" },
    { text: "way ", status: "correct" },
    { text: "things ", status: "wrong", ipa: "/θɪŋz/" },
    { text: "were,", status: "correct" },
  ],
  [
    { text: "or ", status: "correct" },
    { text: "I ", status: "correct" },
    { text: "could ", status: "correct" },
    { text: "be ", status: "correct" },
    { text: "brave ", status: "wrong", ipa: "/breɪv/" },
    { text: "and ", status: "correct" },
    { text: "con", status: "wrong", ipa: "/kən/" },
    { text: "tinue ", status: "correct" },
    { text: "this ", status: "correct" },
    { text: "vul", status: "wrong", ipa: "/vʌl/" },
    { text: "ner", status: "wrong", ipa: "/nər/" },
    { text: "able ", status: "correct" },
    { text: "con", status: "correct" },
    { text: "ver", status: "correct" },
    { text: "sa", status: "correct" },
    { text: "tion.", status: "correct" },
  ],
];

function AIPronunciationFeedback() {
  const wrongCount = feedbackSentences.flat().filter((t) => t.status === "wrong").length;
  const totalCount = feedbackSentences.flat().length;
  const accuracy = Math.round(((totalCount - wrongCount) / totalCount) * 100);

  return (
    <Card className="border-2">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Mic className="h-4 w-4" /> AI Pronunciation Feedback
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              <CheckCircle2 className="h-3 w-3 mr-1 text-green-600" /> {accuracy}% accurate
            </Badge>
            <Badge variant="outline" className="text-xs text-destructive border-red-200">
              <AlertCircle className="h-3 w-3 mr-1" /> {wrongCount} issues
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground">
          Hover over <span className="text-destructive font-medium underline decoration-wavy decoration-destructive/60">red words</span> to see correct IPA pronunciation. Click the speaker icon to listen again.
        </p>

        <TooltipProvider delayDuration={100}>
          <div className="space-y-4">
            {feedbackSentences.map((sentence, si) => (
              <div key={si} className="p-4 rounded-lg bg-muted/30 border leading-8 text-base">
                {sentence.map((token, ti) =>
                  token.status === "wrong" ? (
                    <Tooltip key={ti}>
                      <TooltipTrigger asChild>
                        <span className="text-destructive font-medium underline decoration-wavy decoration-destructive/60 cursor-help">
                          {token.text}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent className="flex items-center gap-2 max-w-xs" side="top">
                        <div>
                          <p className="text-xs text-muted-foreground">Correct pronunciation</p>
                          <p className="font-mono font-bold">{token.ipa}</p>
                        </div>
                        <Button size="sm" variant="outline" className="h-7 text-xs shrink-0">
                          <Volume2 className="h-3 w-3 mr-1" /> Listen
                        </Button>
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    <span key={ti} className="text-foreground">
                      {token.text}
                    </span>
                  )
                )}
              </div>
            ))}
          </div>
        </TooltipProvider>

        <div className="grid grid-cols-3 gap-3 pt-2 border-t">
          <div className="text-center">
            <p className="text-2xl font-bold">{accuracy}%</p>
            <p className="text-xs text-muted-foreground">Accuracy</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">{wrongCount}</p>
            <p className="text-xs text-muted-foreground">Mispronounced</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">{totalCount - wrongCount}</p>
            <p className="text-xs text-muted-foreground">Correct</p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="flex-1">
            <RotateCcw className="h-4 w-4 mr-2" /> Practice Again
          </Button>
          <Button size="sm" className="flex-1">
            Next Segment <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function ShadowingView() {
  const [currentView, setCurrentView] = useState<"library" | "practice">("library");
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState([1]);
  const [repeatMode, setRepeatMode] = useState(false);
  const [showSubtitles, setShowSubtitles] = useState(true);

  const handleStartPractice = (videoId: number) => {
    setCurrentView("practice");
  };

  const handleAddVideo = () => {
    // Handle adding new YouTube video
    console.log("Add new video");
  };

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const toggleRecording = () => {
    setIsRecording(!isRecording);
  };

  const handleBackToLibrary = () => {
    setCurrentView("library");
    setIsPlaying(false);
    setIsRecording(false);
  };

  if (currentView === "practice") {
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
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm">
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Video Player Area */}
        <Card className="border-2 border-dashed border-gray-300">
          <CardContent className="p-8 text-center">
            <div className="bg-black rounded-lg aspect-video flex items-center justify-center mb-4">
              <div className="text-white">
                <Youtube className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg">YouTube Video Player</p>
                <p className="text-sm opacity-75">Video will be embedded here</p>
              </div>
            </div>
            
            {/* Video Controls */}
            <div className="flex items-center justify-center gap-4 mb-4">
              <Button variant="outline" size="sm">
                <SkipBack className="h-4 w-4" />
              </Button>
              <Button 
                size="lg" 
                onClick={togglePlayPause}
                className="rounded-full w-12 h-12"
              >
                {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
              </Button>
              <Button variant="outline" size="sm">
                <SkipForward className="h-4 w-4" />
              </Button>
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>{currentVideo.currentTime}</span>
                <span>Segment {currentVideo.currentSegment}/{currentVideo.totalSegments}</span>
                <span>{currentVideo.totalTime}</span>
              </div>
              <Progress value={33} className="h-2" />
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
                  <label className="font-medium">Recording</label>
                  <Button 
                    variant={isRecording ? "destructive" : "default"}
                    onClick={toggleRecording}
                    className={isRecording ? "animate-pulse" : ""}
                  >
                    {isRecording ? <MicOff className="h-4 w-4 mr-2" /> : <Mic className="h-4 w-4 mr-2" />}
                    {isRecording ? "Stop Recording" : "Start Recording"}
                  </Button>
                </div>
                {isRecording && (
                  <div className="text-sm text-red-600 flex items-center gap-2">
                    <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse"></div>
                    Recording your pronunciation...
                  </div>
                )}
              </div>

              {/* Playback Speed */}
              <div>
                <label className="font-medium mb-3 block">Playback Speed: {playbackSpeed[0]}x</label>
                <Slider
                  value={playbackSpeed}
                  onValueChange={setPlaybackSpeed}
                  max={2}
                  min={0.5}
                  step={0.25}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>0.5x</span>
                  <span>1x</span>
                  <span>1.5x</span>
                  <span>2x</span>
                </div>
              </div>

              {/* Practice Options */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="font-medium">Repeat Mode</label>
                  <Button 
                    variant={repeatMode ? "default" : "outline"}
                    size="sm"
                    onClick={() => setRepeatMode(!repeatMode)}
                  >
                    <Repeat className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="flex items-center justify-between">
                  <label className="font-medium">Show Subtitles</label>
                  <Button 
                    variant={showSubtitles ? "default" : "outline"}
                    size="sm"
                    onClick={() => setShowSubtitles(!showSubtitles)}
                  >
                    <BookOpen className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="flex items-center justify-between">
                  <label className="font-medium">Audio</label>
                  <Button 
                    variant="outline"
                    size="sm"
                    onClick={() => setIsMuted(!isMuted)}
                  >
                    {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1">
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Replay Segment
                </Button>
                <Button variant="outline" size="sm" className="flex-1">
                  <SkipForward className="h-4 w-4 mr-2" />
                  Next Segment
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Right Panel - Subtitles */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Subtitles & Practice
              </CardTitle>
            </CardHeader>
            <CardContent>
              {showSubtitles && (
                <div className="space-y-4">
                  {currentVideo.subtitles.map((subtitle, index) => (
                    <div 
                      key={index}
                      className={`p-4 rounded-lg border transition-all duration-300 ${
                        subtitle.isActive
                          ? 'bg-muted border-foreground'
                          : 'bg-muted/30 border-border'
                      }`}
                    >
                      <p className={`text-sm ${subtitle.isActive ? 'font-medium' : ''}`}>
                        {subtitle.text}
                      </p>
                      {subtitle.isActive && (
                        <div className="flex gap-2 mt-2">
                          <Button size="sm" variant="outline">
                            <Volume2 className="h-3 w-3 mr-1" />
                            Play
                          </Button>
                          <Button size="sm" variant="outline">
                            <Repeat className="h-3 w-3 mr-1" />
                            Repeat
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              
              {!showSubtitles && (
                <div className="text-center py-8 text-muted-foreground">
                  <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Subtitles are hidden</p>
                  <p className="text-sm">Focus on listening and speaking</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* AI Pronunciation Feedback */}
        {isRecording === false && <AIPronunciationFeedback />}

        {/* Progress Stats */}
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold">87%</p>
                <p className="text-sm text-muted-foreground">Accuracy Score</p>
              </div>
              <div>
                <p className="text-2xl font-bold">15/45</p>
                <p className="text-sm text-muted-foreground">Segments Completed</p>
              </div>
              <div>
                <p className="text-2xl font-bold">5:23</p>
                <p className="text-sm text-muted-foreground">Practice Time</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">YouTube Shadowing</h1>
        <p className="text-muted-foreground">Practice pronunciation and rhythm with real videos</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Videos Practiced</p>
                <p className="text-2xl font-bold">24</p>
              </div>
              <Youtube className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Practice Time</p>
                <p className="text-2xl font-bold">8.5h</p>
              </div>
              <Clock className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Accuracy</p>
                <p className="text-2xl font-bold">84%</p>
              </div>
              <Target className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Improvement</p>
                <p className="text-2xl font-bold">+12%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add Video Section */}
      <Card className="border-dashed border-2">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Input 
                placeholder="Paste YouTube URL here (e.g., https://youtube.com/watch?v=...)" 
                className="text-lg"
              />
            </div>
            <Button onClick={handleAddVideo} size="lg">
              <Download className="h-4 w-4 mr-2" />
              Add Video
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Our AI will automatically extract subtitles and create practice segments for you
          </p>
        </CardContent>
      </Card>

      {/* Video Library */}
      <Tabs defaultValue="recent" className="space-y-6">
        <TabsList>
          <TabsTrigger value="recent">Recent Videos</TabsTrigger>
          <TabsTrigger value="favorites">Favorites</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
        </TabsList>

        <TabsContent value="recent" className="space-y-6">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recentVideos.map((video) => (
              <Card key={video.id} className="hover:shadow-lg transition-all duration-300 group">
                <div className="relative">
                  <img 
                    src={video.thumbnail} 
                    alt={video.title}
                    className="w-full h-48 object-cover rounded-t-lg"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-300 rounded-t-lg flex items-center justify-center">
                    <Button 
                      className="opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                      onClick={() => handleStartPractice(video.id)}
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Practice
                    </Button>
                  </div>
                  <div className="absolute top-2 right-2">
                    <Badge variant={video.difficulty === "Beginner" ? "secondary" : video.difficulty === "Intermediate" ? "outline" : "destructive"}>
                      {video.difficulty}
                    </Badge>
                  </div>
                  <div className="absolute bottom-2 right-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">
                    {video.duration}
                  </div>
                </div>
                
                <CardContent className="p-4">
                  <h3 className="font-semibold mb-1 line-clamp-2 group-hover:text-foreground transition-colors">
                    {video.title}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-3">{video.channel}</p>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Progress</span>
                      <span>{Math.round((video.completedSegments / video.totalSegments) * 100)}%</span>
                    </div>
                    <Progress 
                      value={(video.completedSegments / video.totalSegments) * 100} 
                      className="h-2" 
                    />
                  </div>
                  
                  <div className="flex justify-between items-center mt-4">
                    <div className="text-xs text-muted-foreground">
                      Accuracy: <span className="font-medium">{video.accuracy}%</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {video.lastWatched}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="favorites" className="space-y-6">
          <div className="text-center py-12">
            <Youtube className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="font-semibold mb-2">No Favorite Videos Yet</h3>
            <p className="text-muted-foreground mb-4">
              Star your favorite videos to find them easily later
            </p>
          </div>
        </TabsContent>

        <TabsContent value="completed" className="space-y-6">
          <div className="text-center py-12">
            <Target className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="font-semibold mb-2">Complete Your First Video</h3>
            <p className="text-muted-foreground mb-4">
              Finished videos will appear here with your performance stats
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}