import { create } from 'zustand';

const STORAGE_KEY = 'pytoya-last-project-id';

const readStored = (): number | null => {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  } catch {
    return null;
  }
};

const persist = (value: number | null) => {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    if (value === null) {
      window.sessionStorage.removeItem(STORAGE_KEY);
    } else {
      window.sessionStorage.setItem(STORAGE_KEY, String(value));
    }
  } catch {
    // Ignore storage errors (private mode, blocked storage).
  }
};

interface RecentProjectState {
  lastProjectId: number | null;
  setLastProjectId: (id: number | null) => void;
}

export const useRecentProjectStore = create<RecentProjectState>((set) => ({
  lastProjectId: readStored(),
  setLastProjectId: (id) => {
    persist(id);
    set({ lastProjectId: id });
  },
}));
