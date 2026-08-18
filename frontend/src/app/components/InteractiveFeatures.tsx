import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { 
  BookOpen, 
  Mic, 
  PenTool, 
  BarChart3, 
  MessageCircle, 
  Brain,
  ArrowRight,
  Play
} from "lucide-react";

const features = [
  {
    icon: BookOpen,
    title: "Vocabulary Builder",
    description: "Interactive flashcards and spaced repetition system to master new words effectively",
    color: "bg-blue-500",
    bgColor: "bg-blue-50",
    cta: "Try Vocabulary Quiz"
  },
  {
    icon: Mic,
    title: "Speaking Practice",
    description: "AI-powered pronunciation feedback and conversation practice with native speakers",
    color: "bg-green-500",
    bgColor: "bg-green-50",
    cta: "Start Speaking"
  },
  {
    icon: PenTool,
    title: "Grammar Lessons",
    description: "Step-by-step guides with interactive examples and real-world applications",
    color: "bg-orange-500",
    bgColor: "bg-orange-50",
    cta: "Learn Grammar"
  },
  {
    icon: BarChart3,
    title: "Progress Tracking",
    description: "Visual dashboards showing learning milestones and personalized recommendations",
    color: "bg-purple-500",
    bgColor: "bg-purple-50",
    cta: "View Progress"
  },
  {
    icon: MessageCircle,
    title: "Live Conversations",
    description: "Practice with native speakers and fellow learners in real-time chat sessions",
    color: "bg-pink-500",
    bgColor: "bg-pink-50",
    cta: "Join Chat"
  },
  {
    icon: Brain,
    title: "AI Tutor",
    description: "Personalized learning assistant that adapts to your pace and learning style",
    color: "bg-indigo-500",
    bgColor: "bg-indigo-50",
    cta: "Meet AI Tutor"
  }
];

export function InteractiveFeatures() {
  return (
    <section className="py-16 lg:py-20 bg-white">
      <div className="container mx-auto px-4 lg:px-6">
        {/* Header */}
        <div className="text-center space-y-4 mb-16">
          <h2 className="text-3xl md:text-4xl text-gray-900">
            Powerful Learning Tools
          </h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Experience interactive features designed to accelerate your English learning journey 
            with cutting-edge technology and proven teaching methods
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => {
            const IconComponent = feature.icon;
            return (
              <Card key={index} className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-2 border-0 shadow-lg">
                <CardContent className="p-8">
                  <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl ${feature.bgColor} mb-6 group-hover:scale-110 transition-transform duration-300`}>
                    <IconComponent className={`w-8 h-8 ${feature.color.replace('bg-', 'text-')}`} />
                  </div>
                  
                  <h3 className="text-xl font-semibold text-gray-900 mb-3 group-hover:text-blue-600 transition-colors">
                    {feature.title}
                  </h3>
                  
                  <p className="text-gray-600 mb-6 leading-relaxed">
                    {feature.description}
                  </p>
                  
                  <Button 
                    variant="ghost" 
                    className="p-0 h-auto text-blue-600 hover:text-blue-700 group/btn"
                  >
                    {feature.cta}
                    <ArrowRight className="w-4 h-4 ml-2 group-hover/btn:translate-x-1 transition-transform" />
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Demo Section */}
        <div className="mt-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 lg:p-12 text-center text-white">
          <h3 className="text-2xl md:text-3xl font-bold mb-4">
            See Our Features in Action
          </h3>
          <p className="text-lg mb-8 opacity-90 max-w-2xl mx-auto">
            Watch a quick demo to discover how our interactive tools can transform your English learning experience
          </p>
          <Button size="lg" variant="secondary" className="bg-white text-blue-600 hover:bg-gray-100">
            <Play className="w-5 h-5 mr-2" />
            Watch Demo Video
          </Button>
        </div>
      </div>
    </section>
  );
}