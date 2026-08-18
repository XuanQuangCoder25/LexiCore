import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Progress } from "../ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { 
  Trophy, 
  Target, 
  Calendar, 
  Award,
  Star,
  Flame,
  BookOpen,
  Mic,
  PenTool,
  Users,
  Crown,
  Medal,
  Share
} from "lucide-react";

const achievements = [
  {
    id: 1,
    title: "Grammar Master",
    description: "Complete all advanced grammar lessons",
    icon: PenTool,
    color: "text-yellow-500",
    bgColor: "bg-yellow-100",
    progress: 100,
    unlocked: true,
    points: 500,
    unlockedDate: "2 days ago"
  },
  {
    id: 2,
    title: "Vocabulary Wizard",
    description: "Learn 1000+ new words",
    icon: BookOpen,
    color: "text-blue-500",
    bgColor: "bg-blue-100",
    progress: 100,
    unlocked: true,
    points: 750,
    unlockedDate: "1 week ago"
  },
  {
    id: 3,
    title: "Speaking Star",
    description: "Complete 50 speaking exercises",
    icon: Mic,
    color: "text-green-500",
    bgColor: "bg-green-100",
    progress: 86,
    unlocked: false,
    points: 600,
    current: 43,
    target: 50
  },
  {
    id: 4,
    title: "Community Helper",
    description: "Help 25 community members",
    icon: Users,
    color: "text-purple-500",
    bgColor: "bg-purple-100",
    progress: 64,
    unlocked: false,
    points: 400,
    current: 16,
    target: 25
  },
  {
    id: 5,
    title: "Streak Legend",
    description: "Maintain a 30-day learning streak",
    icon: Flame,
    color: "text-red-500",
    bgColor: "bg-red-100",
    progress: 23,
    unlocked: false,
    points: 800,
    current: 7,
    target: 30
  },
  {
    id: 6,
    title: "Perfect Score",
    description: "Score 100% on 10 quizzes",
    icon: Target,
    color: "text-indigo-500",
    bgColor: "bg-indigo-100",
    progress: 70,
    unlocked: false,
    points: 300,
    current: 7,
    target: 10
  }
];

const badges = [
  {
    title: "Early Bird",
    description: "Study before 8 AM for 7 days",
    icon: Crown,
    color: "text-yellow-600",
    earned: true
  },
  {
    title: "Night Owl",
    description: "Study after 10 PM for 5 days",
    icon: Medal,
    color: "text-purple-600",
    earned: true
  },
  {
    title: "Speed Learner",
    description: "Complete lessons in record time",
    icon: Star,
    color: "text-blue-600",
    earned: false
  },
  {
    title: "Social Butterfly",
    description: "Make 10 friends in the community",
    icon: Users,
    color: "text-pink-600",
    earned: false
  }
];

const goals = [
  {
    title: "Daily Learning",
    description: "Study for at least 30 minutes daily",
    icon: Calendar,
    progress: 7,
    target: 30,
    streak: 7,
    type: "daily"
  },
  {
    title: "Weekly Vocabulary",
    description: "Learn 50 new words this week",
    icon: BookOpen,
    progress: 32,
    target: 50,
    type: "weekly"
  },
  {
    title: "Monthly Speaking",
    description: "Complete 20 speaking exercises this month",
    icon: Mic,
    progress: 12,
    target: 20,
    type: "monthly"
  }
];

