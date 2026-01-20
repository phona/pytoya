import { create } from 'zustand';
import type { OcrResultDto } from '@pytoya/shared/types/manifests';

type CostBreakdown = {
  total: number;
  text: number;
  llm: number;
};

interface ExtractionState {
  ocrResults: Record<number, OcrResultDto>;
  setOcrResult: (manifestId: number, result: OcrResultDto | null) => void;
  clearOcrResult: (manifestId: number) => void;

  extractionQueue: number[];
  setExtractionQueue: (ids: number[]) => void;

  cost: CostBreakdown;
  addCost: (amount: number, type?: 'text' | 'llm' | 'total') => void;
  resetCost: () => void;

  schemaTestMode: boolean;
  setSchemaTestMode: (enabled: boolean) => void;

  testResults: Record<number, unknown>;
  setTestResult: (manifestId: number, result: unknown) => void;
  clearTestResults: () => void;
}

const initialCost: CostBreakdown = { total: 0, text: 0, llm: 0 };

export const useExtractionStore = create<ExtractionState>((set) => ({
  ocrResults: {},
  setOcrResult: (manifestId, result) =>
    set((state) => {
      if (!result) {
        const next = { ...state.ocrResults };
        delete next[manifestId];
        return { ocrResults: next };
      }
      return { ocrResults: { ...state.ocrResults, [manifestId]: result } };
    }),
  clearOcrResult: (manifestId) =>
    set((state) => {
      const next = { ...state.ocrResults };
      delete next[manifestId];
      return { ocrResults: next };
    }),

  extractionQueue: [],
  setExtractionQueue: (ids) => set({ extractionQueue: ids }),

  cost: initialCost,
  addCost: (amount, type = 'total') =>
    set((state) => {
      const next = { ...state.cost };
      if (type === 'text') {
        next.text += amount;
      } else if (type === 'llm') {
        next.llm += amount;
      } else {
        next.total += amount;
      }
      if (type !== 'total') {
        next.total = next.text + next.llm;
      }
      return { cost: next };
    }),
  resetCost: () => set({ cost: initialCost }),

  schemaTestMode: false,
  setSchemaTestMode: (enabled) => set({ schemaTestMode: enabled }),

  testResults: {},
  setTestResult: (manifestId, result) =>
    set((state) => ({
      testResults: { ...state.testResults, [manifestId]: result },
    })),
  clearTestResults: () => set({ testResults: {} }),
}));
