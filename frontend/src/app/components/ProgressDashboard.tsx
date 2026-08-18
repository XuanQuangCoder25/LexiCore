import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Progress } from "./ui/progress";
import { Badge } from "./ui/badge";
import { 
  BookOpen, 
  Trophy, 
  Calendar, 
  TrendingUp, 
  Target,
  Clock,
  Award,
  ArrowRight
} from "lucide-react";

export function ProgressDashboard() {
  return (
    <section className="py-16 lg:py-20 bg-white">
      <div className="container mx-auto px-4 lg:px-6">
        {/* Header */}
        <div className="text-center space-y-4 mb-12">
          <h2 className="text-3xl md:text-4xl text-gray-900">
            Track Your Learning Journey
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Visualize your progress, celebrate achievements, and stay motivated with personalized insights
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Progress Card */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl">Welcome back, Sarah! 👋</CardTitle>
                  <Badge className="bg-green-100 text-green-800">7 day streak</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3">Current Course Progress</h3>
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-700">Business English Mastery</span>
                          <span className="text-blue-600 font-medium">75%</span>
                        </div>
                        <Progress value={75} className="h-2" />
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-700">Advanced Grammar</span>
                          <span className="text-green-600 font-medium">92%</span>
                        </div>
                        <Progress value={92} className="h-2" />
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-700">IELTS Speaking Prep</span>
                          <span className="text-orange-600 font-medium">45%</span>
                        </div>
                        <Progress value={45} className="h-2" />
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3">Weekly Stats</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                          <BookOpen className="w-4 h-4 text-blue-600" />
                          <span className="text-sm font-medium text-gray-700">Lessons</span>
                        </div>
                        <div className="text-2xl font-bold text-blue-600">12</div>
                        <div className="text-xs text-gray-600">This week</div>
                      </div>
                      <div className="bg-green-50 p-4 rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                          <Clock className="w-4 h-4 text-green-600" />
                          <span className="text-sm font-medium text-gray-700">Minutes</span>
                        </div>
                        <div className="text-2xl font-bold text-green-600">240</div>
                        <div className="text-xs text-gray-600">Study time</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-6">
                  <h3 className="font-semibold text-gray-900 mb-4">Recent Achievements</h3>
                  <div className="flex flex-wrap gap-3">
                    <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 flex items-center gap-1">
                      <Trophy className="w-3 h-3" />
                      Grammar Master
                    </Badge>
                    <Badge variant="secondary" className="bg-blue-100 text-blue-800 flex items-center gap-1">
                      <Target className="w-3 h-3" />
                      5 Lessons Completed
                    </Badge>
                    <Badge variant="secondary" className="bg-purple-100 text-purple-800 flex items-center gap-1">
                      <Award className="w-3 h-3" />
                      Vocabulary Wizard
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Next Lessons */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-blue-600" />
                  Upcoming Lessons
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <h4 className="font-medium text-gray-900">Conditional Sentences</h4>
                      <p className="text-sm text-gray-600">Advanced Grammar • 25 minutes</p>
                    </div>
                    <Button size="sm">
                      Start Now
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <h4 className="font-medium text-gray-900">Business Presentations</h4>
                      <p className="text-sm text-gray-600">Business English • 30 minutes</p>
                    </div>
                    <Button size="sm" variant="outline">
                      Preview
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar Stats */}
          <div className="space-y-6">
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                  Learning Streak
                </CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <div className="text-4xl font-bold text-green-600 mb-2">7</div>
                <div className="text-gray-600 mb-4">Days in a row</div>
                <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                  <div className="bg-green-600 h-2 rounded-full" style={{ width: '70%' }}></div>
                </div>
                <p className="text-sm text-gray-600">3 more days to reach your goal!</p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg">Overall Progress</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600 mb-1">B2</div>
                  <div className="text-sm text-gray-600">Current Level</div>
                </div>
                
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Vocabulary</span>
                      <span className="text-blue-600">1,247 words</span>
                    </div>
                    <Progress value={85} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Grammar</span>
                      <span className="text-green-600">Advanced</span>
                    </div>
                    <Progress value={78} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Speaking</span>
                      <span className="text-orange-600">Intermediate</span>
                    </div>
                    <Progress value={65} className="h-2" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-600 to-purple-600 text-white">
              <CardContent className="p-6 text-center">
                <Trophy className="w-12 h-12 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">You're doing great!</h3>
                <p className="text-sm opacity-90 mb-4">
                  You've completed 85% more lessons than average this week
                </p>
                <Button variant="secondary" size="sm" className="bg-white text-blue-600 hover:bg-gray-100">
                  Share Achievement
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Demo CTA for non-logged users */}
        <div className="mt-12 text-center">
          <Card className="border-2 border-dashed border-gray-300 bg-gray-50">
            <CardContent className="p-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Want to track your own progress?
              </h3>
              <p className="text-gray-600 mb-6">
                Sign up for free to access personalized dashboards, progress tracking, and achievement badges
              </p>
              <Button size="lg" className="bg-blue-600 hover:bg-blue-700">
                Start Your Journey
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}