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

// Top-level screen router (public vs authenticated)
export type Screen = "landing" | "login" | "app" | "superadmin";

export interface AuthUser {
  name: string;
  email: string;
  role: "owner" | "manager" | "advisor" | "technician" | "accountant" | "inventory" | "super_admin";
  tenantId?: string | null;
  tenantName?: string | null;
}

const PLATFORM_TENANT = "Platform Administration";

interface AppState {
  lang: Lang;
  setLang: (l: Lang) => void;
  toggleLang: () => void;
  // top-level screen
  screen: Screen;
  setScreen: (s: Screen) => void;
  user: AuthUser | null;
  login: (u: AuthUser) => void;
  logout: () => void;
  setUser: (u: AuthUser) => void;
  // workshop app view
  view: ViewKey;
  setView: (v: ViewKey) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (o: boolean) => void;
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
  screen: "landing",
  setScreen: (s) => set({ screen: s }),
  user: null,
  // Super admin impersonating a workshop (tenantName set, not platform) → workshop app;
  // Super admin on the platform → super admin panel; everyone else → workshop app.
  login: (u) =>
    set({
      user: u,
      screen: u.role === "super_admin" ? (u.tenantName && u.tenantName !== PLATFORM_TENANT ? "app" : "superadmin") : "app",
    }),
  logout: () => set({ user: null, screen: "landing", view: "dashboard" }),
  setUser: (u) => set({ user: u }),
  view: "dashboard",
  setView: (v) => set({ view: v, focusId: null }),
  sidebarOpen: false,
  setSidebarOpen: (o) => set({ sidebarOpen: o }),
  focusId: null,
  setFocusId: (id) => set({ focusId: id }),
  quickCreate: null,
  setQuickCreate: (k) => set({ quickCreate: k }),
}));
