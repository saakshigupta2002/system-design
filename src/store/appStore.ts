import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ToastType = "success" | "error" | "info";

interface ToastData {
  message: string;
  type: ToastType;
}

interface AppState {
  selectedProblemId: string;
  leftSidebarOpen: boolean;
  rightPanelOpen: boolean;
  activeLeftTab: "components" | "problems" | "learn";
  activeRightTab: "properties" | "simulation" | "score" | "capacity" | "tradeoffs";
  toast: ToastData | null;

  setSelectedProblem: (id: string) => void;
  toggleLeftSidebar: () => void;
  toggleRightPanel: () => void;
  setLeftSidebarOpen: (open: boolean) => void;
  setActiveLeftTab: (tab: AppState["activeLeftTab"]) => void;
  setActiveRightTab: (tab: AppState["activeRightTab"]) => void;
  showToast: (message: string, type: ToastType) => void;
  clearToast: () => void;
}

let toastTimeoutId: ReturnType<typeof setTimeout> | null = null;

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      selectedProblemId: "url-shortener",
      leftSidebarOpen: true,
      rightPanelOpen: true,
      activeLeftTab: "components",
      activeRightTab: "properties",
      toast: null,

      setSelectedProblem: (id) => set({ selectedProblemId: id }),
      toggleLeftSidebar: () =>
        set((s) => ({ leftSidebarOpen: !s.leftSidebarOpen })),
      toggleRightPanel: () =>
        set((s) => ({ rightPanelOpen: !s.rightPanelOpen })),
      setLeftSidebarOpen: (open) => set({ leftSidebarOpen: open }),
      setActiveLeftTab: (tab) => set({ activeLeftTab: tab }),
      setActiveRightTab: (tab) => set({ activeRightTab: tab }),
      showToast: (message, type) => {
        if (toastTimeoutId !== null) {
          clearTimeout(toastTimeoutId);
        }
        set({ toast: { message, type } });
        toastTimeoutId = setTimeout(() => {
          set({ toast: null });
          toastTimeoutId = null;
        }, 4000);
      },
      clearToast: () => {
        if (toastTimeoutId !== null) {
          clearTimeout(toastTimeoutId);
          toastTimeoutId = null;
        }
        set({ toast: null });
      },
    }),
    {
      name: "systemdesign-app",
      partialize: (state) => ({
        selectedProblemId: state.selectedProblemId,
      }),
    }
  )
);