export function AchievementsView() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Achievements & Goals</h1>
        <p className="text-muted-foreground">Track your progress and celebrate your success</p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Points</p>
                <p className="text-2xl font-bold">3,450</p>
              </div>
              <Trophy className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Achievements</p>
                <p className="text-2xl font-bold">12/18</p>
              </div>
              <Award className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Current Streak</p>
                <p className="text-2xl font-bold">7 days</p>
              </div>
              <Flame className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Global Rank</p>
                <p className="text-2xl font-bold">#1,247</p>
              </div>
              <Star className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="achievements" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="achievements">Achievements</TabsTrigger>
          <TabsTrigger value="goals">Goals</TabsTrigger>
          <TabsTrigger value="badges">Badges</TabsTrigger>
        </TabsList>

        {/* Achievements Tab */}
        <TabsContent value="achievements" className="space-y-6">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {achievements.map((achievement) => {
              const IconComponent = achievement.icon;
              return (
                <Card key={achievement.id} className={`hover:shadow-lg transition-all duration-300 ${
                  achievement.unlocked ? 'border-green-200 bg-green-50/50 dark:bg-green-950/20' : ''
                }`}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl ${
                        achievement.unlocked ? achievement.bgColor : 'bg-gray-100'
                      }`}>
                        <IconComponent className={`w-6 h-6 ${
                          achievement.unlocked ? achievement.color : 'text-gray-400'
                        }`} />
                      </div>
                      {achievement.unlocked && (
                        <Badge className="bg-green-100 text-green-800">
                          +{achievement.points} pts
                        </Badge>
                      )}
                    </div>
                    
                    <h3 className={`font-semibold mb-2 ${
                      achievement.unlocked ? 'text-green-700 dark:text-green-400' : ''
                    }`}>
                      {achievement.title}
                    </h3>
                    
                    <p className="text-sm text-muted-foreground mb-4">
                      {achievement.description}
                    </p>
                    
                    {achievement.unlocked ? (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-green-600 font-medium">Unlocked!</span>
                          <span className="text-muted-foreground">{achievement.unlockedDate}</span>
                        </div>
                        <Button variant="outline" size="sm" className="w-full">
                          <Share className="w-4 h-4 mr-2" />
                          Share Achievement
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">
                            {achievement.current}/{achievement.target}
                          </span>
                          <span className="font-medium">{achievement.progress}%</span>
                        </div>
                        <Progress value={achievement.progress} className="h-2" />
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Goals Tab */}
        <TabsContent value="goals" className="space-y-6">
          <div className="grid lg:grid-cols-2 gap-6">
            {goals.map((goal, index) => {
              const IconComponent = goal.icon;
              const progressPercentage = (goal.progress / goal.target) * 100;
              
              return (
                <Card key={index} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                        <IconComponent className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <div>{goal.title}</div>
                        <div className="text-sm font-normal text-muted-foreground">
                          {goal.description}
                        </div>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">
                          Progress: {goal.progress}/{goal.target}
                        </span>
                        <span className="font-medium">{Math.round(progressPercentage)}%</span>
                      </div>
                      <Progress value={progressPercentage} className="h-3" />
                      
                      {goal.streak && (
                        <div className="flex items-center gap-2 text-sm">
                          <Flame className="h-4 w-4 text-red-500" />
                          <span>{goal.streak} day streak!</span>
                        </div>
                      )}
                      
                      <Badge variant="outline" className="capitalize">
                        {goal.type} Goal
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Set New Goal */}
          <Card className="border-dashed border-2">
            <CardContent className="p-8 text-center">
              <Target className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="font-semibold mb-2">Set a New Goal</h3>
              <p className="text-muted-foreground mb-4">
                Challenge yourself with a custom learning goal
              </p>
              <Button>
                <Target className="h-4 w-4 mr-2" />
                Create Goal
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Badges Tab */}
        <TabsContent value="badges" className="space-y-6">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {badges.map((badge, index) => {
              const IconComponent = badge.icon;
              return (
                <Card key={index} className={`text-center hover:shadow-lg transition-all duration-300 ${
                  badge.earned ? 'border-yellow-200 bg-yellow-50/50 dark:bg-yellow-950/20' : 'opacity-60'
                }`}>
                  <CardContent className="p-6">
                    <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 ${
                      badge.earned ? 'bg-yellow-100 dark:bg-yellow-900' : 'bg-gray-100 dark:bg-gray-800'
                    }`}>
                      <IconComponent className={`w-8 h-8 ${
                        badge.earned ? badge.color : 'text-gray-400'
                      }`} />
                    </div>
                    
                    <h3 className={`font-semibold mb-2 ${
                      badge.earned ? 'text-yellow-700 dark:text-yellow-400' : 'text-gray-500'
                    }`}>
                      {badge.title}
                    </h3>
                    
                    <p className="text-sm text-muted-foreground">
                      {badge.description}
                    </p>
                    
                    {badge.earned && (
                      <Badge className="mt-3 bg-yellow-100 text-yellow-800">
                        Earned
                      </Badge>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Challenge Section */}
          <Card className="bg-gradient-to-r from-purple-600 to-blue-600 text-white border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold mb-2">Weekly Challenge</h3>
                  <p className="text-sm opacity-90 mb-4">
                    Complete 5 lessons this week to earn the "Consistent Learner" badge
                  </p>
                  <div className="flex items-center gap-2 text-sm">
                    <span>Progress: 3/5 lessons</span>
                    <div className="w-24 bg-white/20 rounded-full h-2">
                      <div className="bg-white h-2 rounded-full" style={{ width: '60%' }}></div>
                    </div>
                  </div>
                </div>
                <Award className="h-16 w-16 opacity-50" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}