import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../ui/dialog';
import { Button } from '../../ui/button';
import { Label } from '../../ui/label';
import { Textarea } from '../../ui/textarea';
import { Badge } from '../../ui/badge';
import { RadioGroup, RadioGroupItem } from '../../ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { FileSpreadsheet, Sparkles, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

export interface ParsedCard {
  id?: string;
  front: string;
  back: string;
  partOfSpeech?: string;
  phonetic?: string;
  example?: string;
  exampleMeaning?: string;
  audioUrl?: string;
  synonyms?: string[];
  note?: string;
  imageUrl?: string;
  order?: number;
}

interface BulkImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (cards: ParsedCard[], mode: 'append' | 'replace') => void;
  currentCount: number;
}

export const BulkImportModal: React.FC<BulkImportModalProps> = ({
  open,
  onOpenChange,
  onImport,
  currentCount
}) => {
  const [rawText, setRawText] = useState('');
  const [delimiter, setDelimiter] = useState<'auto' | 'pipe' | 'tab' | 'semicolon'>('auto');
  const [importMode, setImportMode] = useState<'append' | 'replace'>('append');

  // Detect delimiter for a line
  const detectDelimiter = (line: string): string => {
    if (delimiter === 'pipe') return '|';
    if (delimiter === 'tab') return '\t';
    if (delimiter === 'semicolon') return ';';

    if (line.includes('\t')) return '\t';
    if (line.includes('|')) return '|';
    if (line.includes(';')) return ';';
    if (line.includes(' - ')) return ' - ';
    return '|';
  };

  const parsedResults = useMemo(() => {
    if (!rawText.trim()) return { cards: [], invalidCount: 0 };

    const lines = rawText.split('\n');
    const cards: ParsedCard[] = [];
    let invalidCount = 0;

    lines.forEach((line) => {
      const trimmedLine = line.trim();
      if (!trimmedLine) return; // Skip empty lines

      const sep = detectDelimiter(trimmedLine);
      const parts = trimmedLine.split(sep).map((p) => p.trim());

      if (parts.length >= 2) {
        const front = parts[0];
        let partOfSpeech = 'noun';
        let phonetic = '';
        let back = '';
        let example = '';

        if (parts.length >= 5) {
          // Format 1: Word | POS | IPA | Meaning | Example
          const possiblePos = parts[1].toLowerCase();
          if (['n', 'noun', 'v', 'verb', 'adj', 'adjective', 'adv', 'adverb', 'phrase', 'idiom'].includes(possiblePos)) {
            partOfSpeech = possiblePos.startsWith('n') ? 'noun' : possiblePos.startsWith('v') ? 'verb' : possiblePos.startsWith('adj') ? 'adjective' : possiblePos.startsWith('adv') ? 'adverb' : 'phrase';
          }
          phonetic = parts[2];
          back = parts[3];
          example = parts[4];
        } else if (parts.length === 4) {
          // Format 2: Word | IPA | Meaning | Example
          phonetic = parts[1];
          back = parts[2];
          example = parts[3];
        } else if (parts.length === 3) {
          // Format 3: Word | Meaning | Example
          back = parts[1];
          example = parts[2];
        } else {
          // Format 4: Word | Meaning
          back = parts[1];
        }

        if (front && back) {
          cards.push({
            front,
            back,
            partOfSpeech,
            phonetic: phonetic.startsWith('/') ? phonetic : phonetic ? `/${phonetic}/` : '',
            example,
            order: cards.length
          });
        } else {
          invalidCount++;
        }
      } else {
        invalidCount++;
      }
    });

    return { cards, invalidCount };
  }, [rawText, delimiter]);

  const handleConfirm = () => {
    if (parsedResults.cards.length === 0) {
      toast.error('Chưa có thẻ hợp lệ nào để nhập!');
      return;
    }

    onImport(parsedResults.cards, importMode);
    toast.success(`Đã nhập thành công ${parsedResults.cards.length} thẻ từ vựng!`);
    setRawText('');
    onOpenChange(false);
  };

  const sampleTemplate = `serendipity | noun | /ˌser.ənˈdɪp.ə.ti/ | sự tình cờ may mắn | Finding this book was pure serendipity.
ubiquitous | adjective | /juːˈbɪk.wə.təs/ | có mặt ở khắp mọi nơi | Smartphones have become ubiquitous.
pragmatic | adjective | /præɡˈmæt.ɪk/ | thực tế, thực dụng | We need a pragmatic approach to solve this.`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-6 overflow-hidden">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-pink-500/10 text-pink-600 dark:text-pink-400 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold">Nhập Thẻ Hàng Loạt (Bulk Import)</DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Dán danh sách từ vựng từ Excel, Google Sheets, Quizlet hoặc Anki để tạo hàng chục thẻ trong 1 giây.
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-2 pr-1">
          {/* Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-muted/40 rounded-xl border text-xs">
            <div className="flex items-center gap-2">
              <Label className="text-xs font-medium">Ký tự phân cách:</Label>
              <Select value={delimiter} onValueChange={(val: any) => setDelimiter(val)}>
                <SelectTrigger className="h-8 w-36 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Tự động nhận diện</SelectItem>
                  <SelectItem value="pipe">Dấu gạch đứng ( | )</SelectItem>
                  <SelectItem value="tab">Phím Tab (Excel/Sheets)</SelectItem>
                  <SelectItem value="semicolon">Dấu chấm phẩy ( ; )</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setRawText(sampleTemplate)}
              className="h-8 text-xs text-primary gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" /> Dán dữ liệu mẫu
            </Button>
          </div>

          {/* Textarea */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Cú pháp: <code className="bg-muted px-1 py-0.5 rounded text-[11px]">Từ vựng | Loại từ | Phiên âm | Nghĩa tiếng Việt | Câu ví dụ</code></span>
              <span>(hoặc đơn giản: <code className="bg-muted px-1 py-0.5 rounded text-[11px]">Từ vựng | Nghĩa</code>)</span>
            </div>
            <Textarea
              rows={7}
              placeholder={`Dán danh sách từ của bạn vào đây...\nVí dụ:\n${sampleTemplate}`}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              className="font-mono text-xs leading-relaxed"
            />
          </div>

          {/* Parsed Preview Table */}
          {parsedResults.cards.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" /> Đã phân tích thành công: {parsedResults.cards.length} thẻ
                </span>
                {parsedResults.invalidCount > 0 && (
                  <span className="text-xs text-amber-500 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" /> Bỏ qua {parsedResults.invalidCount} dòng không hợp lệ
                  </span>
                )}
              </div>

              <div className="max-h-48 overflow-y-auto rounded-lg border bg-card text-xs">
                <table className="w-full border-collapse">
                  <thead className="bg-muted/70 sticky top-0 border-b">
                    <tr>
                      <th className="p-2 text-left font-semibold w-10">#</th>
                      <th className="p-2 text-left font-semibold">Từ vựng (Front)</th>
                      <th className="p-2 text-left font-semibold">Loại từ</th>
                      <th className="p-2 text-left font-semibold">Phiên âm</th>
                      <th className="p-2 text-left font-semibold">Nghĩa (Back)</th>
                      <th className="p-2 text-left font-semibold">Câu ví dụ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {parsedResults.cards.map((c, i) => (
                      <tr key={i} className="hover:bg-muted/30">
                        <td className="p-2 text-muted-foreground text-[11px]">{i + 1}</td>
                        <td className="p-2 font-medium text-foreground">{c.front}</td>
                        <td className="p-2">
                          <Badge variant="outline" className="text-[10px] font-normal capitalize">
                            {c.partOfSpeech}
                          </Badge>
                        </td>
                        <td className="p-2 font-mono text-[11px] text-muted-foreground">{c.phonetic || '-'}</td>
                        <td className="p-2 text-foreground font-medium">{c.back}</td>
                        <td className="p-2 text-muted-foreground italic text-[11px] max-w-xs truncate">
                          {c.example || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Import Mode Options */}
          {currentCount > 0 && parsedResults.cards.length > 0 && (
            <div className="p-3 bg-muted/30 rounded-xl border space-y-2">
              <Label className="text-xs font-semibold">Tùy chọn nhập:</Label>
              <RadioGroup
                value={importMode}
                onValueChange={(val: any) => setImportMode(val)}
                className="flex gap-6 text-xs"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="append" id="import-append" />
                  <Label htmlFor="import-append" className="cursor-pointer text-xs">
                    Thêm vào tiếp sau {currentCount} thẻ hiện có
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="replace" id="import-replace" />
                  <Label htmlFor="import-replace" className="cursor-pointer text-xs text-destructive font-medium">
                    Thay thế toàn bộ danh sách cũ
                  </Label>
                </div>
              </RadioGroup>
            </div>
          )}
        </div>

        <DialogFooter className="pt-3 border-t flex items-center justify-between sm:justify-between w-full">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={parsedResults.cards.length === 0}
            className="bg-pink-600 hover:bg-pink-700 text-white gap-2 font-semibold shadow-sm"
          >
            Nhập {parsedResults.cards.length} Thẻ Ngay <ArrowRight className="w-4 h-4" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
