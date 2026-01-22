import { create } from 'zustand';

interface UiState {
  isSidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;

  isJobsPanelOpen: boolean;
  setJobsPanelOpen: (open: boolean) => void;
  toggleJobsPanel: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  isSidebarOpen: false,
  setSidebarOpen: (open) => set({ isSidebarOpen: open }),
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),

  isJobsPanelOpen: false,
  setJobsPanelOpen: (open) => set({ isJobsPanelOpen: open }),
  toggleJobsPanel: () => set((state) => ({ isJobsPanelOpen: !state.isJobsPanelOpen })),
}));




