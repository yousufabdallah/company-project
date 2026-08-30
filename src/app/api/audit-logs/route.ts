import { db } from "@/lib/db";
import { getTenantId } from "@/lib/api";
import { NextResponse } from "next/server";

export async function GET() {
  const tenantId = await getTenantId();
  const items = await db.auditLog.findMany({
    where: { tenantId },
    include: { user: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return NextResponse.json({ items });
}
