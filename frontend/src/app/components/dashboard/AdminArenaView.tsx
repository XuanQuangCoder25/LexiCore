import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Input } from "../ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import {
  BookMarked,
  Plus,
  Pencil,
  Trash2,
  Search,
  Loader2,
  Upload,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";

const API_BASE = "";

type WordLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
type WordType =
  | "noun" | "verb" | "adjective" | "adverb"
  | "phrase" | "noun_phrase" | "verb_phrase"
  | "idiom" | "collocation";

interface ArenaWord {
  id: string;
  word: string;
  meaning: string;
  topic: string;
  level: WordLevel;
  word_type: WordType;
  example?: string | null;
  created_at: string;
}

const LEVELS: WordLevel[] = ["A1", "A2", "B1", "B2", "C1", "C2"];
const WORD_TYPES: WordType[] = [
  "noun", "verb", "adjective", "adverb",
  "phrase", "noun_phrase", "verb_phrase",
  "idiom", "collocation",
];

const TYPE_LABEL: Record<WordType, string> = {
  noun: "Danh từ",
  verb: "Động từ",
  adjective: "Tính từ",
  adverb: "Trạng từ",
  phrase: "Cụm từ",
  noun_phrase: "Cụm danh từ",
  verb_phrase: "Cụm động từ",
  idiom: "Thành ngữ",
  collocation: "Collocation",
};

const LEVEL_COLOR: Record<WordLevel, string> = {
  A1: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
  A2: "bg-teal-500/15 text-teal-600 border-teal-500/30",
  B1: "bg-blue-500/15 text-blue-600 border-blue-500/30",
  B2: "bg-violet-500/15 text-violet-600 border-violet-500/30",
  C1: "bg-orange-500/15 text-orange-600 border-orange-500/30",
  C2: "bg-red-500/15 text-red-600 border-red-500/30",
};

const EMPTY_FORM = {
  word: "",
  meaning: "",
  topic: "",
  level: "B1" as WordLevel,
  word_type: "noun" as WordType,
  example: "",
};

