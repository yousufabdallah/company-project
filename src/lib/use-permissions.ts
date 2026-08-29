"use client";

import { useApp } from "@/lib/store";
import { hasPermission as checkPermission, getRoleDefaults, type Action } from "@/lib/permissions";

// Hook that provides permission checking for the current logged-in user.
// Falls back to role defaults if no explicit permissions are stored.
export function usePermissions() {
  const user = useApp((s) => s.user);

  // Parse user permissions (stored as the permissions object from the API)
  // If user has no explicit permissions, use role defaults
  const permissions = (user as any)?.permissions || getRoleDefaults(user?.role || "advisor");

  const has = (module: string, action: Action): boolean => {
    // Owner and super_admin always have full access
    if (user?.role === "owner" || user?.role === "super_admin") return true;
    return checkPermission(permissions, module, action);
  };

  const canView = (module: string): boolean => has(module, "view");
  const canCreate = (module: string): boolean => has(module, "create");
  const canEdit = (module: string): boolean => has(module, "edit");
  const canDelete = (module: string): boolean => has(module, "delete");

  return { has, canView, canCreate, canEdit, canDelete, permissions };
}
