import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Badge } from "./ui/badge";
import { Star, MessageCircle, Users, ArrowRight, Quote } from "lucide-react";

const testimonials = [
  {
    id: 1,
    name: "Maria Rodriguez",
    role: "Business Professional",
    country: "Spain",
    avatar: "https://images.unsplash.com/photo-1494790108755-2616b612b886?w=150&h=150&fit=crop&crop=face",
    rating: 5,
    text: "EnglishLearn helped me improve my IELTS score by 2 points! The speaking practice with AI feedback was incredible.",
    achievement: "IELTS 8.0 achieved",
    beforeScore: "6.0",
    afterScore: "8.0"
  },
  {
    id: 2,
    name: "Ahmed Hassan",
    role: "Software Engineer",
    country: "Egypt",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
    rating: 5,
    text: "The business English course transformed my career. I got promoted after just 3 months of learning!",
    achievement: "Career Promotion",
    beforeScore: "Intermediate",
    afterScore: "Advanced"
  },
  {
    id: 3,
    name: "Yuki Tanaka",
    role: "University Student",
    country: "Japan",
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face",
    rating: 5,
    text: "Amazing community! I made friends from all over the world while improving my conversation skills.",
    achievement: "Fluent Speaker",
    beforeScore: "Beginner",
    afterScore: "Fluent"
  }
];

const forumPosts = [
  {
    title: "Best strategies for memorizing vocabulary?",
    author: "StudentLife_2024",
    replies: 23,
    time: "2 hours ago",
    category: "Vocabulary"
  },
  {
    title: "How to prepare for IELTS Speaking test?",
    author: "FutureStudent",
    replies: 45,
    time: "4 hours ago",
    category: "Test Prep"
  },
  {
    title: "Practice partner for daily conversations",
    author: "EnglishJourney",
    replies: 12,
    time: "6 hours ago",
    category: "Speaking Practice"
  },
  {
    title: "Grammar question: Present Perfect vs Simple Past",
    author: "GrammarNerd",
    replies: 18,
    time: "8 hours ago",
    category: "Grammar"
  }
];

export function CommunitySection() {
  return (
    <section className="py-16 lg:py-20 bg-gray-50">
      <div className="container mx-auto px-4 lg:px-6">
        {/* Header */}
        <div className="text-center space-y-4 mb-16">
          <h2 className="text-3xl md:text-4xl text-gray-900">
            Join Our Global Learning Community
          </h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Connect with millions of learners worldwide, share your journey, and get inspired by success stories
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12">
          {/* Success Stories */}
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-semibold text-gray-900">Success Stories</h3>
              <Button variant="ghost" className="text-blue-600 hover:text-blue-700">
                View All Stories
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>

            <div className="space-y-6">
              {testimonials.map((testimonial) => (
                <Card key={testimonial.id} className="bg-white border-0 shadow-lg hover:shadow-xl transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={testimonial.avatar} alt={testimonial.name} />
                        <AvatarFallback>{testimonial.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <h4 className="font-semibold text-gray-900">{testimonial.name}</h4>
                            <p className="text-sm text-gray-600">{testimonial.role} • {testimonial.country}</p>
                          </div>
                          <div className="flex">
                            {[...Array(testimonial.rating)].map((_, i) => (
                              <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                            ))}
                          </div>
                        </div>
                        
                        <div className="relative mb-4">
                          <Quote className="absolute -top-2 -left-2 w-6 h-6 text-blue-200" />
                          <p className="text-gray-700 italic pl-4">"{testimonial.text}"</p>
                        </div>
                        
                        <div className="flex items-center gap-4">
                          <Badge variant="secondary" className="bg-green-100 text-green-800">
                            {testimonial.achievement}
                          </Badge>
                          <div className="text-sm text-gray-600">
                            {testimonial.beforeScore} → {testimonial.afterScore}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Community Forum Preview */}
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-semibold text-gray-900">Community Forum</h3>
              <Button variant="ghost" className="text-blue-600 hover:text-blue-700">
                View All Posts
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>

            <Card className="bg-white border-0 shadow-lg">
              <CardContent className="p-6">
                <div className="space-y-4">
                  {forumPosts.map((post, index) => (
                    <div key={index} className="flex items-center justify-between p-4 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900 hover:text-blue-600 transition-colors">
                          {post.title}
                        </h4>
                        <div className="flex items-center gap-3 mt-2 text-sm text-gray-600">
                          <span>by {post.author}</span>
                          <span>•</span>
                          <span>{post.time}</span>
                          <Badge variant="outline" className="text-xs">
                            {post.category}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1 text-sm text-gray-500">
                        <MessageCircle className="w-4 h-4" />
                        <span>{post.replies}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Community Stats */}
            <div className="grid grid-cols-2 gap-4">
              <Card className="bg-blue-600 text-white border-0">
                <CardContent className="p-6 text-center">
                  <Users className="w-8 h-8 mx-auto mb-2" />
                  <div className="text-2xl font-bold">2.5M+</div>
                  <div className="text-sm opacity-90">Active Members</div>
                </CardContent>
              </Card>
              
              <Card className="bg-green-600 text-white border-0">
                <CardContent className="p-6 text-center">
                  <MessageCircle className="w-8 h-8 mx-auto mb-2" />
                  <div className="text-2xl font-bold">50K+</div>
                  <div className="text-sm opacity-90">Daily Messages</div>
                </CardContent>
              </Card>
            </div>

            {/* Join CTA */}
            <Card className="bg-gradient-to-r from-purple-600 to-blue-600 text-white border-0">
              <CardContent className="p-6 text-center">
                <h4 className="text-xl font-semibold mb-2">Ready to Join the Community?</h4>
                <p className="text-sm opacity-90 mb-4">
                  Ask questions, share tips, and connect with learners worldwide
                </p>
                <Button size="lg" variant="secondary" className="bg-white text-purple-600 hover:bg-gray-100">
                  Join the Discussion
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}