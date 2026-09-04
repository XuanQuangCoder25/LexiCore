import { useState } from "react";
import { motion } from "motion/react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Progress } from "../ui/progress";
import { Input } from "../ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { 
  Brain, 
  RotateCcw, 
  Volume2, 
  Eye, 
  EyeOff,
  CheckCircle,
  XCircle,
  Plus,
  Search,
  BookOpen,
  Clock,
  Target,
  TrendingUp,
  Shuffle
} from "lucide-react";

const flashcardDecks = [
  {
    id: 1,
    title: "IELTS Vocabulary",
    description: "Essential words for IELTS preparation",
    totalCards: 250,
    studiedCards: 180,
    masteredCards: 120,
    newCards: 70,
    reviewCards: 60,
    difficulty: "Advanced",
    category: "Test Prep",
    color: "bg-blue-500"
  },
  {
    id: 2,
    title: "Business English",
    description: "Professional vocabulary for workplace",
    totalCards: 180,
    studiedCards: 145,
    masteredCards: 98,
    newCards: 35,
    reviewCards: 47,
    difficulty: "Intermediate",
    category: "Business",
    color: "bg-green-500"
  },
  {
    id: 3,
    title: "Daily Conversations",
    description: "Common phrases for everyday situations",
    totalCards: 120,
    studiedCards: 95,
    masteredCards: 75,
    newCards: 25,
    reviewCards: 20,
    difficulty: "Beginner",
    category: "Speaking",
    color: "bg-purple-500"
  },
  {
    id: 4,
    title: "Academic Writing",
    description: "Advanced vocabulary for academic papers",
    totalCards: 200,
    studiedCards: 45,
    masteredCards: 20,
    newCards: 155,
    reviewCards: 25,
    difficulty: "Advanced",
    category: "Writing",
    color: "bg-orange-500"
  }
];

const studySession = {
  currentCard: {
    word: "Serendipity",
    phonetic: "/ˌser.ənˈdɪp.ə.ti/",
    partOfSpeech: "noun",
    definition: "The occurrence and development of events by chance in a happy or beneficial way",
    example: "A fortunate stroke of serendipity brought the two old friends together at the airport.",
    synonyms: ["chance", "fortune", "luck"],
    difficulty: "Advanced"
  },
  deckName: "IELTS Vocabulary",
  cardNumber: 15,
  totalCards: 30,
  showAnswer: false
};

