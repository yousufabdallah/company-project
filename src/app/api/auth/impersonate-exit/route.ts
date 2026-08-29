import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { getSession, createSession } from "@/lib/auth-server";

// Exit workshop impersonation: restores the super admin session
// to the Platform Administration tenant.
export async function POST() {
  const session = await getSession();
  if (!session || session.role !== "super_admin") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const platform = await db.tenant.findFirst({ where: { name: "Platform Administration" } });
  const restored = {
    ...session,
    tenantId: platform?.id ?? null,
    tenantName: platform?.name ?? null,
  };

  await createSession(restored);
  return NextResponse.json(restored);
}
