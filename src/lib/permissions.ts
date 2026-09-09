// Permission system — defines all modules, their actions, and default
// permissions per role. Stored as JSON on the User model.

export type Action = "view" | "create" | "edit" | "delete";
export type ModuleKey =
  | "dashboard"
  | "customers"
  | "vehicles"
  | "appointments"
  | "estimates"
  | "jobCards"
  | "services"
  | "inventory"
  | "pos"
  | "accounts"
  | "suppliers"
  | "purchases"
  | "invoices"
  | "payments"
  | "expenses"
  | "warranties"
  | "reports"
  | "technicians"
  | "users"
  | "auditLogs"
  | "settings";

export interface ModuleDef {
  key: ModuleKey;
  labelKey: string; // i18n key for module name
  actions: Action[]; // which actions apply to this module
}

// Modules that have create/edit/delete (most do; some are view-only)
export const MODULES: ModuleDef[] = [
  { key: "jobCards", labelKey: "jobCards", actions: ["view", "create", "edit", "delete"] },
  { key: "customers", labelKey: "customers", actions: ["view", "create", "edit", "delete"] },
  { key: "vehicles", labelKey: "vehicles", actions: ["view", "create", "edit", "delete"] },
  { key: "appointments", labelKey: "appointments", actions: ["view", "create", "edit", "delete"] },
  { key: "estimates", labelKey: "estimates", actions: ["view", "create", "edit", "delete"] },
  { key: "invoices", labelKey: "invoices", actions: ["view", "create", "edit", "delete"] },
  { key: "payments", labelKey: "payments", actions: ["view", "create", "edit", "delete"] },
  { key: "expenses", labelKey: "expenses", actions: ["view", "create", "edit", "delete"] },
  { key: "inventory", labelKey: "inventory", actions: ["view", "create", "edit", "delete"] },
  { key: "pos", labelKey: "pos", actions: ["view", "create"] },
  { key: "purchases", labelKey: "purchases", actions: ["view", "create", "edit", "delete"] },
  { key: "suppliers", labelKey: "suppliers", actions: ["view", "create", "edit", "delete"] },
  { key: "services", labelKey: "services", actions: ["view", "create", "edit", "delete"] },
  { key: "accounts", labelKey: "accounts", actions: ["view"] },
  { key: "reports", labelKey: "reports", actions: ["view"] },
  { key: "warranties", labelKey: "warranties", actions: ["view", "create", "edit", "delete"] },
  { key: "technicians", labelKey: "technicians", actions: ["view"] },
  { key: "auditLogs", labelKey: "auditLogs", actions: ["view"] },
  { key: "users", labelKey: "users", actions: ["view", "create", "edit", "delete"] },
  { key: "settings", labelKey: "settings", actions: ["view"] },
  { key: "dashboard", labelKey: "dashboard", actions: ["view"] },
];

// Default permissions per role (used when creating a new user or when
// the permissions field is null/empty).
export const ROLE_DEFAULTS: Record<string, Record<string, boolean>> = {
  owner: Object.fromEntries(
    MODULES.flatMap((m) => m.actions.map((a) => [`${m.key}.${a}`, true]))
  ),
  manager: Object.fromEntries(
    MODULES.flatMap((m) =>
      m.actions.map((a) => [`${m.key}.${a}`, m.key === "settings" ? false : true])
    )
  ),
  advisor: Object.fromEntries(
    MODULES.flatMap((m) => {
      const canManage = ["customers", "vehicles", "appointments", "estimates", "jobCards"].includes(m.key);
      const canView = ["dashboard", "invoices", "payments", "services", "inventory", "pos", "reports", "technicians", "warranties"].includes(m.key);
      return m.actions.map((a) => [`${m.key}.${a}`, a === "view" ? (canManage || canView) : canManage]);
    })
  ),
  technician: Object.fromEntries(
    MODULES.flatMap((m) => {
      // Technician: can view job cards + edit them (update status), view customers/vehicles/services
      const canView = ["dashboard", "jobCards", "customers", "vehicles", "services", "warranties", "reports", "technicians"].includes(m.key);
      const canEdit = m.key === "jobCards"; // can update job card status
      return m.actions.map((a) => [`${m.key}.${a}`, a === "view" ? canView : a === "edit" ? canEdit : false]);
    })
  ),
  accountant: Object.fromEntries(
    MODULES.flatMap((m) => {
      const canManage = ["invoices", "payments", "expenses", "accounts"].includes(m.key);
      const canView = ["dashboard", "customers", "vehicles", "jobCards", "reports", "warranties", "technicians"].includes(m.key);
      return m.actions.map((a) => [`${m.key}.${a}`, a === "view" ? (canManage || canView) : canManage]);
    })
  ),
  inventory: Object.fromEntries(
    MODULES.flatMap((m) => {
      const canManage = ["inventory", "suppliers", "purchases", "services"].includes(m.key);
      const canView = ["dashboard", "pos", "reports", "warranties"].includes(m.key);
      return m.actions.map((a) => [`${m.key}.${a}`, a === "view" ? (canManage || canView) : canManage]);
    })
  ),
};

export function getRoleDefaults(role: string): Record<string, boolean> {
  return ROLE_DEFAULTS[role] || ROLE_DEFAULTS.advisor;
}

export function hasPermission(
  permissions: Record<string, boolean> | null | undefined,
  module: string,
  action: Action
): boolean {
  if (!permissions) return false;
  return permissions[`${module}.${action}`] === true;
}
