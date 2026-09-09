import { db } from "@/lib/db";
import { getTenantId, writeAudit } from "@/lib/api";
import { denyWithoutPermission } from "@/lib/guards";
import { getTaxConfig, calculateTax, calculateGrandTotal } from "@/lib/tax";
import { NextResponse } from "next/server";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: RouteContext) {
  const { id } = await params;
  const tenantId = await getTenantId();
  const estimate = await db.estimate.findFirst({
    where: { id, tenantId },
    include: { customer: true, vehicle: true, items: true },
  });
  if (!estimate) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json(estimate);
}

export async function PUT(req: Request, { params }: RouteContext) {
  const denied = await denyWithoutPermission("estimates", "edit");
  if (denied) return denied;

  const { id } = await params;
  const tenantId = await getTenantId();
  const body = await req.json();
  const existing = await db.estimate.findFirst({ where: { id, tenantId } });
  if (!existing) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const items = (body.items || []) as Array<{ type: string; name: string; quantity: number; unitPrice: number; discount: number; total: number }>;
  const laborTotal = items.filter((i) => i.type === "service").reduce((s, i) => s + Number(i.total), 0);
  const partsTotal = items.filter((i) => i.type === "part").reduce((s, i) => s + Number(i.total), 0);
  const subtotal = laborTotal + partsTotal;
  const discount = Number(body.discount ?? existing.discount) || 0;
  const taxConfig = await getTaxConfig(tenantId);
  const tax = calculateTax(subtotal, discount, taxConfig);
  const grandTotal = calculateGrandTotal(subtotal, discount, tax);

  const estimate = await db.$transaction(async (tx) => {
    await tx.estimateItem.deleteMany({ where: { estimateId: id } });
    return tx.estimate.update({
      where: { id },
      data: {
        customerId: body.customerId || existing.customerId,
        vehicleId: body.vehicleId || null,
        laborTotal,
        partsTotal,
        discount,
        tax,
        grandTotal,
        notes: body.notes !== undefined ? (body.notes || null) : existing.notes,
        status: body.status || existing.status,
        items: { create: items.map((i) => ({ type: i.type, name: i.name, quantity: Number(i.quantity) || 1, unitPrice: Number(i.unitPrice) || 0, discount: Number(i.discount) || 0, total: Number(i.total) || 0 })) },
      },
      include: { customer: true, vehicle: true, items: true },
    });
  });

  await writeAudit(tenantId, "updated", "estimates", estimate.code);
  return NextResponse.json(estimate);
}

export async function DELETE(_req: Request, { params }: RouteContext) {
  const denied = await denyWithoutPermission("estimates", "delete");
  if (denied) return denied;

  const { id } = await params;
  const tenantId = await getTenantId();
  const existing = await db.estimate.findFirst({ where: { id, tenantId } });
  if (!existing) return NextResponse.json({ error: "not_found" }, { status: 404 });

  await db.estimate.delete({ where: { id } });
  await writeAudit(tenantId, "deleted", "estimates", existing.code);
  return NextResponse.json({ ok: true });
}
