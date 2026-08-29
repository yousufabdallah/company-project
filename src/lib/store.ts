import { create } from "zustand";
import type { Lang } from "@/lib/i18n";

export type ViewKey =
  | "dashboard"
  | "customers"
  | "vehicles"
  | "appointments"
  | "estimates"
  | "jobCards"
  | "technicians"
  | "services"
  | "inventory"
  | "pos"
  | "suppliers"
  | "purchases"
  | "invoices"
  | "payments"
  | "expenses"
  | "warranties"
  | "reports"
  | "auditLogs"
  | "settings";

interface AppState {
  lang: Lang;
  setLang: (l: Lang) => void;
  toggleLang: () => void;
  view: ViewKey;
  setView: (v: ViewKey) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (o: boolean) => void;
  // optional focus record (e.g. open a customer detail)
  focusId: string | null;
  setFocusId: (id: string | null) => void;
  // quick create dialog
  quickCreate: string | null;
  setQuickCreate: (k: string | null) => void;
}

export const useApp = create<AppState>((set, get) => ({
  lang: "en",
  setLang: (l) => set({ lang: l }),
  toggleLang: () => set({ lang: get().lang === "en" ? "ar" : "en" }),
  view: "dashboard",
  setView: (v) => set({ view: v, focusId: null }),
  sidebarOpen: false,
  setSidebarOpen: (o) => set({ sidebarOpen: o }),
  focusId: null,
  setFocusId: (id) => set({ focusId: id }),
  quickCreate: null,
  setQuickCreate: (k) => set({ quickCreate: k }),
}));
