import { Button } from "./ui/button";
import { Play, BookOpen, Users, TrendingUp } from "lucide-react";
import { ImageWithFallback } from "./figma/ImageWithFallback";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-green-50 py-16 lg:py-24">
      <div className="container mx-auto px-4 lg:px-6">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="space-y-8">
            <div className="space-y-4">
              <h1 className="text-4xl md:text-5xl lg:text-6xl text-gray-900 leading-tight">
                Learn English{" "}
                <span className="text-blue-600">Anytime,</span>{" "}
                <span className="text-green-500">Anywhere</span>
              </h1>
              <p className="text-lg text-gray-600 max-w-xl">
                Interactive lessons, real-time progress tracking, and a supportive community. 
                Master English with our AI-powered platform trusted by millions of learners worldwide.
              </p>
            </div>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Button size="lg" className="bg-orange-500 hover:bg-orange-600 text-white px-8">
                Start Learning for Free
              </Button>
              <Button size="lg" variant="outline" className="border-gray-300">
                <Play className="w-4 h-4 mr-2" />
                Take Placement Test
              </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-8 pt-8 border-t border-gray-200">
              <div className="text-center">
                <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-lg mx-auto mb-2">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <div className="text-2xl font-bold text-gray-900">2M+</div>
                <div className="text-sm text-gray-600">Active Learners</div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center w-10 h-10 bg-green-100 rounded-lg mx-auto mb-2">
                  <BookOpen className="w-5 h-5 text-green-600" />
                </div>
                <div className="text-2xl font-bold text-gray-900">500+</div>
                <div className="text-sm text-gray-600">Lessons</div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center w-10 h-10 bg-orange-100 rounded-lg mx-auto mb-2">
                  <TrendingUp className="w-5 h-5 text-orange-600" />
                </div>
                <div className="text-2xl font-bold text-gray-900">95%</div>
                <div className="text-sm text-gray-600">Success Rate</div>
              </div>
            </div>
          </div>

          {/* Right Image */}
          <div className="relative">
            <div className="relative rounded-2xl overflow-hidden shadow-2xl">
              <ImageWithFallback
                src="https://images.unsplash.com/photo-1673515335807-ab07bcab4bc0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkaXZlcnNlJTIwc3R1ZGVudHMlMjBsZWFybmluZyUyMGVuZ2xpc2glMjBvbmxpbmV8ZW58MXx8fHwxNzU4NzU3NTEzfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
                alt="Students learning English online"
                className="w-full h-[500px] object-cover"
              />
              
              {/* Floating Stats Cards */}
              <div className="absolute top-4 right-4 bg-white/90 backdrop-blur rounded-lg p-3 shadow-lg">
                <div className="text-sm font-medium text-gray-900">Daily Progress</div>
                <div className="text-2xl font-bold text-green-600">+15%</div>
              </div>
              
              <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur rounded-lg p-3 shadow-lg">
                <div className="text-sm font-medium text-gray-900">Words Learned</div>
                <div className="text-2xl font-bold text-blue-600">1,247</div>
              </div>
            </div>

            {/* Background Decorations */}
            <div className="absolute -top-4 -right-4 w-24 h-24 bg-blue-500/20 rounded-full blur-xl"></div>
            <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-green-500/20 rounded-full blur-xl"></div>
          </div>
        </div>
      </div>
    </section>
  );
}