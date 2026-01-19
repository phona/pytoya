import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';

interface GenerateSchemaModalProps {
  open: boolean;
  onClose: () => void;
  onGenerate: (description: string, includeHints: boolean) => Promise<void>;
}

export function GenerateSchemaModal({
  open,
  onClose,
  onGenerate,
}: GenerateSchemaModalProps) {
  const [description, setDescription] = useState('');
  const [includeHints, setIncludeHints] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleGenerate = async () => {
    if (!description.trim()) {
      return;
    }
    setIsSubmitting(true);
    try {
      await onGenerate(description.trim(), includeHints);
      setDescription('');
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Generate Schema by LLM</DialogTitle>
          <DialogDescription>
            Describe the schema you want to generate. The LLM will return a JSON Schema draft.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={5}
            className="w-full rounded-md border border-border px-3 py-2 text-sm focus:border-ring focus:outline-none focus:ring-ring"
            placeholder="Invoice with PO number, department code, date, and line items..."
          />
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={includeHints}
              onChange={(event) => setIncludeHints(event.target.checked)}
              className="rounded border-border text-primary focus:ring-ring"
            />
            Include extraction hints (x-extraction-hint)
          </label>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-border px-4 py-2 text-sm text-foreground hover:bg-muted"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleGenerate}
              className="rounded-md border border-transparent bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              disabled={isSubmitting || !description.trim()}
            >
              {isSubmitting ? 'Generating...' : 'Generate'}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}




