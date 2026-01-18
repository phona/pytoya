import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';

interface ImportSchemaModalProps {
  open: boolean;
  onClose: () => void;
  onImport: (file: File) => Promise<void>;
}

export function ImportSchemaModal({
  open,
  onClose,
  onImport,
}: ImportSchemaModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleImport = async () => {
    if (!file) {
      return;
    }
    setIsSubmitting(true);
    try {
      await onImport(file);
      setFile(null);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Import JSON Schema</DialogTitle>
          <DialogDescription>
            Upload a JSON Schema file to populate the editor.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <input
            type="file"
            accept=".json,application/json"
            onChange={(event) => {
              const selected = event.target.files?.[0] ?? null;
              setFile(selected);
            }}
            className="block w-full text-sm text-gray-600"
          />
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleImport}
              className="rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700 disabled:opacity-50"
              disabled={isSubmitting || !file}
            >
              {isSubmitting ? 'Importing...' : 'Import'}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
