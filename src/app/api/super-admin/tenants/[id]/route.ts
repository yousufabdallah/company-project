import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth-server";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  // Protect this route — only authenticated super admins
  try {
    await requireSuperAdmin();
  } catch {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const { status } = body; // "active" | "suspended" | "trial"

  const tenant = await db.tenant.update({
    where: { id },
    data: { status },
  });

  return NextResponse.json(tenant);
}
