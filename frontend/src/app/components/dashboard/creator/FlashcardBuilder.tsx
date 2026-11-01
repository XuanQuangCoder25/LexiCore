import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Textarea } from '../../ui/textarea';
import { Switch } from '../../ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { toast } from 'sonner';
import { creatorService } from '../../../services/creator-service';
import { BulkImportModal, type ParsedCard } from './BulkImportModal';
import { PublishRestrictedModal } from './PublishRestrictedModal';
import { 
  ArrowLeft, 
  Save, 
  Globe, 
  Lock, 
  Plus, 
  Copy, 
  Trash2, 
  ChevronUp, 
  ChevronDown, 
  Volume2, 
  Sparkles, 
  RotateCw, 
  Layers, 
  Settings2, 
  FileSpreadsheet, 
  CheckCircle2, 
  Eye, 
  EyeOff,
  Image as ImageIcon,
  Tag
} from 'lucide-react';

interface FlashcardBuilderProps {
  deckId?: string | null;
  onBack: () => void;
  userRole?: string;
  onNavigateTab?: (tab: string) => void;
}

export interface CardState {
  id: string; // Real or temp ID
  front: string;
  back: string;
  partOfSpeech: string;
  phonetic: string;
  audioUrl: string;
  example: string;
  exampleMeaning: string;
  synonyms: string[];
  note: string;
  imageUrl: string;
  order: number;
}

