import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Progress } from "../ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Separator } from "../ui/separator";
import {
  Swords,
  Users,
  Timer,
  Trophy,
  TrendingUp,
  TrendingDown,
  Zap,
  Search,
  Crown,
  Shield,
  Star,
  RotateCcw,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Minus,
} from "lucide-react";

type ArenaState = "lobby" | "matchmaking" | "battle" | "results";

interface Question {
  id: number;
  type: "multiple-choice" | "fill-blank";
  question: string;
  options?: string[];
  answer: string;
  blank?: string;
}

const questions: Question[] = [
  {
    id: 1,
    type: "multiple-choice",
    question: "Choose the correct form: She ___ working here for five years.",
    options: ["has been", "have been", "was", "is"],
    answer: "has been",
  },
  {
    id: 2,
    type: "fill-blank",
    question: "Despite the heavy rain, they ___ to complete the marathon.",
    blank: "managed",
    answer: "managed",
  },
  {
    id: 3,
    type: "multiple-choice",
    question: "Which word is a synonym for 'ubiquitous'?",
    options: ["Rare", "Omnipresent", "Hidden", "Ancient"],
    answer: "Omnipresent",
  },
  {
    id: 4,
    type: "multiple-choice",
    question: "Identify the correct passive voice: 'The report ___ by the team.'",
    options: ["written", "was written", "write", "had writing"],
    answer: "was written",
  },
];

const onlineFriends = [
  { id: 1, name: "Alex Kim", avatar: "", level: "B2", rating: 1450, streak: 12, isOnline: true },
  { id: 2, name: "Maria Santos", avatar: "", level: "C1", rating: 1680, streak: 25, isOnline: true },
  { id: 3, name: "Jin Park", avatar: "", level: "B1", rating: 1210, streak: 5, isOnline: false },
  { id: 4, name: "Tom Wright", avatar: "", level: "C2", rating: 1920, streak: 42, isOnline: true },
];

