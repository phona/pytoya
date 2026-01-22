import { create } from 'zustand';

const DESKTOP_SIDEBAR_COLLAPSED_STORAGE_KEY = 'pytoya-desktop-sidebar-collapsed';

const getStoredDesktopSidebarCollapsed = () => {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    return window.localStorage.getItem(DESKTOP_SIDEBAR_COLLAPSED_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
};

const persistDesktopSidebarCollapsed = (collapsed: boolean) => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(DESKTOP_SIDEBAR_COLLAPSED_STORAGE_KEY, collapsed ? '1' : '0');
  } catch {
    // Ignore storage errors (private mode, blocked storage).
  }
};

interface UiState {
  isSidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;

  isDesktopSidebarCollapsed: boolean;
  setDesktopSidebarCollapsed: (collapsed: boolean) => void;
  toggleDesktopSidebarCollapsed: () => void;

  isJobsPanelOpen: boolean;
  setJobsPanelOpen: (open: boolean) => void;
  toggleJobsPanel: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  isSidebarOpen: false,
  setSidebarOpen: (open) => set({ isSidebarOpen: open }),
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),

  isDesktopSidebarCollapsed: getStoredDesktopSidebarCollapsed(),
  setDesktopSidebarCollapsed: (collapsed) => {
    persistDesktopSidebarCollapsed(collapsed);
    set({ isDesktopSidebarCollapsed: collapsed });
  },
  toggleDesktopSidebarCollapsed: () =>
    set((state) => {
      const next = !state.isDesktopSidebarCollapsed;
      persistDesktopSidebarCollapsed(next);
      return { isDesktopSidebarCollapsed: next };
    }),

  isJobsPanelOpen: false,
  setJobsPanelOpen: (open) => set({ isJobsPanelOpen: open }),
  toggleJobsPanel: () => set((state) => ({ isJobsPanelOpen: !state.isJobsPanelOpen })),
}));




