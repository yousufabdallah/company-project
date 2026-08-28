import { db } from "@/lib/db";

// In this preview demo there is a single seeded tenant.
// A real SaaS would resolve tenantId from the authenticated session.
export async function getTenant() {
  const tenant = await db.tenant.findFirst({ orderBy: { createdAt: "asc" } });
  return tenant;
}

export async function getTenantId() {
  const t = await getTenant();
  return t!.id;
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

// Build sequential codes per tenant
export async function nextCode(prefix: string, model: string, tenantId: string) {
  const count = await (db as any)[model].count({ where: { tenantId } });
  return `${prefix}${String(count + 1).padStart(5, "0")}`;
}
