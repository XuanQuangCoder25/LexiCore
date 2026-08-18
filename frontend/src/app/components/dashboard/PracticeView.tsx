import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { Progress } from "../ui/progress";
import { 
  BookOpen, 
  Mic, 
  PenTool, 
  MessageCircle, 
  Brain,
  Volume2,
  ArrowRight,
  Play,
  Trophy,
  Timer
} from "lucide-react";

const practiceTools = [
  {
    icon: BookOpen,
    title: "Vocabulary Builder",
    description: "Interactive flashcards with spaced repetition",
    color: "bg-blue-500",
    bgColor: "bg-blue-50",
    stats: "1,247 words learned",
    progress: 85,
    action: "Practice Now"
  },
  {
    icon: Mic,
    title: "Speaking Practice",
    description: "AI-powered pronunciation feedback",
    color: "bg-green-500",
    bgColor: "bg-green-50",
    stats: "4.5/5 accuracy score",
    progress: 78,
    action: "Start Speaking"
  },
  {
    icon: PenTool,
    title: "Grammar Exercises",
    description: "Interactive grammar lessons and quizzes",
    color: "bg-orange-500",
    bgColor: "bg-orange-50",
    stats: "Advanced level reached",
    progress: 92,
    action: "Continue"
  },
  {
    icon: MessageCircle,
    title: "Conversation Practice",
    description: "Chat with AI tutors and real speakers",
    color: "bg-purple-500",
    bgColor: "bg-purple-50",
    stats: "32 conversations completed",
    progress: 65,
    action: "Join Chat"
  }
];

const dailyChallenges = [
  {
    title: "Word of the Day",
    description: "Learn 'Serendipity' - a pleasant surprise",
    icon: BookOpen,
    color: "text-blue-600",
    completed: true
  },
  {
    title: "Pronunciation Challenge",
    description: "Practice difficult 'th' sounds",
    icon: Volume2,
    color: "text-green-600",
    completed: false
  },
  {
    title: "Grammar Quiz",
    description: "Master conditional sentences",
    icon: PenTool,
    color: "text-orange-600",
    completed: false
  },
  {
    title: "Speaking Exercise",
    description: "Describe your ideal vacation",
    icon: Mic,
    color: "text-purple-600",
    completed: false
  }
];

const recentSessions = [
  {
    type: "Vocabulary",
    score: "95%",
    time: "15 min",
    date: "Today"
  },
  {
    type: "Speaking",
    score: "88%",
    time: "20 min",
    date: "Yesterday"
  },
  {
    type: "Grammar",
    score: "92%",
    time: "12 min",
    date: "2 days ago"
  }
];

export function PracticeView() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Practice Tools</h1>
        <p className="text-muted-foreground">Improve your English with interactive exercises</p>
      </div>

      {/* Daily Challenges */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Today's Challenges
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {dailyChallenges.map((challenge, index) => {
              const IconComponent = challenge.icon;
              return (
                <div key={index} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  <div className={`p-2 rounded-lg ${challenge.completed ? 'bg-green-100' : 'bg-gray-100'}`}>
                    <IconComponent className={`h-4 w-4 ${challenge.completed ? 'text-green-600' : challenge.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{challenge.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{challenge.description}</p>
                  </div>
                  {challenge.completed && (
                    <Badge className="bg-green-100 text-green-800 text-xs">✓</Badge>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Practice Tools Grid */}
      <div className="grid lg:grid-cols-2 gap-6">
        {practiceTools.map((tool, index) => {
          const IconComponent = tool.icon;
          return (
            <Card key={index} className="group hover:shadow-lg transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl ${tool.bgColor} group-hover:scale-110 transition-transform duration-300`}>
                    <IconComponent className={`w-6 h-6 ${tool.color.replace('bg-', 'text-')}`} />
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {tool.progress}%
                  </Badge>
                </div>
                
                <h3 className="font-semibold mb-2 group-hover:text-blue-600 transition-colors">
                  {tool.title}
                </h3>
                
                <p className="text-sm text-muted-foreground mb-4">
                  {tool.description}
                </p>
                
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{tool.stats}</span>
                    <span className="font-medium">{tool.progress}%</span>
                  </div>
                  <Progress value={tool.progress} className="h-2" />
                  
                  <Button className="w-full mt-4">
                    <Play className="w-4 h-4 mr-2" />
                    {tool.action}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Quick Practice */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Quick Practice Sessions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <Button variant="outline" className="h-auto p-4 flex flex-col items-start">
                <div className="flex items-center gap-2 mb-2">
                  <Timer className="h-4 w-4" />
                  <span className="font-medium">5-Minute Vocabulary</span>
                </div>
                <span className="text-xs text-muted-foreground">Quick word review session</span>
              </Button>
              
              <Button variant="outline" className="h-auto p-4 flex flex-col items-start">
                <div className="flex items-center gap-2 mb-2">
                  <Mic className="h-4 w-4" />
                  <span className="font-medium">Pronunciation Drill</span>
                </div>
                <span className="text-xs text-muted-foreground">Focus on difficult sounds</span>
              </Button>
              
              <Button variant="outline" className="h-auto p-4 flex flex-col items-start">
                <div className="flex items-center gap-2 mb-2">
                  <PenTool className="h-4 w-4" />
                  <span className="font-medium">Grammar Sprint</span>
                </div>
                <span className="text-xs text-muted-foreground">Rapid-fire grammar questions</span>
              </Button>
              
              <Button variant="outline" className="h-auto p-4 flex flex-col items-start">
                <div className="flex items-center gap-2 mb-2">
                  <Brain className="h-4 w-4" />
                  <span className="font-medium">Mixed Review</span>
                </div>
                <span className="text-xs text-muted-foreground">All skills combined</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Recent Sessions */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentSessions.map((session, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div>
                    <p className="font-medium text-sm">{session.type}</p>
                    <p className="text-xs text-muted-foreground">{session.date} • {session.time}</p>
                  </div>
                  <Badge className="bg-green-100 text-green-800">
                    {session.score}
                  </Badge>
                </div>
              ))}
            </div>
            
            <Button variant="ghost" className="w-full mt-4 text-blue-600">
              View All Sessions
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* AI Tutor Section */}
      <Card className="bg-gradient-to-r from-blue-600 to-purple-600 text-white border-0">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold mb-2">Meet Your AI Tutor</h3>
              <p className="text-sm opacity-90 mb-4">
                Get personalized feedback and adaptive learning paths
              </p>
              <Button variant="secondary" className="bg-white text-blue-600 hover:bg-gray-100">
                <MessageCircle className="w-4 h-4 mr-2" />
                Chat with AI Tutor
              </Button>
            </div>
            <div className="hidden sm:block">
              <Brain className="h-16 w-16 opacity-50" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}