import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import {
  MessageCircle,
  Users,
  Heart,
  Share,
  TrendingUp,
  Globe,
  Send,
  Pin,
  Clock,
  Reply,
  Search,
  Star,
  BookOpen,
  Download,
  Filter,
  Swords,
  Flame,
  Trophy,
  Crown,
  Medal,
} from "lucide-react";

const forumPosts = [
  {
    id: 1,
    title: "Best strategies for memorizing vocabulary?",
    author: { name: "Emma Wilson", avatar: "", level: "Intermediate" },
    content: "I'm struggling to remember new words I learn. What techniques do you use to make vocabulary stick?",
    category: "Vocabulary",
    replies: 23,
    likes: 15,
    time: "2 hours ago",
    isPinned: true,
  },
  {
    id: 2,
    title: "How to prepare for IELTS Speaking test?",
    author: { name: "Ahmed Hassan", avatar: "", level: "Advanced" },
    content: "My IELTS test is in 3 weeks. Any tips for the speaking section? I get really nervous!",
    category: "Test Prep",
    replies: 45,
    likes: 32,
    time: "4 hours ago",
    isPinned: false,
  },
  {
    id: 3,
    title: "Practice partner for daily conversations",
    author: { name: "Maria Rodriguez", avatar: "", level: "Beginner" },
    content: "Looking for someone to practice English conversations. I'm from Spain, UTC+1. Anyone interested?",
    category: "Speaking Practice",
    replies: 12,
    likes: 8,
    time: "6 hours ago",
    isPinned: false,
  },
];

const leaderboard = [
  { rank: 1, name: "Sarah Chen", points: 2847, initials: "SC", badge: "Grammar Master", streak: 34 },
  { rank: 2, name: "Alex Johnson", points: 2653, initials: "AJ", badge: "Vocabulary Expert", streak: 21 },
  { rank: 3, name: "Lisa Park", points: 2441, initials: "LP", badge: "Speaking Star", streak: 15 },
  { rank: 4, name: "You", points: 2138, initials: "SJ", badge: "Rising Star", streak: 7 },
  { rank: 5, name: "Tom Wright", points: 1982, initials: "TW", badge: "Consistent Learner", streak: 42 },
];

const studyGroups = [
  { name: "IELTS Warriors 2024", members: 156, description: "Preparing for IELTS together", category: "Test Prep", isJoined: true },
  { name: "Business English Network", members: 89, description: "Professional communication skills", category: "Business", isJoined: false },
  { name: "Conversation Club", members: 234, description: "Daily speaking practice sessions", category: "Speaking", isJoined: true },
];

const communityDecks = [
  { id: 1, name: "IELTS Academic Vocabulary", author: "Emma Wilson", cards: 500, rating: 4.8, clones: 2140, tags: ["IELTS", "Academic"], category: "Test Prep" },
  { id: 2, name: "Business English Phrases", author: "Alex Johnson", cards: 320, rating: 4.6, clones: 1340, tags: ["Business", "Professional"], category: "Business" },
  { id: 3, name: "Common Phrasal Verbs", author: "Lisa Park", cards: 200, rating: 4.9, clones: 3210, tags: ["Grammar", "Phrasal Verbs"], category: "Grammar" },
  { id: 4, name: "Daily Conversation Starters", author: "Ahmed Hassan", cards: 150, rating: 4.4, clones: 890, tags: ["Speaking", "Beginner"], category: "Speaking" },
  { id: 5, name: "TOEFL Vocabulary Set", author: "Maria Rodriguez", cards: 600, rating: 4.7, clones: 1780, tags: ["TOEFL", "Academic"], category: "Test Prep" },
  { id: 6, name: "Idioms & Fixed Expressions", author: "Tom Wright", cards: 250, rating: 4.5, clones: 1120, tags: ["Idioms", "Advanced"], category: "Advanced" },
];

const rankIcons = [Crown, Medal, Trophy];

