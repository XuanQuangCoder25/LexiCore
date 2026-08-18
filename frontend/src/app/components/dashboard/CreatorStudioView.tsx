import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Separator } from "../ui/separator";
import {
  Plus,
  Edit,
  Trash2,
  Upload,
  Download,
  FileSpreadsheet,
  Globe,
  Lock,
  MoreHorizontal,
  BookOpen,
  Music,
  Video,
  Search,
  Eye,
  Users,
  CheckCircle2,
  AlertCircle,
  X,
} from "lucide-react";

interface Deck {
  id: number;
  name: string;
  description: string;
  cardCount: number;
  category: string;
  status: "draft" | "published";
  views: number;
  clones: number;
  createdAt: string;
}

interface Card_ {
  id: number;
  term: string;
  definition: string;
  hasAudio: boolean;
  hasVideo: boolean;
}

const mockDecks: Deck[] = [
  { id: 1, name: "IELTS Academic Vocabulary", description: "500 essential words for IELTS Band 7+", cardCount: 48, category: "Test Prep", status: "published", views: 1240, clones: 87, createdAt: "2024-01-15" },
  { id: 2, name: "Business English Phrases", description: "Common phrases for professional settings", cardCount: 32, category: "Business", status: "published", views: 890, clones: 45, createdAt: "2024-02-03" },
  { id: 3, name: "Phrasal Verbs Collection", description: "100 most common phrasal verbs with examples", cardCount: 100, category: "Grammar", status: "draft", views: 0, clones: 0, createdAt: "2024-03-10" },
  { id: 4, name: "Idioms & Expressions", description: "Native-level idioms for natural speech", cardCount: 75, category: "Speaking", status: "draft", views: 0, clones: 0, createdAt: "2024-03-18" },
];

const mockCards: Card_[] = [
  { id: 1, term: "Elaborate", definition: "To add more detail or explanation; complex and detailed", hasAudio: true, hasVideo: false },
  { id: 2, term: "Ubiquitous", definition: "Present, appearing, or found everywhere", hasAudio: true, hasVideo: false },
  { id: 3, term: "Mitigate", definition: "To make less severe, serious, or painful", hasAudio: false, hasVideo: true },
];

