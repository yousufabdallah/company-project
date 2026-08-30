import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { requireSuperAdmin, getSession, createSession } from "@/lib/auth-server";

// Super admin impersonation: enter any workshop as the super admin.
// Creates a session scoped to the target tenant so all workshop APIs
// resolve to that tenant's data.
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSuperAdmin();
  } catch {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  const tenant = await db.tenant.findUnique({ where: { id } });
  if (!tenant) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const impersonated = {
    ...session,
    tenantId: tenant.id,
    tenantName: tenant.name,
  };

  await createSession(impersonated);
  return NextResponse.json(impersonated);
}