export const FlashcardBuilder: React.FC<FlashcardBuilderProps> = ({
  deckId,
  onBack,
  userRole = 'user',
  onNavigateTab
}) => {
  const isCreatorOrAdmin = userRole.toLowerCase() === 'content_creator' || userRole.toLowerCase() === 'admin';

  // Deck metadata
  const [deckTitle, setDeckTitle] = useState('');
  const [deckDesc, setDeckDesc] = useState('');
  const [deckThumb, setDeckThumb] = useState('');
  const [deckLevel, setDeckLevel] = useState<string>('B1');
  const [deckTags, setDeckTags] = useState<string[]>(['#Vocabulary', '#English']);
  const [newTagInput, setNewTagInput] = useState('');
  const [allowClone, setAllowClone] = useState(true);
  const [isPublished, setIsPublished] = useState(false);

  // Cards state
  const [cards, setCards] = useState<CardState[]>([]);
  const [activeCardIndex, setActiveCardIndex] = useState<number>(0);
  const [isPreviewFlipped, setIsPreviewFlipped] = useState(false);
  const [showPreviewPane, setShowPreviewPane] = useState(true);
  const [showMetaSettings, setShowMetaSettings] = useState(false);

  // Modals & Loading
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);

  // Fetch existing deck if deckId provided
  useEffect(() => {
    if (deckId) {
      loadDeckData(deckId);
    } else {
      // Initialize with 2 empty sample cards
      setCards([
        {
          id: `tmp_${Date.now()}_1`,
          front: '',
          back: '',
          partOfSpeech: 'noun',
          phonetic: '',
          audioUrl: '',
          example: '',
          exampleMeaning: '',
          synonyms: [],
          note: '',
          imageUrl: '',
          order: 0
        },
        {
          id: `tmp_${Date.now()}_2`,
          front: '',
          back: '',
          partOfSpeech: 'adjective',
          phonetic: '',
          audioUrl: '',
          example: '',
          exampleMeaning: '',
          synonyms: [],
          note: '',
          imageUrl: '',
          order: 1
        }
      ]);
    }
  }, [deckId]);

  const loadDeckData = async (id: string) => {
    setIsLoading(true);
    try {
      const res = await creatorService.getDeckById(id);
      if (res.success && res.data) {
        const { deck, cards: fetchedCards } = res.data;
        setDeckTitle(deck.title || '');
        setDeckDesc(deck.description || '');
        setDeckThumb(deck.thumbnail || '');
        setDeckLevel(deck.level || 'ALL');
        setDeckTags(deck.tags?.length ? deck.tags : ['#Vocabulary']);
        setAllowClone(deck.allowClone !== false);
        setIsPublished(Boolean(deck.isPublished));

        if (Array.isArray(fetchedCards) && fetchedCards.length > 0) {
          setCards(
            fetchedCards.map((c: any, idx: number) => ({
              id: c._id || `tmp_${Date.now()}_${idx}`,
              front: c.front || '',
              back: c.back || '',
              partOfSpeech: c.partOfSpeech || 'noun',
              phonetic: c.phonetic || '',
              audioUrl: c.audioUrl || '',
              example: c.example || '',
              exampleMeaning: c.exampleMeaning || '',
              synonyms: c.synonyms || [],
              note: c.note || '',
              imageUrl: c.imageUrl || '',
              order: typeof c.order === 'number' ? c.order : idx
            }))
          );
        }
      }
    } catch (error) {
      toast.error('Không thể tải dữ liệu bộ thẻ');
    } finally {
      setIsLoading(false);
    }
  };

  // TTS Speaker helper
  const speakWord = (text: string) => {
    if (!text || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    window.speechSynthesis.speak(utterance);
  };

  // Card Operations
  const handleUpdateCard = (index: number, updates: Partial<CardState>) => {
    setCards((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...updates };
      return next;
    });
    setIsDirty(true);
  };

  const handleAddCard = (insertAfterIndex?: number) => {
    const newCard: CardState = {
      id: `tmp_${Date.now()}`,
      front: '',
      back: '',
      partOfSpeech: 'noun',
      phonetic: '',
      audioUrl: '',
      example: '',
      exampleMeaning: '',
      synonyms: [],
      note: '',
      imageUrl: '',
      order: cards.length
    };

    setCards((prev) => {
      const targetIdx = insertAfterIndex !== undefined ? insertAfterIndex + 1 : prev.length;
      const next = [...prev];
      next.splice(targetIdx, 0, newCard);
      return next.map((c, i) => ({ ...c, order: i }));
    });

    const targetIdx = insertAfterIndex !== undefined ? insertAfterIndex + 1 : cards.length;
    setActiveCardIndex(targetIdx);
    setIsDirty(true);
  };

  const handleDuplicateCard = (index: number) => {
    const source = cards[index];
    const cloned: CardState = {
      ...source,
      id: `tmp_${Date.now()}`,
      front: `${source.front} (Copy)`,
      order: index + 1
    };

    setCards((prev) => {
      const next = [...prev];
      next.splice(index + 1, 0, cloned);
      return next.map((c, i) => ({ ...c, order: i }));
    });
    setActiveCardIndex(index + 1);
    setIsDirty(true);
    toast.success('Đã nhân bản thẻ');
  };

  const handleDeleteCard = (index: number) => {
    if (cards.length <= 1) {
      toast.error('Bộ thẻ cần có ít nhất 1 thẻ.');
      return;
    }
    setCards((prev) => {
      const next = prev.filter((_, i) => i !== index).map((c, i) => ({ ...c, order: i }));
      return next;
    });
    setActiveCardIndex((prev) => Math.min(prev, cards.length - 2));
    setIsDirty(true);
    toast.success('Đã xóa thẻ');
  };

  const handleMoveCard = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= cards.length) return;

    setCards((prev) => {
      const next = [...prev];
      const temp = next[index];
      next[index] = next[targetIdx];
      next[targetIdx] = temp;
      return next.map((c, i) => ({ ...c, order: i }));
    });
    setActiveCardIndex(targetIdx);
    setIsDirty(true);
  };

  // Bulk Import handler
  const handleBulkImport = (parsedCards: ParsedCard[], mode: 'append' | 'replace') => {
    const mappedCards: CardState[] = parsedCards.map((c, i) => ({
      id: `tmp_${Date.now()}_${i}`,
      front: c.front,
      back: c.back,
      partOfSpeech: c.partOfSpeech || 'noun',
      phonetic: c.phonetic || '',
      audioUrl: c.audioUrl || '',
      example: c.example || '',
      exampleMeaning: c.exampleMeaning || '',
      synonyms: c.synonyms || [],
      note: c.note || '',
      imageUrl: c.imageUrl || '',
      order: i
    }));

    if (mode === 'replace') {
      setCards(mappedCards.map((c, idx) => ({ ...c, order: idx })));
      setActiveCardIndex(0);
    } else {
      setCards((prev) => [...prev, ...mappedCards].map((c, idx) => ({ ...c, order: idx })));
    }
    setIsDirty(true);
  };

  // Tag Management
  const handleAddTag = () => {
    if (!newTagInput.trim()) return;
    const clean = newTagInput.startsWith('#') ? newTagInput.trim() : `#${newTagInput.trim()}`;
    if (!deckTags.includes(clean)) {
      setDeckTags([...deckTags, clean]);
    }
    setNewTagInput('');
    setIsDirty(true);
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setDeckTags(deckTags.filter((t) => t !== tagToRemove));
    setIsDirty(true);
  };

  // Save Deck Atomic
  const handleSaveDeck = async (targetPublishState?: boolean) => {
    if (!deckTitle.trim()) {
      toast.error('Vui lòng nhập tiêu đề cho bộ thẻ!');
      return;
    }

    const publishToSet = targetPublishState !== undefined ? targetPublishState : isPublished;

    // Phân quyền xuất bản
    if (publishToSet && !isCreatorOrAdmin) {
      setShowPublishModal(true);
      return;
    }

    // Validate ít nhất 1 thẻ hợp lệ
    const validCards = cards.filter((c) => c.front.trim() && c.back.trim());
    if (publishToSet && validCards.length === 0) {
      toast.error('Cần có ít nhất 1 thẻ có đầy đủ Mặt trước và Mặt sau để xuất bản!');
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        deck: {
          id: deckId || undefined,
          title: deckTitle.trim(),
          description: deckDesc.trim(),
          thumbnail: deckThumb.trim(),
          level: deckLevel,
          tags: deckTags,
          allowClone,
          isPublished: publishToSet
        },
        cards: validCards.map((c, idx) => ({
          id: c.id.startsWith('tmp_') ? undefined : c.id,
          front: c.front.trim(),
          back: c.back.trim(),
          partOfSpeech: c.partOfSpeech,
          phonetic: c.phonetic.trim(),
          audioUrl: c.audioUrl.trim(),
          example: c.example.trim(),
          exampleMeaning: c.exampleMeaning.trim(),
          synonyms: c.synonyms,
          note: c.note.trim(),
          imageUrl: c.imageUrl.trim(),
          order: idx
        }))
      };

      const res = await creatorService.saveFullDeck(payload);
      if (res.success && res.data) {
        setIsPublished(publishToSet);
        setIsDirty(false);
        toast.success(
          publishToSet
            ? 'Đã xuất bản bộ thẻ thành công ra Cộng đồng!'
            : 'Đã lưu bộ thẻ an toàn vào Private Space!'
        );
        onBack();
      }
    } catch (error: any) {
      if (error?.response?.status === 403 && error?.response?.data?.requires_creator) {
        setShowPublishModal(true);
      } else {
        toast.error(error?.response?.data?.message || 'Lỗi khi lưu bộ thẻ');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const activeCard = cards[activeCardIndex] || cards[0];

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-24 space-y-4">
        <div className="w-10 h-10 border-4 border-zinc-900 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-zinc-500 text-sm">Đang tải bộ thẻ từ vựng...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* ---------------- 1. TOP HEADER BAR ---------------- */}
      <div className="sticky top-0 z-30 backdrop-blur-md bg-white/90 border-b border-zinc-200/80 pb-4 pt-2 -mx-4 px-4 sm:-mx-6 sm:px-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack} className="gap-1.5 text-zinc-600 hover:text-zinc-900 rounded-xl hover:bg-zinc-100">
            <ArrowLeft className="w-4 h-4" /> Quay lại
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight line-clamp-1 text-zinc-900">
                {deckTitle || 'Tạo Bộ Thẻ Mới'}
              </h1>
              <Badge variant={isPublished ? 'default' : 'secondary'} className="text-[11px] gap-1 rounded-full border-zinc-200">
                {isPublished ? <Globe className="w-3 h-3 text-emerald-600" /> : <Lock className="w-3 h-3 text-zinc-500" />}
                {isPublished ? 'Công khai' : 'Private (Bản nháp)'}
              </Badge>
              {isDirty && (
                <span className="w-2 h-2 rounded-full bg-amber-500" title="Chưa lưu thay đổi" />
              )}
            </div>
            <p className="text-xs text-zinc-500">
              {cards.length} thẻ từ vựng • Cấp độ {deckLevel}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowBulkImport(true)}
            className="gap-1.5 border-dashed border-zinc-300 text-zinc-800 hover:border-zinc-900 hover:bg-zinc-50 rounded-xl transition-all"
          >
            <FileSpreadsheet className="w-4 h-4" /> Nhập hàng loạt
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPreviewPane(!showPreviewPane)}
            className="gap-1.5 rounded-xl border-zinc-200 hover:bg-zinc-50 text-zinc-700"
          >
            {showPreviewPane ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            {showPreviewPane ? 'Ẩn xem thử' : 'Hiện xem thử'}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => handleSaveDeck(false)}
            disabled={isSaving}
            className="gap-1.5 rounded-xl border-zinc-200 hover:bg-zinc-50 text-zinc-800"
          >
            <Save className="w-4 h-4" /> Lưu bản nháp
          </Button>

          <Button
            size="sm"
            onClick={() => handleSaveDeck(true)}
            disabled={isSaving}
            className="gap-1.5 bg-[#161616] hover:bg-black text-white shadow-xs rounded-xl active:scale-[0.99] transition-all duration-200"
          >
            <Globe className="w-4 h-4" /> {isPublished ? 'Cập nhật Công khai' : 'Xuất bản ra Cộng đồng'}
          </Button>
        </div>
      </div>

      {/* ---------------- 2. DECK METADATA SECTION ---------------- */}
      <Card className="border-zinc-200/80 shadow-xs rounded-2xl overflow-hidden bg-white">
        <CardHeader className="py-4 px-6 bg-zinc-50/80 border-b border-zinc-200/80 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings2 className="w-4 h-4 text-zinc-700" />
            <CardTitle className="text-sm font-semibold text-zinc-900">Thông Tin Bộ Thẻ (Deck Information)</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowMetaSettings(!showMetaSettings)}
            className="text-xs text-zinc-500 hover:text-zinc-900 h-8 rounded-lg"
          >
            {showMetaSettings ? 'Thu gọn' : 'Chỉnh sửa chi tiết'}
          </Button>
        </CardHeader>

        <CardContent className="p-6 space-y-4">
          <div className="grid md:grid-cols-3 gap-4">
            <div className="md:col-span-2 space-y-1.5">
              <Label htmlFor="deck-title" className="text-xs font-semibold">
                Tên bộ thẻ <span className="text-destructive">*</span>
              </Label>
              <Input
                id="deck-title"
                placeholder="Ví dụ: 300 Từ Vựng Cốt Lõi Oxford B2..."
                value={deckTitle}
                onChange={(e) => { setDeckTitle(e.target.value); setIsDirty(true); }}
                className="font-medium"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="deck-level" className="text-xs font-semibold">
                Trình độ (CEFR Level)
              </Label>
              <Select value={deckLevel} onValueChange={(val) => { setDeckLevel(val); setIsDirty(true); }}>
                <SelectTrigger id="deck-level">
                  <SelectValue placeholder="Chọn trình độ" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All Levels">All Levels (Tất cả)</SelectItem>
                  <SelectItem value="A1">A1 - Sơ cấp</SelectItem>
                  <SelectItem value="A2">A2 - Tiền trung cấp</SelectItem>
                  <SelectItem value="B1">B1 - Trung cấp</SelectItem>
                  <SelectItem value="B2">B2 - Trung cấp cao</SelectItem>
                  <SelectItem value="C1">C1 - Cao cấp</SelectItem>
                  <SelectItem value="C2">C2 - Thành thạo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {showMetaSettings && (
            <div className="space-y-4 pt-2 border-t animate-in fade-in duration-200">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="deck-desc" className="text-xs font-semibold">
                    Mô tả bộ thẻ
                  </Label>
                  <Textarea
                    id="deck-desc"
                    rows={3}
                    placeholder="Giới thiệu mục tiêu học tập, chủ đề của bộ từ vựng..."
                    value={deckDesc}
                    onChange={(e) => { setDeckDesc(e.target.value); setIsDirty(true); }}
                    className="text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="deck-thumb" className="text-xs font-semibold">
                    Ảnh bìa đại diện (Thumbnail URL)
                  </Label>
                  <div className="flex gap-3">
                    <Input
                      id="deck-thumb"
                      placeholder="https://images.unsplash.com/..."
                      value={deckThumb}
                      onChange={(e) => { setDeckThumb(e.target.value); setIsDirty(true); }}
                      className="text-xs flex-1"
                    />
                    {deckThumb && (
                      <div className="w-16 h-10 rounded border overflow-hidden shrink-0">
                        <img src={deckThumb} alt="Preview" className="w-full h-full object-cover" />
                      </div>
                    )}
                  </div>

                  {/* Allow Clone Switch */}
                  <div className="pt-3 flex items-center justify-between p-3 rounded-xl bg-muted/30 border">
                    <div className="space-y-0.5">
                      <Label htmlFor="allow-clone-switch" className="text-xs font-semibold cursor-pointer">
                        Cho phép cộng đồng sao chép (Clone Deck)
                      </Label>
                      <p className="text-[11px] text-muted-foreground">
                        Học viên khác có thể lưu bộ thẻ này về Private Space của họ khi chia sẻ lên Community.
                      </p>
                    </div>
                    <Switch
                      id="allow-clone-switch"
                      checked={allowClone}
                      onCheckedChange={(checked) => { setAllowClone(checked); setIsDirty(true); }}
                    />
                  </div>
                </div>
              </div>

              {/* Tags */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Nhãn chủ đề (Tags)</Label>
                <div className="flex items-center gap-2 flex-wrap">
                  {deckTags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="gap-1 text-xs">
                      {tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="text-muted-foreground hover:text-foreground font-bold"
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                  <div className="flex items-center gap-1.5">
                    <Input
                      placeholder="#IELTS, #TOEIC..."
                      value={newTagInput}
                      onChange={(e) => setNewTagInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddTag(); } }}
                      className="h-7 w-32 text-xs"
                    />
                    <Button type="button" variant="outline" size="sm" onClick={handleAddTag} className="h-7 text-xs">
                      + Thêm tag
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ---------------- 3. MAIN WORKSPACE: CARDS & LIVE PREVIEW ---------------- */}
      <div className={`grid gap-6 ${showPreviewPane ? 'lg:grid-cols-12' : 'grid-cols-1'}`}>
        {/* Left / Center: Cards Editor List */}
        <div className={`${showPreviewPane ? 'lg:col-span-7 xl:col-span-8' : 'col-span-1'} space-y-4`}>
          <div className="flex items-center justify-between pb-1">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-zinc-900" />
              <h2 className="text-base font-bold text-zinc-900">Danh Sách Thẻ Từ Vựng ({cards.length})</h2>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleAddCard()}
              className="gap-1.5 text-xs text-zinc-900 border-zinc-200 hover:border-zinc-900 hover:bg-zinc-50 rounded-xl transition-all"
            >
              <Plus className="w-3.5 h-3.5" /> Thêm thẻ mới
            </Button>
          </div>

          {/* Cards Loop */}
          <div className="space-y-4">
            {cards.map((card, idx) => {
              const isActive = activeCardIndex === idx;

              return (
                <Card
                  key={card.id || idx}
                  onClick={() => setActiveCardIndex(idx)}
                  className={`transition-all duration-200 rounded-2xl overflow-hidden border ${
                    isActive
                      ? 'border-zinc-900 shadow-sm ring-2 ring-zinc-900/5 bg-white'
                      : 'border-zinc-200/80 hover:border-zinc-300 bg-white'
                  }`}
                >
                  <CardHeader className="py-3 px-4 bg-zinc-50/70 border-b border-zinc-200/80 flex flex-row items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-zinc-100 text-zinc-900 border border-zinc-200/80 font-bold text-xs flex items-center justify-center shadow-xs">
                        {idx + 1}
                      </span>
                      <span className="text-xs font-semibold text-zinc-900 truncate max-w-[200px]">
                        {card.front || 'Chưa nhập từ vựng'}
                      </span>
                      {card.partOfSpeech && (
                        <Badge variant="outline" className="text-[10px] font-normal capitalize py-0 px-1.5">
                          {card.partOfSpeech}
                        </Badge>
                      )}
                    </div>

                    {/* Action buttons on card header */}
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        disabled={idx === 0}
                        onClick={(e) => { e.stopPropagation(); handleMoveCard(idx, 'up'); }}
                        title="Di chuyển lên"
                      >
                        <ChevronUp className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        disabled={idx === cards.length - 1}
                        onClick={(e) => { e.stopPropagation(); handleMoveCard(idx, 'down'); }}
                        title="Di chuyển xuống"
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        onClick={(e) => { e.stopPropagation(); handleDuplicateCard(idx); }}
                        title="Nhân bản thẻ"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:bg-destructive/10"
                        onClick={(e) => { e.stopPropagation(); handleDeleteCard(idx); }}
                        title="Xóa thẻ"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </CardHeader>

                  <CardContent className="p-4 sm:p-5 space-y-4">
                    {/* Front Section */}
                    <div className="p-4 rounded-xl border border-zinc-200/80 bg-zinc-50/50 space-y-3">
                      <div className="flex items-center justify-between text-xs font-semibold text-zinc-900 uppercase tracking-wider">
                        <span>Mặt Trước (Front)</span>
                        <span className="text-[10px] font-normal lowercase text-zinc-500">từ vựng / cụm từ cốt lõi</span>
                      </div>

                      <div className="grid sm:grid-cols-12 gap-3">
                        <div className="sm:col-span-6 space-y-1">
                          <Label className="text-xs font-medium text-zinc-700">Từ vựng (Headword) *</Label>
                          <Input
                            placeholder="Ví dụ: serendipity, ubiquitous..."
                            value={card.front}
                            onChange={(e) => handleUpdateCard(idx, { front: e.target.value })}
                            className="font-semibold text-sm border-zinc-200 focus:border-zinc-900 focus:ring-4 focus:ring-zinc-900/5 rounded-xl bg-white"
                          />
                        </div>

                        <div className="sm:col-span-3 space-y-1">
                          <Label className="text-xs font-medium text-zinc-700">Loại từ</Label>
                          <Select
                            value={card.partOfSpeech}
                            onValueChange={(val) => handleUpdateCard(idx, { partOfSpeech: val })}
                          >
                            <SelectTrigger className="text-xs bg-white border-zinc-200">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="noun">Danh từ (Noun)</SelectItem>
                              <SelectItem value="verb">Động từ (Verb)</SelectItem>
                              <SelectItem value="adjective">Tính từ (Adj)</SelectItem>
                              <SelectItem value="adverb">Phó từ (Adv)</SelectItem>
                              <SelectItem value="phrase">Cụm từ (Phrase)</SelectItem>
                              <SelectItem value="idiom">Thành ngữ (Idiom)</SelectItem>
                              <SelectItem value="preposition">Giới từ</SelectItem>
                              <SelectItem value="conjunction">Liên từ</SelectItem>
                              <SelectItem value="other">Khác</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="sm:col-span-3 space-y-1">
                          <Label className="text-xs font-medium text-zinc-700">Phiên âm IPA</Label>
                          <Input
                            placeholder="/.../"
                            value={card.phonetic}
                            onChange={(e) => handleUpdateCard(idx, { phonetic: e.target.value })}
                            className="font-mono text-xs border-zinc-200 focus:border-zinc-900 focus:ring-4 focus:ring-zinc-900/5 rounded-xl bg-white"
                          />
                        </div>
                      </div>

                      {/* Audio Pronunciation row */}
                      <div className="flex items-center gap-2 pt-1">
                        <Input
                          placeholder="Link audio phát âm (tùy chọn)..."
                          value={card.audioUrl}
                          onChange={(e) => handleUpdateCard(idx, { audioUrl: e.target.value })}
                          className="text-xs flex-1 h-8 border-zinc-200 bg-white rounded-lg"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => speakWord(card.front)}
                          disabled={!card.front.trim()}
                          className="h-8 gap-1.5 text-xs shrink-0 rounded-lg border-zinc-200 hover:bg-zinc-100 text-zinc-800"
                          title="Phát âm thử bằng Web Speech API"
                        >
                          <Volume2 className="w-3.5 h-3.5 text-zinc-700" /> Nghe thử
                        </Button>
                      </div>
                    </div>

                    {/* Back Section */}
                    <div className="p-4 rounded-xl border border-zinc-200/80 bg-zinc-50/50 space-y-3">
                      <div className="flex items-center justify-between text-xs font-semibold text-zinc-900 uppercase tracking-wider">
                        <span>Mặt Sau (Back)</span>
                        <span className="text-[10px] font-normal lowercase text-zinc-500">định nghĩa & ngữ cảnh</span>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs font-medium text-zinc-700">Nghĩa tiếng Việt (Definition) *</Label>
                        <Textarea
                          rows={2}
                          placeholder="Nhập nghĩa cốt lõi, giải thích ngắn gọn..."
                          value={card.back}
                          onChange={(e) => handleUpdateCard(idx, { back: e.target.value })}
                          className="text-xs border-zinc-200 focus:border-zinc-900 focus:ring-4 focus:ring-zinc-900/5 rounded-xl bg-white"
                        />
                      </div>

                      <div className="grid sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs font-medium text-zinc-700">Câu ví dụ tiếng Anh</Label>
                          <Input
                            placeholder="Ví dụ: Smartphones have become ubiquitous..."
                            value={card.example}
                            onChange={(e) => handleUpdateCard(idx, { example: e.target.value })}
                            className="text-xs italic border-zinc-200 focus:border-zinc-900 focus:ring-4 focus:ring-zinc-900/5 rounded-xl bg-white"
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-xs font-medium text-zinc-700">Dịch nghĩa câu ví dụ</Label>
                          <Input
                            placeholder="Dịch nghĩa tiếng Việt của câu ví dụ..."
                            value={card.exampleMeaning}
                            onChange={(e) => handleUpdateCard(idx, { exampleMeaning: e.target.value })}
                            className="text-xs border-zinc-200 focus:border-zinc-900 focus:ring-4 focus:ring-zinc-900/5 rounded-xl bg-white"
                          />
                        </div>
                      </div>

                      <div className="grid sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs font-medium text-zinc-700">Từ đồng nghĩa (Cách nhau bằng dấu phẩy)</Label>
                          <Input
                            placeholder="omnipresent, universal..."
                            value={card.synonyms.join(', ')}
                            onChange={(e) =>
                              handleUpdateCard(idx, {
                                synonyms: e.target.value.split(',').map((s) => s.trim()).filter(Boolean)
                              })
                            }
                            className="text-xs border-zinc-200 focus:border-zinc-900 focus:ring-4 focus:ring-zinc-900/5 rounded-xl bg-white"
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-xs font-medium text-zinc-700">Mẹo ghi nhớ (Mnemonic Note)</Label>
                          <Input
                            placeholder="Mẹo nhớ từ hoặc nguồn gốc từ..."
                            value={card.note}
                            onChange={(e) => handleUpdateCard(idx, { note: e.target.value })}
                            className="text-xs border-zinc-200 focus:border-zinc-900 focus:ring-4 focus:ring-zinc-900/5 rounded-xl bg-white"
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Bottom Add Card Button */}
          <Button
            type="button"
            variant="outline"
            onClick={() => handleAddCard()}
            className="w-full py-5 border-dashed border-2 border-zinc-300 hover:border-zinc-900 hover:bg-zinc-50 text-zinc-800 gap-2 font-medium rounded-2xl transition-all duration-200"
          >
            <Plus className="w-4 h-4" /> Thêm thẻ từ vựng tiếp theo
          </Button>
        </div>

        {/* Right Sticky: Live Flip Preview Widget */}
        {showPreviewPane && (
          <div className="lg:col-span-5 xl:col-span-4">
            <div className="sticky top-24 space-y-4">
              <Card className="border border-zinc-200/80 shadow-xs bg-white overflow-hidden rounded-2xl">
                <CardHeader className="py-3 px-4 bg-zinc-50 border-b border-zinc-200 flex flex-row items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-zinc-900" />
                    <CardTitle className="text-xs font-bold uppercase tracking-wider text-zinc-900">
                      Xem Thử Học Viên (Live Flip)
                    </CardTitle>
                  </div>
                  <span className="text-[11px] text-zinc-500 font-mono">
                    Thẻ {activeCardIndex + 1} / {cards.length}
                  </span>
                </CardHeader>

                <CardContent className="p-5 space-y-4">
                  {/* 3D Interactive Card Preview */}
                  <div
                    onClick={() => setIsPreviewFlipped(!isPreviewFlipped)}
                    className="min-h-[260px] p-6 rounded-2xl border-2 border-zinc-200/80 bg-zinc-50/50 hover:border-zinc-900 hover:shadow-xs cursor-pointer select-none flex flex-col justify-between transition-all duration-200"
                  >
                    {!isPreviewFlipped ? (
                      /* FRONT PREVIEW */
                      <div className="space-y-4 text-center my-auto">
                        <div className="flex items-center justify-between text-xs text-zinc-500">
                          <Badge variant="outline" className="text-[10px] capitalize font-medium border-zinc-200 bg-white text-zinc-800">
                            {activeCard?.partOfSpeech || 'noun'}
                          </Badge>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-zinc-800 hover:bg-zinc-200/70 rounded-lg"
                            onClick={(e) => {
                              e.stopPropagation();
                              speakWord(activeCard?.front);
                            }}
                          >
                            <Volume2 className="w-4 h-4" />
                          </Button>
                        </div>

                        <div>
                          <h3 className="text-3xl font-extrabold tracking-tight text-zinc-900 whitespace-pre-wrap">
                            {activeCard?.front || 'Từ vựng'}
                          </h3>
                          {activeCard?.phonetic && (
                            <p className="text-sm font-mono text-zinc-500 mt-1">
                              {activeCard.phonetic}
                            </p>
                          )}
                        </div>

                        <p className="text-[11px] text-zinc-400 flex items-center justify-center gap-1 pt-2">
                          <RotateCw className="w-3 h-3" /> Nhấn để lật xem nghĩa
                        </p>
                      </div>
                    ) : (
                      /* BACK PREVIEW */
                      <div className="space-y-3 text-center my-auto">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-600">
                          Định nghĩa & Ngữ cảnh
                        </span>
                        <h4 className="text-xl font-bold text-zinc-900">
                          {activeCard?.back || 'Nghĩa tiếng Việt'}
                        </h4>

                        {activeCard?.example && (
                          <div className="p-2.5 rounded-xl bg-white text-xs border border-zinc-200 text-left space-y-1">
                            <p className="italic text-zinc-900 font-medium">"{activeCard.example}"</p>
                            {activeCard.exampleMeaning && (
                              <p className="text-zinc-500 text-[11px]">{activeCard.exampleMeaning}</p>
                            )}
                          </div>
                        )}

                        {activeCard?.synonyms && activeCard.synonyms.length > 0 && (
                          <div className="text-[11px] text-zinc-600 text-left">
                            <span className="font-semibold text-zinc-900">Đồng nghĩa: </span>
                            {activeCard.synonyms.join(', ')}
                          </div>
                        )}

                        {activeCard?.note && (
                          <p className="text-[11px] text-zinc-700 italic text-left bg-zinc-100 p-2.5 rounded-xl border border-zinc-200">
                            💡 Mẹo nhớ: {activeCard.note}
                          </p>
                        )}

                        <p className="text-[11px] text-zinc-400 flex items-center justify-center gap-1 pt-2">
                          <RotateCw className="w-3 h-3" /> Nhấn để lật lại mặt trước
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Navigation in Preview */}
                  <div className="flex items-center justify-between text-xs pt-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={activeCardIndex === 0}
                      onClick={() => {
                        setActiveCardIndex((i) => Math.max(0, i - 1));
                        setIsPreviewFlipped(false);
                      }}
                      className="h-8 text-xs"
                    >
                      Thẻ trước
                    </Button>
                    <span className="text-muted-foreground font-mono">
                      {activeCardIndex + 1} / {cards.length}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={activeCardIndex === cards.length - 1}
                      onClick={() => {
                        setActiveCardIndex((i) => Math.min(cards.length - 1, i + 1));
                        setIsPreviewFlipped(false);
                      }}
                      className="h-8 text-xs"
                    >
                      Thẻ tiếp
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>

      {/* ---------------- 4. MODALS ---------------- */}
      <BulkImportModal
        open={showBulkImport}
        onOpenChange={setShowBulkImport}
        onImport={handleBulkImport}
        currentCount={cards.length}
      />

      <PublishRestrictedModal
        open={showPublishModal}
        onOpenChange={setShowPublishModal}
        onNavigateTab={onNavigateTab}
        contentType="bộ thẻ"
      />
    </div>
  );
};