export function CreatorStudioView() {
  const [view, setView] = useState<"list" | "editor">("list");
  const [selectedDeck, setSelectedDeck] = useState<Deck | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showDeleteDialog, setShowDeleteDialog] = useState<number | null>(null);
  const [showCardEditor, setShowCardEditor] = useState(false);
  const [editingCard, setEditingCard] = useState<Card_ | null>(null);
  const [newTerm, setNewTerm] = useState("");
  const [newDefinition, setNewDefinition] = useState("");
  const [decks, setDecks] = useState(mockDecks);
  const [cards, setCards] = useState(mockCards);
  const [showNewDeckDialog, setShowNewDeckDialog] = useState(false);
  const [newDeckName, setNewDeckName] = useState("");
  const [newDeckDesc, setNewDeckDesc] = useState("");
  const [newDeckCategory, setNewDeckCategory] = useState("Vocabulary");

  const filtered = decks.filter((d) => d.name.toLowerCase().includes(searchQuery.toLowerCase()));

  const handleDelete = (id: number) => {
    setDecks((prev) => prev.filter((d) => d.id !== id));
    setShowDeleteDialog(null);
  };

  const handlePublishToggle = (id: number) => {
    setDecks((prev) =>
      prev.map((d) => d.id === id ? { ...d, status: d.status === "published" ? "draft" : "published" } : d)
    );
  };

  const handleOpenEditor = (deck: Deck) => {
    setSelectedDeck(deck);
    setView("editor");
  };

  const handleSaveCard = () => {
    if (!newTerm || !newDefinition) return;
    if (editingCard) {
      setCards((prev) => prev.map((c) => c.id === editingCard.id ? { ...c, term: newTerm, definition: newDefinition } : c));
    } else {
      setCards((prev) => [...prev, { id: Date.now(), term: newTerm, definition: newDefinition, hasAudio: false, hasVideo: false }]);
    }
    setNewTerm("");
    setNewDefinition("");
    setEditingCard(null);
    setShowCardEditor(false);
  };

  const handleCreateDeck = () => {
    if (!newDeckName) return;
    const newDeck: Deck = {
      id: Date.now(),
      name: newDeckName,
      description: newDeckDesc,
      cardCount: 0,
      category: newDeckCategory,
      status: "draft",
      views: 0,
      clones: 0,
      createdAt: new Date().toISOString().split("T")[0],
    };
    setDecks((prev) => [newDeck, ...prev]);
    setNewDeckName("");
    setNewDeckDesc("");
    setShowNewDeckDialog(false);
  };

  // --- DECK EDITOR ---
  if (view === "editor" && selectedDeck) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Button variant="ghost" onClick={() => setView("list")} className="mb-1 -ml-2">
              ← Back to Decks
            </Button>
            <h1 className="text-2xl font-bold">{selectedDeck.name}</h1>
            <p className="text-sm text-muted-foreground">{selectedDeck.description}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => handlePublishToggle(selectedDeck.id)}>
              {selectedDeck.status === "published" ? <Lock className="h-4 w-4 mr-2" /> : <Globe className="h-4 w-4 mr-2" />}
              {selectedDeck.status === "published" ? "Unpublish" : "Publish"}
            </Button>
            <Button onClick={() => { setEditingCard(null); setNewTerm(""); setNewDefinition(""); setShowCardEditor(true); }}>
              <Plus className="h-4 w-4 mr-2" /> Add Card
            </Button>
          </div>
        </div>

        {/* Bulk Actions */}
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline">
            <FileSpreadsheet className="h-4 w-4 mr-2" /> Import from Excel/CSV
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" /> Export Data
          </Button>
          <Button variant="outline">
            <Upload className="h-4 w-4 mr-2" /> Bulk Upload Audio
          </Button>
        </div>

        {/* Cards List */}
        <div className="space-y-2">
          {cards.map((card, idx) => (
            <Card key={card.id}>
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <span className="text-muted-foreground text-sm w-6 text-right shrink-0 pt-0.5">{idx + 1}</span>
                  <div className="flex-1 grid md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1 block">TERM</Label>
                      <p className="font-medium">{card.term}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1 block">DEFINITION</Label>
                      <p className="text-sm">{card.definition}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {card.hasAudio && <Music className="h-4 w-4 text-muted-foreground" />}
                    {card.hasVideo && <Video className="h-4 w-4 text-muted-foreground" />}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => { setEditingCard(card); setNewTerm(card.term); setNewDefinition(card.definition); setShowCardEditor(true); }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setCards((prev) => prev.filter((c) => c.id !== card.id))}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Add Card Drop Zone */}
          <Card className="border-dashed cursor-pointer" onClick={() => { setEditingCard(null); setNewTerm(""); setNewDefinition(""); setShowCardEditor(true); }}>
            <CardContent className="p-6 text-center">
              <Plus className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Click to add a new card</p>
            </CardContent>
          </Card>
        </div>

        {/* Card Editor Dialog */}
        <Dialog open={showCardEditor} onOpenChange={setShowCardEditor}>
          <DialogContent className="max-w-lg" aria-describedby={undefined}>
            <DialogHeader>
              <DialogTitle>{editingCard ? "Edit Card" : "Add New Card"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Term</Label>
                <Input value={newTerm} onChange={(e) => setNewTerm(e.target.value)} placeholder="Enter term or word..." className="mt-1" />
              </div>
              <div>
                <Label>Definition</Label>
                <Textarea value={newDefinition} onChange={(e) => setNewDefinition(e.target.value)} placeholder="Enter definition, example, or translation..." className="mt-1" rows={3} />
              </div>
              <Separator />
              <div>
                <Label className="text-sm text-muted-foreground">Media Attachments (optional)</Label>
                <div className="grid grid-cols-2 gap-3 mt-2">
                  <div className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:bg-muted/50 transition-colors">
                    <Music className="h-6 w-6 mx-auto mb-1 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">Upload Audio</p>
                    <p className="text-xs text-muted-foreground">.mp3, .wav</p>
                  </div>
                  <div className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:bg-muted/50 transition-colors">
                    <Video className="h-6 w-6 mx-auto mb-1 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">Upload Video</p>
                    <p className="text-xs text-muted-foreground">.mp4, .webm</p>
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCardEditor(false)}>Cancel</Button>
              <Button onClick={handleSaveCard} disabled={!newTerm || !newDefinition}>
                {editingCard ? "Save Changes" : "Add Card"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // --- DECK LIST ---
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Creator Studio</h1>
          <p className="text-muted-foreground">Build and manage your community decks</p>
        </div>
        <Button onClick={() => setShowNewDeckDialog(true)}>
          <Plus className="h-4 w-4 mr-2" /> New Deck
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total Decks</p>
            <p className="text-2xl font-bold">{decks.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Published</p>
            <p className="text-2xl font-bold">{decks.filter((d) => d.status === "published").length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total Views</p>
            <p className="text-2xl font-bold">{decks.reduce((a, d) => a + d.views, 0).toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total Clones</p>
            <p className="text-2xl font-bold">{decks.reduce((a, d) => a + d.clones, 0)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Bulk Actions */}
      <div className="flex gap-2 items-center flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search decks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Button variant="outline">
          <FileSpreadsheet className="h-4 w-4 mr-2" /> Import CSV
        </Button>
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" /> Export All
        </Button>
      </div>

      {/* Decks Table */}
      <Card>
        <CardContent className="p-0">
          <div className="divide-y">
            {filtered.map((deck) => (
              <div key={deck.id} className="flex items-center gap-4 p-4 hover:bg-muted/30 transition-colors">
                <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <BookOpen className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium truncate">{deck.name}</p>
                    <Badge variant={deck.status === "published" ? "default" : "secondary"} className="shrink-0 text-xs">
                      {deck.status === "published" ? <CheckCircle2 className="h-3 w-3 mr-1" /> : <AlertCircle className="h-3 w-3 mr-1" />}
                      {deck.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{deck.description}</p>
                </div>
                <div className="hidden md:flex items-center gap-6 text-sm text-muted-foreground shrink-0">
                  <span>{deck.cardCount} cards</span>
                  <div className="flex items-center gap-1">
                    <Eye className="h-4 w-4" /> {deck.views}
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4" /> {deck.clones}
                  </div>
                  <Badge variant="outline" className="text-xs">{deck.category}</Badge>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button size="sm" variant="outline" onClick={() => handleOpenEditor(deck)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="sm" variant="ghost">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handlePublishToggle(deck.id)}>
                        {deck.status === "published" ? <Lock className="h-4 w-4 mr-2" /> : <Globe className="h-4 w-4 mr-2" />}
                        {deck.status === "published" ? "Unpublish" : "Publish"}
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Download className="h-4 w-4 mr-2" /> Export
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => setShowDeleteDialog(deck.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation */}
      <Dialog open={showDeleteDialog !== null} onOpenChange={() => setShowDeleteDialog(null)}>
        <DialogContent className="max-w-sm" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>Delete Deck</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Are you sure you want to delete this deck? This action cannot be undone.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => showDeleteDialog && handleDelete(showDeleteDialog)}>
              <Trash2 className="h-4 w-4 mr-2" /> Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Deck Dialog */}
      <Dialog open={showNewDeckDialog} onOpenChange={setShowNewDeckDialog}>
        <DialogContent className="max-w-md" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>Create New Deck</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Deck Name</Label>
              <Input value={newDeckName} onChange={(e) => setNewDeckName(e.target.value)} placeholder="e.g. IELTS Vocabulary Pack" className="mt-1" />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={newDeckDesc} onChange={(e) => setNewDeckDesc(e.target.value)} placeholder="Short description of this deck..." className="mt-1" rows={2} />
            </div>
            <div>
              <Label>Category</Label>
              <Select value={newDeckCategory} onValueChange={setNewDeckCategory}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["Vocabulary", "Grammar", "Speaking", "Business", "Test Prep", "Other"].map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewDeckDialog(false)}>Cancel</Button>
            <Button onClick={handleCreateDeck} disabled={!newDeckName}>Create Deck</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
