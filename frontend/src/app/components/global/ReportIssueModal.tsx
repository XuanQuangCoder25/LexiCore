import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../ui/dialog";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Flag } from "lucide-react";

interface ReportIssueModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit?: (reason: string) => Promise<void>;
}

const issueTypes = [
  { id: "wrong-meaning", label: "Sai ngữ nghĩa hoặc bản dịch" },
  { id: "audio-issue", label: "Lỗi âm thanh (mất, rè, sai)" },
  { id: "typo", label: "Lỗi chính tả" },
  { id: "wrong-answer", label: "Đáp án không chính xác" },
  { id: "broken-media", label: "Lỗi hình ảnh/video" },
  { id: "other", label: "Lỗi khác" },
];

export function ReportIssueModal({ open, onClose, onSubmit }: ReportIssueModalProps) {
  const [selected, setSelected] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const toggle = (id: string) => {
    setSelected((prev) => prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]);
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      if (onSubmit) {
        const reason = `Issues: ${selected.join(", ")}. Notes: ${notes}`;
        await onSubmit(reason);
      }
      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
        setSelected([]);
        setNotes("");
        onClose();
      }, 1500);
    } catch (error) {
      // Error handled by parent
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Flag className="h-4 w-4" /> Report an Issue
          </DialogTitle>
        </DialogHeader>

        {submitted ? (
          <div className="py-8 text-center space-y-2">
            <p className="font-medium">Thank you for your report!</p>
            <p className="text-sm text-muted-foreground">Our team will review this content shortly.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Select all that apply:</p>
            <div className="space-y-3">
              {issueTypes.map((issue) => (
                <div key={issue.id} className="flex items-center gap-3">
                  <Checkbox
                    id={issue.id}
                    checked={selected.includes(issue.id)}
                    onCheckedChange={() => toggle(issue.id)}
                  />
                  <Label htmlFor={issue.id} className="font-normal cursor-pointer">{issue.label}</Label>
                </div>
              ))}
            </div>
            <div>
              <Label className="text-sm text-muted-foreground mb-1 block">Additional notes (optional)</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Describe the issue in more detail..."
                rows={3}
              />
            </div>
          </div>
        )}

        {!submitted && (
          <DialogFooter>
            <Button variant="outline" onClick={onClose} disabled={loading}>Hủy</Button>
            <Button onClick={handleSubmit} disabled={selected.length === 0 || loading}>
              <Flag className="h-4 w-4 mr-2" /> {loading ? "Đang gửi..." : "Gửi Báo Cáo"}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
