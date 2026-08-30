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

  const data: any = {};

  // Account status (active | suspended | trial)
  if ("status" in body) data.status = body.status;

  // Subscription management
  if ("planId" in body) {
    if (body.planId) {
      const plan = await db.plan.findUnique({ where: { id: body.planId } });
      if (!plan) return NextResponse.json({ error: "plan_not_found" }, { status: 404 });
      data.planId = plan.id;
      data.plan = plan.name; // keep display name in sync
    } else {
      data.planId = null;
    }
  }
  if ("subscriptionStatus" in body) data.subscriptionStatus = body.subscriptionStatus;
  if ("subscriptionExpiry" in body) {
    data.subscriptionExpiry = body.subscriptionExpiry ? new Date(body.subscriptionExpiry) : null;
  }

  const tenant = await db.tenant.update({ where: { id }, data });
  return NextResponse.json(tenant);
}
