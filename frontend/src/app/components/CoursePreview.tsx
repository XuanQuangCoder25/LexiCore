import { Button } from "./ui/button";
import { Card, CardContent, CardFooter } from "./ui/card";
import { Badge } from "./ui/badge";
import { Clock, Star, Users, ArrowRight } from "lucide-react";
import { ImageWithFallback } from "./figma/ImageWithFallback";

const courses = [
  {
    id: 1,
    title: "English for Beginners",
    description: "Start your English journey with basic vocabulary and simple conversations",
    level: "Beginner",
    duration: "4 weeks",
    students: "45k",
    rating: 4.8,
    image: "https://images.unsplash.com/photo-1565022536102-f7645c84354a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxlbmdsaXNoJTIwbGFuZ3VhZ2UlMjBsZWFybmluZyUyMGJvb2tzfGVufDF8fHx8MTc1ODcyODYyMHww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
    color: "bg-green-100 text-green-800"
  },
  {
    id: 2,
    title: "Business English Mastery",
    description: "Professional communication skills for workplace success",
    level: "Intermediate",
    duration: "6 weeks",
    students: "32k",
    rating: 4.9,
    image: "https://images.unsplash.com/photo-1758612214899-c1bb0bfae408?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjBvbmxpbmUlMjBlZHVjYXRpb24lMjB3b3Jrc3BhY2V8ZW58MXx8fHwxNzU4Nzg0NTc3fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
    color: "bg-blue-100 text-blue-800"
  },
  {
    id: 3,
    title: "IELTS Preparation",
    description: "Comprehensive preparation for all four IELTS test sections",
    level: "Advanced",
    duration: "8 weeks",
    students: "28k",
    rating: 4.7,
    image: "https://images.unsplash.com/photo-1729824186959-ba83cbd1978d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxoYXBweSUyMHN0dWRlbnQlMjBzdHVkeWluZ3xlbnwxfHx8fDE3NTg3ODQ1Nzd8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
    color: "bg-orange-100 text-orange-800"
  },
  {
    id: 4,
    title: "Conversational English",
    description: "Master everyday conversations with native speakers",
    level: "Intermediate",
    duration: "5 weeks",
    students: "38k",
    rating: 4.8,
    image: "https://images.unsplash.com/photo-1673515334717-da4d85aaf38b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb252ZXJzYXRpb24lMjBwcmFjdGljZSUyMGxhbmd1YWdlJTIwbGVhcm5pbmd8ZW58MXx8fHwxNzU4Nzg0NTc4fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
    color: "bg-purple-100 text-purple-800"
  }
];

export function CoursePreview() {
  return (
    <section className="py-16 lg:py-20 bg-gray-50">
      <div className="container mx-auto px-4 lg:px-6">
        {/* Header */}
        <div className="text-center space-y-4 mb-12">
          <h2 className="text-3xl md:text-4xl text-gray-900">
            Choose Your Learning Path
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            From beginner basics to advanced proficiency, find the perfect course for your level and goals
          </p>
        </div>

        {/* Filter Buttons */}
        <div className="flex flex-wrap justify-center gap-3 mb-12">
          <Button variant="default" className="bg-blue-600 hover:bg-blue-700">All Courses</Button>
          <Button variant="outline">Beginner</Button>
          <Button variant="outline">Intermediate</Button>
          <Button variant="outline">Advanced</Button>
          <Button variant="outline">Business</Button>
          <Button variant="outline">Test Prep</Button>
        </div>

        {/* Course Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {courses.map((course) => (
            <Card key={course.id} className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 bg-white">
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
                <h3 className="font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                  {course.title}
                </h3>
                <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                  {course.description}
                </p>
                
                <div className="flex items-center justify-between text-xs text-gray-500">
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
                <Button className="w-full group-hover:bg-blue-600 transition-colors">
                  Start Course
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        {/* View All Button */}
        <div className="text-center mt-12">
          <Button variant="outline" size="lg" className="border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white">
            View All Courses
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    </section>
  );
}