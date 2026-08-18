import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Progress } from "../ui/progress";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import {
  BookOpen,
  Clock,
  Target,
  TrendingUp,
  Calendar,
  Award,
  ArrowRight,
  Play,
  Brain,
} from "lucide-react";

const forgettingCurveData = [
  { day: "Mon", retention: 100, withReview: 100 },
  { day: "Tue", retention: 72, withReview: 94 },
  { day: "Wed", retention: 53, withReview: 97 },
  { day: "Thu", retention: 38, withReview: 91 },
  { day: "Fri", retention: 28, withReview: 96 },
  { day: "Sat", retention: 21, withReview: 93 },
  { day: "Sun", retention: 15, withReview: 98 },
];

interface RetentionPoint { day: string; retention: number; withReview: number }

function RetentionChart({ data }: { data: RetentionPoint[] }) {
  const W = 560;
  const H = 180;
  const pl = 36; const pr = 8; const pt = 8; const pb = 24;
  const cw = W - pl - pr;
  const ch = H - pt - pb;

  const x = (i: number) => (i / (data.length - 1)) * cw;
  const y = (v: number) => ch - (v / 100) * ch;

  const retPath = data.map((d, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(d.retention).toFixed(1)}`).join(" ");
  const revPath = data.map((d, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(d.withReview).toFixed(1)}`).join(" ");

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 200 }} aria-label="Memory retention chart">
      <g transform={`translate(${pl},${pt})`}>
        {[0, 25, 50, 75, 100].map((v) => (
          <g key={v}>
            <line x1={0} y1={y(v)} x2={cw} y2={y(v)} stroke="hsl(var(--border))" strokeDasharray="3 3" />
            <text x={-4} y={y(v) + 4} textAnchor="end" fontSize={10} fill="hsl(var(--muted-foreground))">{v}%</text>
          </g>
        ))}
        {data.map((d, i) => (
          <text key={d.day} x={x(i)} y={ch + 16} textAnchor="middle" fontSize={11} fill="hsl(var(--muted-foreground))">{d.day}</text>
        ))}
        <path d={retPath} fill="none" stroke="hsl(var(--muted-foreground))" strokeWidth={2} strokeDasharray="5 5" strokeOpacity={0.5} />
        <path d={revPath} fill="none" stroke="hsl(var(--foreground))" strokeWidth={2.5} />
        {data.map((d, i) => (
          <circle key={`dot-${d.day}`} cx={x(i)} cy={y(d.withReview)} r={3.5} fill="hsl(var(--foreground))" />
        ))}
      </g>
    </svg>
  );
}

export function DashboardView() {
  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Welcome back, Sarah! 👋</h1>
          <p className="text-muted-foreground">Let's continue your English learning journey</p>
        </div>
        <Badge variant="secondary">7 day streak 🔥</Badge>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Lessons Completed</p>
                <p className="text-2xl font-bold">47</p>
              </div>
              <BookOpen className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Study Time</p>
                <p className="text-2xl font-bold">12h</p>
              </div>
              <Clock className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Words Learned</p>
                <p className="text-2xl font-bold">1,247</p>
              </div>
              <Target className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Current Level</p>
                <p className="text-2xl font-bold">B2</p>
              </div>
              <TrendingUp className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Current Progress */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Current Courses</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Business English Mastery</span>
                    <span className="font-medium">75%</span>
                  </div>
                  <Progress value={75} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Advanced Grammar</span>
                    <span className="font-medium">92%</span>
                  </div>
                  <Progress value={92} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>IELTS Speaking Prep</span>
                    <span className="font-medium">45%</span>
                  </div>
                  <Progress value={45} className="h-2" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Next Lessons
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div>
                  <h4 className="font-medium">Conditional Sentences</h4>
                  <p className="text-sm text-muted-foreground">Advanced Grammar • 25 min</p>
                </div>
                <Button size="sm">
                  <Play className="h-4 w-4 mr-2" />
                  Start
                </Button>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div>
                  <h4 className="font-medium">Business Presentations</h4>
                  <p className="text-sm text-muted-foreground">Business English • 30 min</p>
                </div>
                <Button size="sm" variant="outline">
                  Preview
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Stats */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Learning Streak
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <div className="text-4xl font-bold mb-2">7</div>
              <div className="text-muted-foreground mb-4">Days in a row</div>
              <div className="w-full bg-muted rounded-full h-2 mb-4">
                <div className="bg-primary h-2 rounded-full" style={{ width: '70%' }}></div>
              </div>
              <p className="text-sm text-muted-foreground">3 more days to reach your goal!</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Achievements</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <Award className="h-8 w-8 text-muted-foreground" />
                <div>
                  <p className="font-medium">Grammar Master</p>
                  <p className="text-xs text-muted-foreground">Completed advanced grammar</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Award className="h-8 w-8 text-muted-foreground" />
                <div>
                  <p className="font-medium">Vocabulary Wizard</p>
                  <p className="text-xs text-muted-foreground">Learned 1000+ words</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-accent border">
            <CardContent className="p-6 text-center">
              <h3 className="font-semibold mb-2">Keep it up! 🎉</h3>
              <p className="text-sm text-muted-foreground mb-4">
                You're 85% more active than average learners this week
              </p>
              <Button variant="default" size="sm">
                View Full Report
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Forgetting Curve / Retention Rate */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Memory Retention Rate — This Week
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-4 text-sm">
            <div className="flex items-center gap-1.5">
              <div className="h-2.5 w-5 rounded-full bg-muted-foreground/40" />
              <span className="text-muted-foreground">Without review (forgetting curve)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-2.5 w-5 rounded-full bg-foreground" />
              <span className="text-muted-foreground">With SRS review (your retention)</span>
            </div>
          </div>
          <RetentionChart data={forgettingCurveData} />
          <p className="text-xs text-muted-foreground mt-3 text-center">
            SRS reviews keep your retention above 90%. The dashed line shows natural forgetting without review. Next batch: <span className="font-medium text-foreground">50 cards due today</span>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}