export function CommunityView() {
  const [deckSearch, setDeckSearch] = useState("");
  const [deckCategory, setDeckCategory] = useState("all");
  const [likedPosts, setLikedPosts] = useState<number[]>([]);
  const [clonedDecks, setClonedDecks] = useState<number[]>([]);

  const filteredDecks = communityDecks.filter((d) => {
    const matchSearch = d.name.toLowerCase().includes(deckSearch.toLowerCase()) || d.author.toLowerCase().includes(deckSearch.toLowerCase());
    const matchCategory = deckCategory === "all" || d.category === deckCategory;
    return matchSearch && matchCategory;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Community</h1>
        <p className="text-muted-foreground">Connect with learners worldwide and share your journey</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Members</p>
                <p className="text-2xl font-bold">2.5M+</p>
              </div>
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Community Decks</p>
                <p className="text-2xl font-bold">18K+</p>
              </div>
              <BookOpen className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Study Groups</p>
                <p className="text-2xl font-bold">1,200+</p>
              </div>
              <Globe className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="marketplace" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="marketplace">Marketplace</TabsTrigger>
          <TabsTrigger value="forum">Forum</TabsTrigger>
          <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
          <TabsTrigger value="groups">Groups</TabsTrigger>
        </TabsList>

        {/* MARKETPLACE TAB */}
        <TabsContent value="marketplace" className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Search decks, authors..." value={deckSearch} onChange={(e) => setDeckSearch(e.target.value)} />
            </div>
            <Select value={deckCategory} onValueChange={setDeckCategory}>
              <SelectTrigger className="w-40">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                {["all", "Test Prep", "Business", "Grammar", "Speaking", "Advanced"].map((cat) => (
                  <SelectItem key={cat} value={cat}>{cat === "all" ? "All Categories" : cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredDecks.map((deck) => (
              <Card key={deck.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                      <BookOpen className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="flex items-center gap-0.5">
                      <Star className="h-4 w-4 fill-foreground text-foreground" />
                      <span className="text-sm font-bold">{deck.rating}</span>
                    </div>
                  </div>
                  <div>
                    <p className="font-semibold line-clamp-1">{deck.name}</p>
                    <p className="text-xs text-muted-foreground">by {deck.author}</p>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {deck.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                    ))}
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{deck.cards} cards</span>
                    <span className="flex items-center gap-1">
                      <Download className="h-3 w-3" /> {deck.clones.toLocaleString()}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant={clonedDecks.includes(deck.id) ? "outline" : "default"}
                    className="w-full"
                    onClick={() => setClonedDecks((prev) => prev.includes(deck.id) ? prev : [...prev, deck.id])}
                  >
                    {clonedDecks.includes(deck.id) ? (
                      <><BookOpen className="h-3.5 w-3.5 mr-1" /> In My Library</>
                    ) : (
                      <><Download className="h-3.5 w-3.5 mr-1" /> Clone Deck</>
                    )}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* FORUM TAB */}
        <TabsContent value="forum" className="space-y-6">
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <Card>
                <CardHeader><CardTitle>Start a Discussion</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <Input placeholder="What's your question or topic?" />
                  <Textarea placeholder="Share your thoughts, ask for help, or start a discussion..." />
                  <div className="flex justify-between items-center">
                    <div className="flex gap-2">
                      <Badge variant="outline">Vocabulary</Badge>
                      <Badge variant="outline">Grammar</Badge>
                    </div>
                    <Button><Send className="h-4 w-4 mr-2" /> Post</Button>
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-4">
                {forumPosts.map((post) => (
                  <Card key={post.id} className="hover:shadow-sm transition-shadow">
                    <CardContent className="p-5">
                      <div className="flex items-start gap-4">
                        <Avatar>
                          <AvatarFallback>{post.author.name.split(" ").map((n) => n[0]).join("")}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            {post.isPinned && <Pin className="h-3.5 w-3.5 text-muted-foreground" />}
                            <h3 className="font-semibold">{post.title}</h3>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                            <span className="font-medium text-foreground">{post.author.name}</span>
                            <Badge variant="outline" className="text-xs">{post.author.level}</Badge>
                            <Clock className="h-3 w-3" />
                            <span>{post.time}</span>
                            <Badge variant="secondary" className="text-xs">{post.category}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-3">{post.content}</p>
                          <div className="flex items-center gap-3">
                            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => setLikedPosts((p) => p.includes(post.id) ? p.filter((i) => i !== post.id) : [...p, post.id])}>
                              <Heart className={`h-3.5 w-3.5 mr-1 ${likedPosts.includes(post.id) ? "fill-foreground" : ""}`} />
                              {post.likes + (likedPosts.includes(post.id) ? 1 : 0)}
                            </Button>
                            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
                              <Reply className="h-3.5 w-3.5 mr-1" />{post.replies} replies
                            </Button>
                            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
                              <Share className="h-3.5 w-3.5 mr-1" /> Share
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <TrendingUp className="h-4 w-4" /> Trending
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {["#IELTSTips", "#VocabularyHacks", "#SpeakingPractice", "#GrammarHelp"].map((tag, i) => (
                    <div key={tag} className="flex items-center justify-between">
                      <span className="text-sm">{tag}</span>
                      <Badge variant="secondary" className="text-xs">{[45, 32, 28, 21][i]} posts</Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-base">Community Rules</CardTitle></CardHeader>
                <CardContent className="text-sm text-muted-foreground space-y-1.5">
                  <p>• Be respectful and supportive</p>
                  <p>• Help others learn and grow</p>
                  <p>• Share useful resources</p>
                  <p>• Use appropriate language</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* LEADERBOARD TAB */}
        <TabsContent value="leaderboard">
          <Card>
            <CardHeader><CardTitle>Weekly Leaderboard</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {leaderboard.map((user) => {
                  const isMe = user.name === "You";
                  const RankIcon = rankIcons[user.rank - 1];
                  return (
                    <div
                      key={user.rank}
                      className={`flex items-center gap-4 p-3 rounded-lg ${isMe ? "bg-muted border border-foreground/20 font-medium" : "hover:bg-muted/50"}`}
                    >
                      <div className="w-8 text-center">
                        {RankIcon ? (
                          <RankIcon className="h-5 w-5 mx-auto text-muted-foreground" />
                        ) : (
                          <span className="text-sm text-muted-foreground font-bold">#{user.rank}</span>
                        )}
                      </div>
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className="text-xs">{user.initials}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{user.name}{isMe && " (you)"}</p>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-muted-foreground">{user.badge}</span>
                          <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                            · <Flame className="h-3 w-3 text-orange-400" /> {user.streak}d
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{user.points.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">pts</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* GROUPS TAB */}
        <TabsContent value="groups">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {studyGroups.map((group, i) => (
              <Card key={i}>
                <CardHeader>
                  <CardTitle className="flex items-start justify-between gap-2 text-base">
                    <span>{group.name}</span>
                    <Badge variant="outline" className="shrink-0 text-xs">{group.category}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">{group.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground flex items-center gap-1">
                      <Users className="h-4 w-4" /> {group.members}
                    </span>
                    <Button size="sm" variant={group.isJoined ? "outline" : "default"}>
                      {group.isJoined ? "Joined" : "Join"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
