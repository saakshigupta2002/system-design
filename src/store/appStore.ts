import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ToastType = "success" | "error" | "info";

interface ToastData {
  message: string;
  type: ToastType;
}

export const LEFT_PANEL_MIN = 240;
export const LEFT_PANEL_MAX = 480;
export const RIGHT_PANEL_MIN = 300;
export const RIGHT_PANEL_MAX = 620;

interface AppState {
  selectedProblemId: string;
  leftSidebarOpen: boolean;
  rightPanelOpen: boolean;
  leftPanelWidth: number;
  rightPanelWidth: number;
  activeLeftTab: "components" | "problems" | "learn";
  activeRightTab: "properties" | "simulation" | "score" | "capacity" | "tradeoffs";
  theme: "dark" | "light";
  toast: ToastData | null;

  setSelectedProblem: (id: string) => void;
  toggleLeftSidebar: () => void;
  toggleRightPanel: () => void;
  setLeftSidebarOpen: (open: boolean) => void;
  setLeftPanelWidth: (width: number) => void;
  setRightPanelWidth: (width: number) => void;
  setActiveLeftTab: (tab: AppState["activeLeftTab"]) => void;
  setActiveRightTab: (tab: AppState["activeRightTab"]) => void;
  toggleTheme: () => void;
  showToast: (message: string, type: ToastType) => void;
  clearToast: () => void;
}

let toastTimeoutId: ReturnType<typeof setTimeout> | null = null;

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      selectedProblemId: "",
      leftSidebarOpen: true,
      rightPanelOpen: true,
      leftPanelWidth: 280,
      rightPanelWidth: 340,
      activeLeftTab: "components",
      activeRightTab: "properties",
      theme: "dark",
      toast: null,

      setSelectedProblem: (id) => set({ selectedProblemId: id }),
      toggleLeftSidebar: () =>
        set((s) => ({ leftSidebarOpen: !s.leftSidebarOpen })),
      toggleRightPanel: () =>
        set((s) => ({ rightPanelOpen: !s.rightPanelOpen })),
      setLeftSidebarOpen: (open) => set({ leftSidebarOpen: open }),
      setLeftPanelWidth: (width) =>
        set({ leftPanelWidth: Math.min(LEFT_PANEL_MAX, Math.max(LEFT_PANEL_MIN, width)) }),
      setRightPanelWidth: (width) =>
        set({ rightPanelWidth: Math.min(RIGHT_PANEL_MAX, Math.max(RIGHT_PANEL_MIN, width)) }),
      setActiveLeftTab: (tab) => set({ activeLeftTab: tab }),
      setActiveRightTab: (tab) => set({ activeRightTab: tab }),
      toggleTheme: () => set((s) => ({ theme: s.theme === "dark" ? "light" : "dark" })),
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
        leftPanelWidth: state.leftPanelWidth,
        rightPanelWidth: state.rightPanelWidth,
        theme: state.theme,
      }),
    }
  )
);

// Keep the <html> `dark` class in sync with the theme (the pre-paint script in
// layout.tsx sets the initial class; this handles runtime toggles + rehydration).
if (typeof document !== "undefined") {
  const apply = (theme: "dark" | "light") =>
    document.documentElement.classList.toggle("dark", theme !== "light");
  apply(useAppStore.getState().theme);
  useAppStore.subscribe((state, prev) => {
    if (state.theme !== prev.theme) apply(state.theme);
  });
}
