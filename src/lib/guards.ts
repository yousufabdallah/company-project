import { db } from "@/lib/db";
import { getSession } from "@/lib/auth-server";
import { getRoleDefaults, hasPermission, type Action } from "@/lib/permissions";
import { NextResponse } from "next/server";

// Server-side permission guard for mutating API routes.
// Mirrors the client-side usePermissions hook: owner/super_admin always pass,
// everyone else is checked against their stored permissions JSON — falling
// back to their role's defaults when none (or an empty object) are stored.

export function effectivePermissions(role: string, stored: string | null): Record<string, boolean> {
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (parsed && typeof parsed === "object" && Object.keys(parsed).length > 0) return parsed;
    } catch {
      // malformed JSON — fall back to role defaults
    }
  }
  return getRoleDefaults(role);
}

// Returns a denial response (401/403) when the caller may not perform
// module.action, or null when allowed. Usage:
//   const denied = await denyWithoutPermission("customers", "edit");
//   if (denied) return denied;
export async function denyWithoutPermission(module: string, action: Action): Promise<NextResponse | null> {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (session.role === "owner" || session.role === "super_admin") return null;

  const user = await db.user.findUnique({ where: { id: session.id } });
  if (!user || !user.active || user.tenantId !== session.tenantId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!hasPermission(effectivePermissions(user.role, user.permissions), module, action)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  return null;
}

// Attach effective permissions to a session payload (login/me responses) so
// the client can gate its UI the same way the server guards mutations.
export async function withEffectivePermissions<T extends { id: string; role: string }>(
  session: T
): Promise<T & { permissions: Record<string, boolean> }> {
  const user = await db.user.findUnique({ where: { id: session.id }, select: { role: true, permissions: true } });
  return { ...session, permissions: effectivePermissions(user?.role ?? session.role, user?.permissions ?? null) };
}
