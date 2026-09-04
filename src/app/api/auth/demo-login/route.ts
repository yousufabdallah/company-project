import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createSession } from "@/lib/auth-server";
import { withEffectivePermissions } from "@/lib/guards";

// Demo login — logs in as a demo user by role.
// SECURITY: This endpoint is for development/demo only.
// It is automatically disabled in production builds.
export async function POST(req: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Demo login is disabled in production" }, { status: 403 });
  }

  const body = await req.json();
  const { role } = body;

  if (!role) {
    return NextResponse.json({ error: "Role is required" }, { status: 400 });
  }

  // Find the first active user with this role
  const user = await db.user.findFirst({
    where: { role, active: true },
    include: { tenant: { select: { name: true } } },
  });

  if (!user) {
    return NextResponse.json({ error: "No demo user found for this role" }, { status: 404 });
  }

  const sessionUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    tenantId: user.tenantId,
    tenantName: user.tenant?.name || null,
  };

  await createSession(sessionUser);

  return NextResponse.json(await withEffectivePermissions(sessionUser));
}
