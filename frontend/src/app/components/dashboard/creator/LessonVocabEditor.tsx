import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Button } from '../../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Languages, Clock, Plus, Trash2, Layers, BookMarked, Sparkles } from 'lucide-react';
import { ILessonItem, IVocabularyItem, generateTempId } from './courseBuilderState';

interface LessonVocabEditorProps {
  lesson: ILessonItem;
  onChange: (updates: Partial<ILessonItem>) => void;
  availableFlashcards?: Array<{ _id: string; title: string; count?: number }>;
}

export const LessonVocabEditor: React.FC<LessonVocabEditorProps> = ({
  lesson,
  onChange,
  availableFlashcards = []
}) => {
  const vocabulary = lesson.vocabulary || [];

  const handleAddWord = () => {
    const newWord: IVocabularyItem = {
      id: generateTempId('voc'),
      term: '',
      phonetic: '',
      partOfSpeech: 'noun',
      meaning: '',
      example: ''
    };
    onChange({ vocabulary: [...vocabulary, newWord] });
  };

  const handleUpdateWord = (index: number, updates: Partial<IVocabularyItem>) => {
    const next = [...vocabulary];
    next[index] = { ...next[index], ...updates };
    onChange({ vocabulary: next });
  };

  const handleRemoveWord = (index: number) => {
    const next = vocabulary.filter((_, i) => i !== index);
    onChange({ vocabulary: next });
  };

  const handleAddSampleWords = () => {
    const samples: IVocabularyItem[] = [
      {
        id: generateTempId('voc'),
        term: 'resilient',
        phonetic: '/rɪˈzɪl.jənt/',
        partOfSpeech: 'adjective',
        meaning: 'kiên cường, có khả năng phục hồi nhanh',
        example: 'She is a resilient girl who bounces back quickly from failures.'
      },
      {
        id: generateTempId('voc'),
        term: 'elaborate',
        phonetic: '/iˈlæb.ər.ət/',
        partOfSpeech: 'verb',
        meaning: 'giải thích chi tiết, tỉ mỉ',
        example: 'Could you elaborate on your main proposal?'
      }
    ];
    onChange({ vocabulary: [...vocabulary, ...samples] });
  };

  return (
    <div className="space-y-6">
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-3 border-b border-border/40">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-purple-500/10 text-purple-500">
                <Languages className="w-4 h-4" />
              </span>
              Thiết lập bài học Từ vựng & Flashcards
            </CardTitle>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="w-3.5 h-3.5" />
              Thời lượng học:
              <Input
                type="number"
                min="1"
                max="120"
                value={lesson.durationMinutes || 10}
                onChange={(e) => onChange({ durationMinutes: Math.max(1, parseInt(e.target.value) || 1) })}
                className="w-16 h-7 text-xs px-2 py-0 text-center"
              />
              phút
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-5 space-y-6">
          <div className="space-y-1.5">
            <Label htmlFor="vocab-title" className="text-xs font-semibold uppercase text-muted-foreground">
              Tiêu đề bài học <span className="text-destructive">*</span>
            </Label>
            <Input
              id="vocab-title"
              value={lesson.title}
              onChange={(e) => onChange({ title: e.target.value })}
              placeholder="VD: Từ vựng cốt lõi chủ đề Công nghệ & AI..."
              className="font-medium"
            />
          </div>

          {/* Flashcard Deck Association */}
          <div className="p-4 rounded-xl border border-border/60 bg-muted/10 space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold uppercase text-muted-foreground flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-purple-500" />
                Liên kết bộ Flashcard (Tùy chọn)
              </Label>
              <span className="text-[11px] text-muted-foreground">
                Được liên kết từ các bộ thẻ bạn sở hữu
              </span>
            </div>
            <Select
              value={lesson.attachedFlashcardId || 'none'}
              onValueChange={(val) => onChange({ attachedFlashcardId: val === 'none' ? null : val })}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="-- Không liên kết Flashcard bên ngoài --" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">-- Không liên kết Flashcard bên ngoài --</SelectItem>
                {availableFlashcards.map((fc) => (
                  <SelectItem key={fc._id} value={fc._id}>
                    {fc.title} {fc.count ? `(${fc.count} thẻ)` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">
              Học viên có thể ôn tập bộ Flashcard liên kết này trực tiếp trong lúc học bài.
            </p>
          </div>

          {/* Inline Vocabulary Builder */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-xs font-semibold uppercase text-muted-foreground flex items-center gap-1.5">
                  <BookMarked className="w-3.5 h-3.5 text-purple-500" />
                  Danh sách từ vựng trọng tâm ({vocabulary.length} từ)
                </Label>
                <p className="text-[11px] text-muted-foreground">
                  Các từ vựng này sẽ được lưu trực tiếp vào bài học và hiển thị thẻ ghi nhớ tương tác cho người học.
                </p>
              </div>
              <div className="flex items-center gap-2">
                {vocabulary.length === 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddSampleWords}
                    className="h-7 text-xs gap-1 text-muted-foreground"
                  >
                    <Sparkles className="w-3 h-3 text-amber-500" />
                    Thêm từ mẫu
                  </Button>
                )}
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  onClick={handleAddWord}
                  className="h-7 text-xs gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Thêm từ mới
                </Button>
              </div>
            </div>

            {vocabulary.length === 0 ? (
              <div className="text-center py-8 border-2 border-dashed border-border/60 rounded-xl space-y-2">
                <p className="text-xs text-muted-foreground">Chưa có từ vựng nào trong bài học này.</p>
                <Button type="button" variant="outline" size="sm" onClick={handleAddWord} className="text-xs">
                  <Plus className="w-3.5 h-3.5 mr-1" /> Thêm từ đầu tiên
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {vocabulary.map((item, index) => (
                  <div
                    key={item.id || index}
                    className="p-3.5 rounded-xl border border-border/60 bg-card/60 shadow-xs space-y-3 relative group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-muted text-muted-foreground">
                        #{index + 1}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveWord(index)}
                        className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                        title="Xóa từ này"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">Từ vựng (Term) *</Label>
                        <Input
                          value={item.term}
                          onChange={(e) => handleUpdateWord(index, { term: e.target.value })}
                          placeholder="VD: persistent"
                          className="h-8 text-xs font-semibold"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">Phiên âm (Phonetic)</Label>
                        <Input
                          value={item.phonetic || ''}
                          onChange={(e) => handleUpdateWord(index, { phonetic: e.target.value })}
                          placeholder="/pəˈsɪs.tənt/"
                          className="h-8 text-xs font-mono"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">Từ loại</Label>
                        <Input
                          value={item.partOfSpeech || ''}
                          onChange={(e) => handleUpdateWord(index, { partOfSpeech: e.target.value })}
                          placeholder="noun / verb / adj / adv"
                          className="h-8 text-xs"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">Nghĩa tiếng Việt *</Label>
                        <Input
                          value={item.meaning}
                          onChange={(e) => handleUpdateWord(index, { meaning: e.target.value })}
                          placeholder="VD: kiên trì, bền bỉ..."
                          className="h-8 text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">Ví dụ minh họa</Label>
                        <Input
                          value={item.example || ''}
                          onChange={(e) => handleUpdateWord(index, { example: e.target.value })}
                          placeholder="VD: He was persistent in pursuing his dream."
                          className="h-8 text-xs italic"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
