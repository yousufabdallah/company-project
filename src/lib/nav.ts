import {
  LayoutDashboard,
  CalendarClock,
  Wrench,
  FileText,
  Users,
  Car,
  Settings2,
  Package,
  Truck,
  ShoppingCart,
  Receipt,
  Wallet,
  TrendingDown,
  BarChart3,
  ShieldCheck,
  UserCog,
  ScrollText,
  ScanLine,
  Landmark,
  type LucideIcon,
} from "lucide-react";
import type { ViewKey } from "@/lib/store";

export interface NavItem {
  key: ViewKey;
  labelKey: string;
  icon: LucideIcon;
}
export interface NavGroup {
  titleKey: string;
  items: NavItem[];
}

export const NAV: NavGroup[] = [
  {
    titleKey: "dashboard",
    items: [{ key: "dashboard", labelKey: "dashboard", icon: LayoutDashboard }],
  },
  {
    titleKey: "groupOperations",
    items: [
      { key: "appointments", labelKey: "appointments", icon: CalendarClock },
      { key: "jobCards", labelKey: "jobCards", icon: Wrench },
      { key: "estimates", labelKey: "estimates", icon: FileText },
      { key: "customers", labelKey: "customers", icon: Users },
      { key: "vehicles", labelKey: "vehicles", icon: Car },
    ],
  },
  {
    titleKey: "groupCatalog",
    items: [
      { key: "services", labelKey: "services", icon: Settings2 },
      { key: "inventory", labelKey: "inventory", icon: Package },
      { key: "pos", labelKey: "pos", icon: ScanLine },
      { key: "suppliers", labelKey: "suppliers", icon: Truck },
      { key: "purchases", labelKey: "purchases", icon: ShoppingCart },
    ],
  },
  {
    titleKey: "groupFinance",
    items: [
      { key: "invoices", labelKey: "invoices", icon: Receipt },
      { key: "payments", labelKey: "payments", icon: Wallet },
      { key: "accounts", labelKey: "accounts", icon: Landmark },
      { key: "expenses", labelKey: "expenses", icon: TrendingDown },
      { key: "warranties", labelKey: "warranties", icon: ShieldCheck },
      { key: "reports", labelKey: "reports", icon: BarChart3 },
    ],
  },
  {
    titleKey: "groupSystem",
    items: [
      { key: "technicians", labelKey: "technicians", icon: UserCog },
      { key: "auditLogs", labelKey: "auditLogs", icon: ScrollText },
      { key: "settings", labelKey: "settings", icon: Settings2 },
    ],
  },
];
