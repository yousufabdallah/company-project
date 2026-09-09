import { db } from "@/lib/db";
import { getTenantId, nextCode, writeAudit } from "@/lib/api";
import { denyWithoutPermission } from "@/lib/guards";
import { getTaxConfig, calculateTax, calculateGrandTotal } from "@/lib/tax";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const tenantId = await getTenantId();
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const where: any = { tenantId };
  if (status) where.status = status;
  const items = await db.estimate.findMany({
    where,
    include: { customer: true, vehicle: true, items: true },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  const tenantId = await getTenantId();
  const body = await req.json();
  const code = await nextCode("EST-", "estimate", tenantId);

  const items = (body.items || []) as Array<{ type: string; name: string; quantity: number; unitPrice: number; discount: number; total: number }>;
  const laborTotal = items.filter((i) => i.type === "service").reduce((s, i) => s + Number(i.total), 0);
  const partsTotal = items.filter((i) => i.type === "part").reduce((s, i) => s + Number(i.total), 0);
  const subtotal = laborTotal + partsTotal;
  const discount = Number(body.discount) || 0;
  const taxConfig = await getTaxConfig(tenantId);
  const tax = calculateTax(subtotal, discount, taxConfig);
  const grandTotal = calculateGrandTotal(subtotal, discount, tax);

  const estimate = await db.estimate.create({
    data: {
      tenantId,
      code,
      customerId: body.customerId,
      vehicleId: body.vehicleId || null,
      laborTotal,
      partsTotal,
      discount,
      tax,
      grandTotal,
      status: "pending",
      notes: body.notes || null,
      items: { create: items },
    },
    include: { items: true },
  });
  await db.auditLog.create({ data: { tenantId, action: "created", module: "estimates", record: code } });
  return NextResponse.json(estimate, { status: 201 });
}

export async function PATCH(req: Request) {
  const denied = await denyWithoutPermission("estimates", "edit");
  if (denied) return denied;

  const tenantId = await getTenantId();
  const body = await req.json();
  const { id, status } = body;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const existing = await db.estimate.findFirst({ where: { id, tenantId } });
  if (!existing) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const est = await db.estimate.update({ where: { id }, data: { status } });
  await writeAudit(tenantId, "estimate_status_changed", "estimates", existing.code + " → " + status);
  return NextResponse.json(est);
}