export function ArenaView() {
  const [arenaState, setArenaState] = useState<ArenaState>("lobby");
  const [matchmakingTime, setMatchmakingTime] = useState(0);
  const [battleTime, setBattleTime] = useState(60);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [playerScore, setPlayerScore] = useState(0);
  const [opponentScore, setOpponentScore] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [answerStatus, setAnswerStatus] = useState<"correct" | "wrong" | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [fillInput, setFillInput] = useState("");

  useEffect(() => {
    if (arenaState === "matchmaking") {
      const timer = setInterval(() => {
        setMatchmakingTime((t) => {
          if (t >= 5) {
            clearInterval(timer);
            setArenaState("battle");
            return 0;
          }
          return t + 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [arenaState]);

  useEffect(() => {
    if (arenaState === "battle") {
      const timer = setInterval(() => {
        setBattleTime((t) => {
          if (t <= 1) {
            clearInterval(timer);
            setShowResults(true);
            return 0;
          }
          return t - 1;
        });
        // Simulate opponent scoring
        if (Math.random() < 0.15) {
          setOpponentScore((s) => Math.min(s + 1, questions.length));
        }
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [arenaState]);

  const handleAnswer = (answer: string) => {
    const q = questions[currentQuestion];
    const correct = answer.toLowerCase().trim() === q.answer.toLowerCase().trim();
    setSelectedAnswer(answer);
    setAnswerStatus(correct ? "correct" : "wrong");
    if (correct) setPlayerScore((s) => s + 1);

    setTimeout(() => {
      setSelectedAnswer(null);
      setAnswerStatus(null);
      setFillInput("");
      if (currentQuestion < questions.length - 1) {
        setCurrentQuestion((c) => c + 1);
      }
    }, 1000);
  };

  const resetArena = () => {
    setArenaState("lobby");
    setMatchmakingTime(0);
    setBattleTime(60);
    setCurrentQuestion(0);
    setPlayerScore(0);
    setOpponentScore(0);
    setSelectedAnswer(null);
    setAnswerStatus(null);
    setShowResults(false);
    setFillInput("");
  };

  const playerRating = 1342;
  const won = playerScore > opponentScore;
  const draw = playerScore === opponentScore;
  const ratingChange = won ? +28 : draw ? 0 : -15;

  // --- LOBBY ---
  if (arenaState === "lobby") {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Swords className="h-8 w-8" /> PvP Arena
            </h1>
            <p className="text-muted-foreground mt-1">Challenge players in real-time vocabulary battles</p>
          </div>
          <Badge variant="outline" className="text-base px-4 py-2">
            <Star className="h-4 w-4 mr-1" /> Rating: {playerRating}
          </Badge>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <Trophy className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-2xl font-bold">24</p>
              <p className="text-sm text-muted-foreground">Wins</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Shield className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-2xl font-bold">8</p>
              <p className="text-sm text-muted-foreground">Losses</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Crown className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-2xl font-bold">#47</p>
              <p className="text-sm text-muted-foreground">Global Rank</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" /> Quick Match
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Get matched with a random player of similar skill level. 60-second rapid-fire round.
              </p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Players online</span>
                  <span className="font-medium text-foreground">1,247</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Avg wait time</span>
                  <span className="font-medium text-foreground">~8 sec</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Round duration</span>
                  <span className="font-medium text-foreground">60 sec</span>
                </div>
              </div>
              <Button className="w-full" size="lg" onClick={() => setArenaState("matchmaking")}>
                <Zap className="h-4 w-4 mr-2" /> Find Match
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" /> Challenge a Friend
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {onlineFriends.map((friend) => (
                <div key={friend.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs">{friend.name.split(" ").map((n) => n[0]).join("")}</AvatarFallback>
                      </Avatar>
                      <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-background ${friend.isOnline ? "bg-green-500" : "bg-muted"}`} />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{friend.name}</p>
                      <p className="text-xs text-muted-foreground">{friend.level} · ★{friend.rating}</p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!friend.isOnline}
                    onClick={() => setArenaState("matchmaking")}
                  >
                    <Swords className="h-3 w-3 mr-1" /> Challenge
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // --- MATCHMAKING ---
  if (arenaState === "matchmaking") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-8">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold">Finding Opponent...</h2>
          <p className="text-muted-foreground">Searching for a player near your skill level</p>
        </div>

        <div className="flex items-center gap-12">
          <div className="text-center space-y-3">
            <Avatar className="h-20 w-20 mx-auto border-2 border-foreground">
              <AvatarFallback className="text-xl font-bold">SJ</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold">You</p>
              <p className="text-sm text-muted-foreground">Rating: {playerRating}</p>
            </div>
          </div>

          <div className="text-center space-y-2">
            <div className="relative">
              <Swords className="h-12 w-12 text-muted-foreground animate-pulse" />
            </div>
            <p className="text-sm text-muted-foreground">{matchmakingTime}s</p>
          </div>

          <div className="text-center space-y-3">
            <div className="h-20 w-20 mx-auto rounded-full border-2 border-dashed border-muted-foreground flex items-center justify-center">
              <Search className="h-8 w-8 text-muted-foreground animate-spin" style={{ animationDuration: "3s" }} />
            </div>
            <div>
              <p className="font-semibold text-muted-foreground">Searching...</p>
              <p className="text-sm text-muted-foreground">~1,247 online</p>
            </div>
          </div>
        </div>

        <div className="w-64">
          <Progress value={(matchmakingTime / 5) * 100} className="h-1" />
        </div>

        <Button variant="outline" onClick={() => setArenaState("lobby")}>
          Cancel
        </Button>
      </div>
    );
  }

  // --- BATTLE ---
  if (arenaState === "battle") {
    const q = questions[currentQuestion % questions.length];
    const timerPercent = (battleTime / 60) * 100;
    const timerDanger = battleTime <= 10;

    return (
      <div className="space-y-4 max-w-3xl mx-auto">
        {/* Timer & Scores */}
        <Card className={`border-2 ${timerDanger ? "border-destructive" : "border-border"}`}>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="text-center min-w-[80px]">
                <p className="text-xs text-muted-foreground mb-1">You</p>
                <p className="text-3xl font-bold">{playerScore}</p>
                <Progress value={(playerScore / questions.length) * 100} className="h-1 mt-1" />
              </div>
              <div className="flex-1 text-center space-y-2">
                <div className={`text-4xl font-mono font-bold ${timerDanger ? "text-destructive animate-pulse" : ""}`}>
                  {String(Math.floor(battleTime / 60)).padStart(2, "0")}:{String(battleTime % 60).padStart(2, "0")}
                </div>
                <Progress value={timerPercent} className="h-2" />
                <div className="flex justify-center items-center gap-1 text-xs text-muted-foreground">
                  <Timer className="h-3 w-3" /> Q{currentQuestion + 1}/{questions.length}
                </div>
              </div>
              <div className="text-center min-w-[80px]">
                <p className="text-xs text-muted-foreground mb-1">Opponent</p>
                <p className="text-3xl font-bold">{opponentScore}</p>
                <Progress value={(opponentScore / questions.length) * 100} className="h-1 mt-1" />
              </div>
            </div>

            <div className="flex justify-between mt-3 pt-3 border-t">
              <div className="flex items-center gap-2">
                <Avatar className="h-6 w-6">
                  <AvatarFallback className="text-xs">SJ</AvatarFallback>
                </Avatar>
                <span className="text-xs font-medium">Sarah J. ★{playerRating}</span>
              </div>
              <Swords className="h-4 w-4 text-muted-foreground" />
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium">Alex K. ★1450</span>
                <Avatar className="h-6 w-6">
                  <AvatarFallback className="text-xs">AK</AvatarFallback>
                </Avatar>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Question */}
        <Card>
          <CardContent className="p-6 space-y-5">
            <div className="flex items-start gap-3">
              <Badge variant="outline" className="shrink-0">
                {q.type === "multiple-choice" ? "Multiple Choice" : "Fill in the Blank"}
              </Badge>
            </div>
            <p className="text-lg font-medium leading-relaxed">{q.question}</p>

            {q.type === "multiple-choice" && q.options && (
              <div className="grid grid-cols-2 gap-3">
                {q.options.map((opt) => {
                  let variant: "outline" | "default" | "destructive" | "secondary" = "outline";
                  if (selectedAnswer === opt) {
                    variant = answerStatus === "correct" ? "default" : "destructive";
                  }
                  return (
                    <Button
                      key={opt}
                      variant={variant}
                      className="h-12 text-left justify-start"
                      onClick={() => !selectedAnswer && handleAnswer(opt)}
                      disabled={!!selectedAnswer}
                    >
                      {selectedAnswer === opt && answerStatus === "correct" && <CheckCircle2 className="h-4 w-4 mr-2" />}
                      {selectedAnswer === opt && answerStatus === "wrong" && <XCircle className="h-4 w-4 mr-2" />}
                      {opt}
                    </Button>
                  );
                })}
              </div>
            )}

            {q.type === "fill-blank" && (
              <div className="flex gap-3">
                <input
                  className="flex-1 h-12 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder="Type your answer..."
                  value={fillInput}
                  onChange={(e) => setFillInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && fillInput && handleAnswer(fillInput)}
                  disabled={!!selectedAnswer}
                />
                <Button onClick={() => fillInput && handleAnswer(fillInput)} disabled={!!selectedAnswer || !fillInput}>
                  Submit
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // --- RESULTS MODAL ---
  return (
    <>
      <div className="opacity-50 pointer-events-none">
        <div className="h-64 flex items-center justify-center">
          <p className="text-muted-foreground">Battle ended</p>
        </div>
      </div>
      <Dialog open={showResults} onOpenChange={() => {}}>
        <DialogContent className="max-w-md" aria-describedby={undefined} onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="text-center text-xl">
              {won ? "Victory! 🏆" : draw ? "Draw! 🤝" : "Defeat 😤"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-2">
            {/* Score Comparison */}
            <div className="flex items-center justify-between gap-4">
              <div className="text-center flex-1">
                <Avatar className="h-14 w-14 mx-auto mb-2 border-2 border-foreground">
                  <AvatarFallback>SJ</AvatarFallback>
                </Avatar>
                <p className="font-semibold">You</p>
                <p className="text-4xl font-bold mt-1">{playerScore}</p>
                <div className="flex items-center justify-center gap-1 mt-1">
                  {won ? (
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  ) : draw ? (
                    <Minus className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-destructive" />
                  )}
                  <span className={`text-sm font-medium ${won ? "text-green-600" : draw ? "text-muted-foreground" : "text-destructive"}`}>
                    {ratingChange > 0 ? "+" : ""}{ratingChange} Rating
                  </span>
                </div>
              </div>

              <Swords className="h-8 w-8 text-muted-foreground shrink-0" />

              <div className="text-center flex-1">
                <Avatar className="h-14 w-14 mx-auto mb-2">
                  <AvatarFallback>AK</AvatarFallback>
                </Avatar>
                <p className="font-semibold">Alex K.</p>
                <p className="text-4xl font-bold mt-1">{opponentScore}</p>
                <div className="flex items-center justify-center gap-1 mt-1">
                  {!won && !draw ? (
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  ) : draw ? (
                    <Minus className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-destructive" />
                  )}
                  <span className={`text-sm font-medium ${!won && !draw ? "text-green-600" : draw ? "text-muted-foreground" : "text-destructive"}`}>
                    {!won && !draw ? "+28" : draw ? "0" : "-28"} Rating
                  </span>
                </div>
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="text-center p-3 rounded-lg bg-muted">
                <p className="text-muted-foreground">New Rating</p>
                <p className="font-bold text-lg">{playerRating + ratingChange}</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted">
                <p className="text-muted-foreground">Accuracy</p>
                <p className="font-bold text-lg">{Math.round((playerScore / questions.length) * 100)}%</p>
              </div>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={resetArena}>
                <RotateCcw className="h-4 w-4 mr-2" /> Play Again
              </Button>
              <Button className="flex-1" onClick={resetArena}>
                <ArrowRight className="h-4 w-4 mr-2" /> Back to Lobby
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
