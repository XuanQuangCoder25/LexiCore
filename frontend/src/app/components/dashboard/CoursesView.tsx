import { Button } from "../ui/button";
import { Card, CardContent, CardFooter } from "../ui/card";
import { Badge } from "../ui/badge";
import { Input } from "../ui/input";
import { Clock, Star, Users, Search, Filter, ArrowRight } from "lucide-react";
import { ImageWithFallback } from "../figma/ImageWithFallback";

const courses = [
  {
    id: 1,
    title: "English for Beginners",
    description: "Start your English journey with basic vocabulary and simple conversations",
    level: "Beginner",
    duration: "4 weeks",
    students: "45k",
    rating: 4.8,
    progress: 0,
    image: "https://images.unsplash.com/photo-1565022536102-f7645c84354a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxlbmdsaXNoJTIwbGFuZ3VhZ2UlMjBsZWFybmluZyUyMGJvb2tzfGVufDF8fHx8MTc1ODcyODYyMHww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
    color: "bg-secondary text-secondary-foreground",
    status: "available"
  },
  {
    id: 2,
    title: "Business English Mastery",
    description: "Professional communication skills for workplace success",
    level: "Intermediate",
    duration: "6 weeks",
    students: "32k",
    rating: 4.9,
    progress: 75,
    image: "https://images.unsplash.com/photo-1758612214899-c1bb0bfae408?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjBvbmxpbmUlMjBlZHVjYXRpb24lMjB3b3Jrc3BhY2V8ZW58MXx8fHwxNzU4Nzg0NTc3fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
    color: "bg-secondary text-secondary-foreground",
    status: "in-progress"
  },
  {
    id: 3,
    title: "IELTS Preparation",
    description: "Comprehensive preparation for all four IELTS test sections",
    level: "Advanced",
    duration: "8 weeks",
    students: "28k",
    rating: 4.7,
    progress: 45,
    image: "https://images.unsplash.com/photo-1729824186959-ba83cbd1978d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxoYXBweSUyMHN0dWRlbnQlMjBzdHVkeWluZ3xlbnwxfHx8fDE3NTg3ODQ1Nzd8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
    color: "bg-secondary text-secondary-foreground",
    status: "in-progress"
  },
  {
    id: 4,
    title: "Conversational English",
    description: "Master everyday conversations with native speakers",
    level: "Intermediate",
    duration: "5 weeks",
    students: "38k",
    rating: 4.8,
    progress: 100,
    image: "https://images.unsplash.com/photo-1673515334717-da4d85aaf38b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb252ZXJzYXRpb24lMjBwcmFjdGljZSUyMGxhbmd1YWdlJTIwbGVhcm5pbmd8ZW58MXx8fHwxNzU4Nzg0NTc4fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
    color: "bg-secondary text-secondary-foreground",
    status: "completed"
  },
  {
    id: 5,
    title: "Academic Writing",
    description: "Develop advanced writing skills for academic success",
    level: "Advanced",
    duration: "7 weeks",
    students: "22k",
    rating: 4.6,
    progress: 0,
    image: "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx3cml0aW5nJTIwZGVza3xlbnwxfHx8fDE3NTg3ODQ1Nzh8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
    color: "bg-secondary text-secondary-foreground",
    status: "available"
  },
  {
    id: 6,
    title: "Pronunciation Perfect",
    description: "Improve your accent and pronunciation with AI feedback",
    level: "All Levels",
    duration: "3 weeks",
    students: "55k",
    rating: 4.9,
    progress: 0,
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtaWNyb3Bob25lJTIwcmVjb3JkaW5nfGVufDF8fHx8MTc1ODc4NDU3OHww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
    color: "bg-secondary text-secondary-foreground",
    status: "available"
  }
];

export function CoursesView() {
  const getStatusBadge = (status: string, progress: number) => {
    switch (status) {
      case "completed":
        return <Badge variant="secondary">Completed</Badge>;
      case "in-progress":
        return <Badge variant="default">{progress}% Complete</Badge>;
      default:
        return <Badge variant="outline">Not Started</Badge>;
    }
  };

  const getActionButton = (status: string, progress: number) => {
    switch (status) {
      case "completed":
        return (
          <Button variant="outline" className="w-full">
            Review Course
          </Button>
        );
      case "in-progress":
        return (
          <Button className="w-full">
            Continue Learning
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        );
      default:
        return (
          <Button className="w-full">
            Start Course
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Courses</h1>
        <p className="text-muted-foreground">Discover and track your learning progress</p>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input 
            placeholder="Search courses..." 
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
          <Button variant="outline" size="sm">All Levels</Button>
          <Button variant="outline" size="sm">In Progress</Button>
          <Button variant="outline" size="sm">Available</Button>
        </div>
      </div>

      {/* My Courses Section */}
      <div>
        <h2 className="text-xl font-semibold mb-4">My Courses</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.filter(course => course.status !== "available").map((course) => (
            <Card key={course.id} className="group hover:shadow-lg transition-all duration-300">
              <div className="relative overflow-hidden rounded-t-lg">
                <ImageWithFallback
                  src={course.image}
                  alt={course.title}
                  className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute top-3 left-3">
                  <Badge className={course.color}>
                    {course.level}
                  </Badge>
                </div>
                <div className="absolute top-3 right-3">
                  {getStatusBadge(course.status, course.progress)}
                </div>
                {course.progress > 0 && course.progress < 100 && (
                  <div className="absolute bottom-0 left-0 right-0 bg-black/50 p-2">
                    <div className="w-full bg-muted rounded-full h-2">
                      <div 
                        className="bg-primary h-2 rounded-full transition-all duration-300" 
                        style={{ width: `${course.progress}%` }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>
              
              <CardContent className="p-4">
                <h3 className="font-semibold mb-2 group-hover:text-primary transition-colors">
                  {course.title}
                </h3>
                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                  {course.description}
                </p>
                
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>{course.duration}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                    <span>{course.rating}</span>
                  </div>
                </div>
              </CardContent>
              
              <CardFooter className="p-4 pt-0">
                {getActionButton(course.status, course.progress)}
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>

      {/* Available Courses */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Available Courses</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.filter(course => course.status === "available").map((course) => (
            <Card key={course.id} className="group hover:shadow-lg transition-all duration-300">
              <div className="relative overflow-hidden rounded-t-lg">
                <ImageWithFallback
                  src={course.image}
                  alt={course.title}
                  className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute top-3 left-3">
                  <Badge className={course.color}>
                    {course.level}
                  </Badge>
                </div>
                <div className="absolute top-3 right-3 bg-white/90 backdrop-blur rounded-lg p-2">
                  <div className="flex items-center gap-1">
                    <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                    <span className="text-xs font-medium">{course.rating}</span>
                  </div>
                </div>
              </div>
              
              <CardContent className="p-4">
                <h3 className="font-semibold mb-2 group-hover:text-primary transition-colors">
                  {course.title}
                </h3>
                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                  {course.description}
                </p>
                
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>{course.duration}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    <span>{course.students}</span>
                  </div>
                </div>
              </CardContent>
              
              <CardFooter className="p-4 pt-0">
                {getActionButton(course.status, course.progress)}
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}