export function AdminArenaView() {
  const [words, setWords] = useState<ArenaWord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [filterLevel, setFilterLevel] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");

  // Modals
  const [addOpen, setAddOpen] = useState(false);
  const [editWord, setEditWord] = useState<ArenaWord | null>(null);
  const [deleteWord, setDeleteWord] = useState<ArenaWord | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  // Form
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [formError, setFormError] = useState("");

  // Import
  const [csvText, setCsvText] = useState("");
  const [importError, setImportError] = useState("");
  const [importLoading, setImportLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const LIMIT = 20;

  const fetchWords = useCallback(async (p = page) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p), limit: String(LIMIT) });
      if (search) params.set("q", search);
      if (filterLevel !== "all") params.set("level", filterLevel);
      if (filterType !== "all") params.set("word_type", filterType);

      const res = await fetch(`${API_BASE}/api/admin/arena/words?${params}`, { credentials: "include" });
      const data = await res.json();
      if (data.success) {
        setWords(data.data);
        setTotal(data.total);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [page, search, filterLevel, filterType]);

  useEffect(() => {
    setPage(1);
  }, [search, filterLevel, filterType]);

  useEffect(() => {
    fetchWords(page);
  }, [page, fetchWords]);

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  // ─── Save (Add / Edit) ────────────────────────────────────────────────────
  const handleSave = async () => {
    setFormError("");
    if (!form.word.trim() || !form.meaning.trim() || !form.topic.trim()) {
      setFormError("Vui lòng điền đầy đủ Từ, Nghĩa và Chủ đề.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        word: form.word.trim(),
        meaning: form.meaning.trim(),
        topic: form.topic.trim(),
        level: form.level,
        word_type: form.word_type,
        example: form.example?.trim() || null,
      };

      let res: Response;
      if (editWord) {
        res = await fetch(`${API_BASE}/api/admin/arena/words/${editWord.id}`, {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch(`${API_BASE}/api/admin/arena/words`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      const data = await res.json();
      if (data.success) {
        setAddOpen(false);
        setEditWord(null);
        setForm({ ...EMPTY_FORM });
        fetchWords(page);
      } else {
        setFormError(data.message || "Lỗi không xác định");
      }
    } catch {
      setFormError("Lỗi kết nối server");
    } finally {
      setSaving(false);
    }
  };

  // ─── Delete ───────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteWord) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/arena/words/${deleteWord.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json();
      if (data.success) {
        setDeleteWord(null);
        fetchWords(page);
      }
    } catch {
      /* silent */
    } finally {
      setSaving(false);
    }
  };

  // ─── Import CSV ───────────────────────────────────────────────────────────
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setCsvText(ev.target?.result as string);
    reader.readAsText(file, "UTF-8");
  };

  const handleImport = async () => {
    setImportError("");
    const rows = csvText.trim().split("\n").filter(Boolean);
    if (rows.length === 0) {
      setImportError("File CSV trống.");
      return;
    }

    // Parse: word,meaning,topic,level,word_type,example(optional)
    const parsed = rows.map((row, i) => {
      const cols = row.split(",").map((c) => c.trim());
      if (cols.length < 5) {
        throw new Error(`Hàng ${i + 1}: thiếu cột (cần ít nhất 5 cột: word, meaning, topic, level, word_type)`);
      }
      return {
        word: cols[0],
        meaning: cols[1],
        topic: cols[2],
        level: cols[3] as WordLevel,
        word_type: cols[4] as WordType,
        example: cols[5] || undefined,
      };
    });

    setImportLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/arena/words/import`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ words: parsed }),
      });
      const data = await res.json();
      if (data.success) {
        setImportOpen(false);
        setCsvText("");
        fetchWords(1);
      } else {
        setImportError(data.message || "Import thất bại");
      }
    } catch {
      setImportError("Lỗi kết nối");
    } finally {
      setImportLoading(false);
    }
  };

  const openEdit = (w: ArenaWord) => {
    setForm({
      word: w.word,
      meaning: w.meaning,
      topic: w.topic,
      level: w.level,
      word_type: w.word_type,
      example: w.example || "",
    });
    setFormError("");
    setEditWord(w);
  };

  const openAdd = () => {
    setForm({ ...EMPTY_FORM });
    setFormError("");
    setAddOpen(true);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="p-6 rounded-2xl border bg-card shadow-sm flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <BookMarked className="w-8 h-8 text-primary" />
            Arena Words
          </h1>
          <p className="text-muted-foreground mt-1">
            Quản lý kho từ vựng cho các trận PvP Arena — {total.toLocaleString()} từ
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setImportOpen(true)}>
            <Upload className="w-4 h-4 mr-2" />
            Import CSV
          </Button>
          <Button onClick={openAdd}>
            <Plus className="w-4 h-4 mr-2" />
            Thêm từ
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-56">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Tìm kiếm từ hoặc nghĩa..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={filterLevel} onValueChange={setFilterLevel}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Cấp độ" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả cấp độ</SelectItem>
            {LEVELS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Loại từ" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả loại</SelectItem>
            {WORD_TYPES.map((t) => <SelectItem key={t} value={t}>{TYPE_LABEL[t]}</SelectItem>)}
          </SelectContent>
        </Select>
        {(search || filterLevel !== "all" || filterType !== "all") && (
          <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setFilterLevel("all"); setFilterType("all"); }}>
            <X className="w-4 h-4 mr-1" /> Xoá bộ lọc
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="bg-card border rounded-xl shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-primary/5 hover:bg-primary/5">
              <TableHead className="pl-6 font-bold w-40">Từ vựng</TableHead>
              <TableHead className="font-bold">Nghĩa</TableHead>
              <TableHead className="font-bold w-28">Chủ đề</TableHead>
              <TableHead className="font-bold w-20">Cấp độ</TableHead>
              <TableHead className="font-bold w-36">Loại từ</TableHead>
              <TableHead className="font-bold">Ví dụ</TableHead>
              <TableHead className="text-right pr-6 font-bold w-28">Hành động</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-16 text-muted-foreground">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                </TableCell>
              </TableRow>
            ) : words.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-16 text-muted-foreground">
                  <BookMarked className="w-10 h-10 mx-auto mb-3 opacity-20" />
                  <p>Không có từ vựng nào.</p>
                </TableCell>
              </TableRow>
            ) : (
              words.map((w) => (
                <TableRow key={w.id} className="hover:bg-muted/50 transition-colors">
                  <TableCell className="pl-6 py-2.5 font-semibold text-sm">{w.word}</TableCell>
                  <TableCell className="py-2.5 text-sm text-muted-foreground max-w-56 truncate">{w.meaning}</TableCell>
                  <TableCell className="py-2.5">
                    <span className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground capitalize">{w.topic}</span>
                  </TableCell>
                  <TableCell className="py-2.5">
                    <Badge variant="outline" className={`text-xs font-bold border ${LEVEL_COLOR[w.level]}`}>{w.level}</Badge>
                  </TableCell>
                  <TableCell className="py-2.5 text-xs text-muted-foreground">{TYPE_LABEL[w.word_type]}</TableCell>
                  <TableCell className="py-2.5 text-xs text-muted-foreground max-w-56 truncate italic">{w.example || "—"}</TableCell>
                  <TableCell className="py-2.5 pr-6 text-right">
                    <div className="flex gap-1.5 justify-end">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(w)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteWord(w)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Trang {page}/{totalPages} · {total} từ</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* ── Add / Edit Modal ─────────────────────────────────────────────────── */}
      <Dialog open={addOpen || editWord !== null} onOpenChange={(open) => {
        if (!open) { setAddOpen(false); setEditWord(null); }
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editWord ? "Chỉnh sửa từ vựng" : "Thêm từ vựng mới"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Từ vựng *</label>
                <Input placeholder="e.g. persevere" value={form.word} onChange={e => setForm(f => ({ ...f, word: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Chủ đề *</label>
                <Input placeholder="e.g. business" value={form.topic} onChange={e => setForm(f => ({ ...f, topic: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Nghĩa (tiếng Việt) *</label>
              <Input placeholder="e.g. kiên trì, bền bỉ" value={form.meaning} onChange={e => setForm(f => ({ ...f, meaning: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Cấp độ</label>
                <Select value={form.level} onValueChange={v => setForm(f => ({ ...f, level: v as WordLevel }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {LEVELS.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Loại từ</label>
                <Select value={form.word_type} onValueChange={v => setForm(f => ({ ...f, word_type: v as WordType }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {WORD_TYPES.map(t => <SelectItem key={t} value={t}>{TYPE_LABEL[t]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Ví dụ <span className="text-muted-foreground font-normal">(không bắt buộc)</span></label>
              <Input placeholder="e.g. She persevered through every challenge." value={form.example} onChange={e => setForm(f => ({ ...f, example: e.target.value }))} />
            </div>
            {formError && <p className="text-sm text-destructive">{formError}</p>}
            <Button className="w-full" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {editWord ? "Lưu thay đổi" : "Thêm từ vựng"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirm Modal ─────────────────────────────────────────────── */}
      <Dialog open={deleteWord !== null} onOpenChange={(open) => { if (!open) setDeleteWord(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Xác nhận xoá</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            Bạn chắc chắn muốn xoá từ <strong className="text-foreground">"{deleteWord?.word}"</strong>? Hành động này không thể hoàn tác.
          </p>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setDeleteWord(null)}>Huỷ</Button>
            <Button variant="destructive" className="flex-1" onClick={handleDelete} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Trash2 className="w-4 h-4 mr-2" />}
              Xoá
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Import CSV Modal ─────────────────────────────────────────────────── */}
      <Dialog open={importOpen} onOpenChange={(open) => { if (!open) { setImportOpen(false); setCsvText(""); setImportError(""); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Import từ vựng qua CSV</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2 text-sm">
            <div className="bg-muted/50 rounded-lg p-3 text-muted-foreground space-y-1 text-xs font-mono">
              <p className="font-semibold text-foreground mb-2">Định dạng CSV (không có header):</p>
              <p>word, meaning, topic, level, word_type, example(tuỳ chọn)</p>
              <p className="text-muted-foreground/70 mt-1">Ví dụ:</p>
              <p>persevere, kiên trì, business, B2, verb, She persevered.</p>
              <p>resilient, kiên cường, psychology, C1, adjective</p>
            </div>
            <div
              className="border-2 border-dashed rounded-xl p-6 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
              <p className="font-medium">Kéo thả hoặc click để chọn file .csv</p>
              {csvText && <p className="text-xs text-emerald-600 mt-1">{csvText.trim().split("\n").length} dòng đã tải</p>}
            </div>
            <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleFileChange} />
            {importError && <p className="text-destructive text-xs">{importError}</p>}
            <Button className="w-full" onClick={handleImport} disabled={importLoading || !csvText}>
              {importLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
              Import ngay
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

