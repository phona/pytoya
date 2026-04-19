import { create } from 'zustand';
import type { BatchValidationResults } from '@/shared/components/manifests/BatchValidationResultsModal';

// Holds the latest batch-validation result so the modal survives
// navigation. Without this, the user clicks a failed item → audit page →
// comes back → modal is gone and they have to re-run the whole batch.
// Deliberately NOT persisted across browser reloads — a batch validation
// is a point-in-time snapshot, reloading the tab should let them start
// fresh.
interface BatchValidationState {
  results: BatchValidationResults | null;
  manifestIds: number[];
  groupId: number | null;
  open: boolean;

  setResults: (
    results: BatchValidationResults,
    manifestIds: number[],
    groupId: number,
  ) => void;
  setOpen: (open: boolean) => void;
  clear: () => void;
}

export const useBatchValidationStore = create<BatchValidationState>((set) => ({
  results: null,
  manifestIds: [],
  groupId: null,
  open: false,

  setResults: (results, manifestIds, groupId) =>
    set({ results, manifestIds, groupId, open: true }),

  setOpen: (open) => set({ open }),

  clear: () => set({ results: null, manifestIds: [], groupId: null, open: false }),
}));
