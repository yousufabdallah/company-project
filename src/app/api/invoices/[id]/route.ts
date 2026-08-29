import { db } from "@/lib/db";
import { getTenantId } from "@/lib/api";
import { NextResponse } from "next/server";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tenantId = await getTenantId();
  const invoice = await db.invoice.findFirst({
    where: { id, tenantId },
    include: { customer: true, vehicle: true, jobCard: true, items: true, payments: true },
  });
  if (!invoice) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const tenant = await db.tenant.findUnique({ where: { id: tenantId } });
  return NextResponse.json({ ...invoice, tenant });
}
