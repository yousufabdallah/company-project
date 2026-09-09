import { db } from "@/lib/db";
import { getSession } from "@/lib/auth-server";

// Tenant resolution:
// 1. From the authenticated session (real auth + super-admin impersonation)
// 2. Fallback: the demo workshop (first non-platform tenant that has users)
export async function getTenant() {
  const tenantId = await getTenantId();
  return db.tenant.findUnique({ where: { id: tenantId } });
}

export async function getTenantId() {
  // 1. Session-based tenant
  const session = await getSession();
  if (session?.tenantId) {
    const tenant = await db.tenant.findUnique({
      where: { id: session.tenantId },
      select: { id: true, name: true },
    });
    if (tenant && tenant.name !== "Platform Administration") {
      return tenant.id;
    }
  }

  // 2. Fallback (no session / platform session): the seeded workshop
  const fallback = await db.tenant.findFirst({
    where: { name: { not: "Platform Administration" }, users: { some: {} } },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  if (fallback) return fallback.id;

  // 3. Last resort: any non-platform tenant
  const any = await db.tenant.findFirst({
    where: { name: { not: "Platform Administration" } },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  return any!.id;
}

export function json(data: unknown, init?: ResponseInit) {
  return Response.json(data, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
  });
}

export function parseBody<T = any>(body: any): T {
  return (body ?? {}) as T;
}

export async function writeAudit(tenantId: string, action: string, module: string, record?: string | null) {
  const session = await getSession();
  await db.auditLog.create({
    data: { tenantId, userId: session?.id ?? null, action, module, record: record || null },
  });
}

// Build sequential codes per tenant
export async function nextCode(prefix: string, model: string, tenantId: string) {
  const count = await (db as any)[model].count({ where: { tenantId } });
  return `${prefix}${String(count + 1).padStart(5, "0")}`;
}