export function FlashcardsView() {
  const [currentView, setCurrentView] = useState<"overview" | "study">("overview");
  const [showAnswer, setShowAnswer] = useState(false);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);

  const handleStudyDeck = (deckId: number) => {
    setCurrentView("study");
    setShowAnswer(false);
    setCurrentCardIndex(0);
  };

  const handleFlip = () => {
    setShowAnswer(!showAnswer);
  };

  const handleNext = async (quality: number) => {
    try {
      await fetch("http://localhost:5000/api/v1/srs/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cardId: "609d20194a5c543f88f11111", // Valid ObjectId format
          quality: quality
        })
      });
      setShowAnswer(false);
      setCurrentCardIndex(prev => prev + 1);
    } catch (error) {
      console.error("Lỗi khi update Flashcard:", error);
    }
  };

  const handleBackToOverview = () => {
    setCurrentView("overview");
    setShowAnswer(false);
  };

  if (currentView === "study") {
    return (
      <div className="space-y-6">
        {/* Study Header */}
        <div className="flex items-center justify-between">
          <div>
            <Button variant="ghost" onClick={handleBackToOverview} className="mb-2">
              ← Back to Decks
            </Button>
            <h1 className="text-3xl font-bold">{studySession.deckName}</h1>
            <p className="text-muted-foreground">
              Card {studySession.cardNumber} of {studySession.totalCards}
            </p>
          </div>
          <div className="text-right">
            <Badge className="mb-2">{studySession.currentCard.difficulty}</Badge>
            <div className="w-32">
              <Progress 
                value={(studySession.cardNumber / studySession.totalCards) * 100} 
                className="h-2" 
              />
            </div>
          </div>
        </div>

        {/* Flashcard */}
        <div className="flex justify-center perspective-1000">
          <motion.div 
            className="w-full max-w-2xl h-96 cursor-pointer relative"
            onClick={handleFlip}
            animate={{ rotateX: showAnswer ? 180 : 0 }}
            transition={{ duration: 0.6, type: "spring", stiffness: 260, damping: 20 }}
            style={{ transformStyle: "preserve-3d" }}
          >
            {/* Front of card */}
            <Card className="absolute w-full h-full" style={{ backfaceVisibility: "hidden" }}>
              <CardContent className="p-8 h-full flex flex-col justify-center items-center text-center">
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <h2 className="text-4xl font-bold">
                        {studySession.currentCard.word}
                      </h2>
                      <p className="text-lg text-muted-foreground">
                        {studySession.currentCard.phonetic}
                      </p>
                      <Badge variant="outline" className="text-sm">
                        {studySession.currentCard.partOfSpeech}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center justify-center gap-2 text-muted-foreground">
                      <Eye className="h-4 w-4" />
                      <span className="text-sm">Click to reveal definition</span>
                    </div>
                    
                    <Button variant="ghost" size="sm">
                      <Volume2 className="h-4 w-4 mr-2" />
                      Pronounce
                    </Button>
                  </div>
              </CardContent>
            </Card>

            {/* Back of card */}
            <Card 
              className="absolute w-full h-full"
              style={{ backfaceVisibility: "hidden", transform: "rotateX(180deg)" }}
            >
              <CardContent className="p-8 h-full flex flex-col justify-center items-center text-center">
                  <div className="space-y-6 w-full max-w-md">
                    <div className="space-y-4">
                      <h3 className="text-2xl font-bold">
                        {studySession.currentCard.word}
                      </h3>
                      
                      <div className="text-left space-y-3">
                        <div>
                          <h4 className="font-semibold mb-1">Definition:</h4>
                          <p className="text-muted-foreground">
                            {studySession.currentCard.definition}
                          </p>
                        </div>
                        
                        <div>
                          <h4 className="font-semibold mb-1">Example:</h4>
                          <p className="text-muted-foreground italic">
                            "{studySession.currentCard.example}"
                          </p>
                        </div>
                        
                        <div>
                          <h4 className="font-semibold mb-1">Synonyms:</h4>
                          <div className="flex gap-2">
                            {studySession.currentCard.synonyms.map((synonym, index) => (
                              <Badge key={index} variant="secondary">
                                {synonym}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-center gap-2 text-muted-foreground">
                      <EyeOff className="h-4 w-4" />
                      <span className="text-sm">Click to hide definition</span>
                    </div>
                  </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Study Controls */}
        {showAnswer && (
          <div className="flex justify-center">
            <div className="flex gap-4">
              <Button 
                variant="outline" 
                onClick={() => handleNext(0)}
              >
                <XCircle className="h-4 w-4 mr-2 text-red-500" />
                Again (0)
              </Button>
              <Button 
                variant="outline" 
                onClick={() => handleNext(2)}
              >
                <Clock className="h-4 w-4 mr-2 text-orange-500" />
                Hard (2)
              </Button>
              <Button 
                variant="outline" 
                onClick={() => handleNext(4)}
              >
                <CheckCircle className="h-4 w-4 mr-2 text-blue-500" />
                Good (4)
              </Button>
              <Button 
                variant="outline" 
                onClick={() => handleNext(5)}
              >
                <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                Easy (5)
              </Button>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="flex justify-center gap-2">
          <Button variant="ghost" size="sm">
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset Card
          </Button>
          <Button variant="ghost" size="sm">
            <Shuffle className="h-4 w-4 mr-2" />
            Shuffle Deck
          </Button>
          <Button variant="ghost" size="sm">
            <Volume2 className="h-4 w-4 mr-2" />
            Auto-play Audio
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Flashcards</h1>
        <p className="text-muted-foreground">Master vocabulary with spaced repetition</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Cards to Review</p>
                <p className="text-2xl font-bold">152</p>
              </div>
              <Clock className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">New Cards</p>
                <p className="text-2xl font-bold">285</p>
              </div>
              <Plus className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Mastered</p>
                <p className="text-2xl font-bold">313</p>
              </div>
              <CheckCircle className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Study Streak</p>
                <p className="text-2xl font-bold">12 days</p>
              </div>
              <TrendingUp className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input 
            placeholder="Search flashcard decks..." 
            className="pl-10"
          />
        </div>
        <Button variant="outline">
          <Plus className="h-4 w-4 mr-2" />
          Create Deck
        </Button>
      </div>

      {/* Flashcard Decks */}
      <Tabs defaultValue="my-decks" className="space-y-6">
        <TabsList>
          <TabsTrigger value="my-decks">My Decks</TabsTrigger>
          <TabsTrigger value="discover">Discover</TabsTrigger>
          <TabsTrigger value="statistics">Statistics</TabsTrigger>
        </TabsList>

        <TabsContent value="my-decks" className="space-y-6">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {flashcardDecks.map((deck) => (
              <Card key={deck.id} className="hover:shadow-lg transition-all duration-300 group">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className={`p-2 rounded-lg ${deck.color} bg-opacity-10`}>
                      <Brain className={`h-6 w-6 ${deck.color.replace('bg-', 'text-')}`} />
                    </div>
                    <Badge variant="outline">{deck.difficulty}</Badge>
                  </div>
                  <CardTitle className="group-hover:text-primary transition-colors">
                    {deck.title}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">{deck.description}</p>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Progress</span>
                      <span>{Math.round((deck.masteredCards / deck.totalCards) * 100)}%</span>
                    </div>
                    <Progress 
                      value={(deck.masteredCards / deck.totalCards) * 100} 
                      className="h-2" 
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                      <p className="text-lg font-bold text-blue-600">{deck.newCards}</p>
                      <p className="text-xs text-muted-foreground">New</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-orange-600">{deck.reviewCards}</p>
                      <p className="text-xs text-muted-foreground">Review</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button 
                      className="flex-1" 
                      onClick={() => handleStudyDeck(deck.id)}
                    >
                      <BookOpen className="h-4 w-4 mr-2" />
                      Study Now
                    </Button>
                    <Button variant="outline" size="sm">
                      <Target className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="discover" className="space-y-6">
          <div className="text-center py-12">
            <Brain className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="font-semibold mb-2">Discover New Decks</h3>
            <p className="text-muted-foreground mb-4">
              Browse thousands of flashcard decks created by the community
            </p>
            <Button>
              <Search className="h-4 w-4 mr-2" />
              Browse Public Decks
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="statistics" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Study Time This Week</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Monday</span>
                    <span className="text-sm font-medium">25 min</span>
                  </div>
                  <Progress value={75} className="h-2" />
                  <div className="flex justify-between">
                    <span className="text-sm">Tuesday</span>
                    <span className="text-sm font-medium">18 min</span>
                  </div>
                  <Progress value={54} className="h-2" />
                  <div className="flex justify-between">
                    <span className="text-sm">Wednesday</span>
                    <span className="text-sm font-medium">32 min</span>
                  </div>
                  <Progress value={96} className="h-2" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Learning Statistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span>Cards reviewed today</span>
                  <Badge className="bg-green-100 text-green-800">47</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span>Average accuracy</span>
                  <Badge className="bg-blue-100 text-blue-800">87%</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span>Words learned this month</span>
                  <Badge className="bg-purple-100 text-purple-800">156</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}