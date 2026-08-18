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
}

const issueTypes = [
  { id: "wrong-meaning", label: "Wrong meaning or translation" },
  { id: "audio-issue", label: "Audio issue (missing, distorted, wrong)" },
  { id: "typo", label: "Typo or spelling error" },
  { id: "wrong-answer", label: "Incorrect answer marked as correct" },
  { id: "broken-media", label: "Broken image or video" },
  { id: "other", label: "Other issue" },
];

export function ReportIssueModal({ open, onClose }: ReportIssueModalProps) {
  const [selected, setSelected] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const toggle = (id: string) => {
    setSelected((prev) => prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]);
  };

  const handleSubmit = () => {
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setSelected([]);
      setNotes("");
      onClose();
    }, 1500);
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
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={selected.length === 0}>
              <Flag className="h-4 w-4 mr-2" /> Submit Report
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
