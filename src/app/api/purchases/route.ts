import { db } from "@/lib/db";
import { getTenantId, nextCode, writeAudit } from "@/lib/api";
import { denyWithoutPermission } from "@/lib/guards";
import { getTaxConfig, calculateTax, calculateGrandTotal } from "@/lib/tax";
import { NextResponse } from "next/server";

export async function GET() {
  const tenantId = await getTenantId();
  const items = await db.purchase.findMany({
    where: { tenantId },
    include: { supplier: true, warehouse: true, items: { include: { part: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  const tenantId = await getTenantId();
  const body = await req.json();
  const code = await nextCode("PO-", "purchase", tenantId);
  const items = (body.items || []) as Array<{ partId: string; quantity: number; unitCost: number }>;
  const total = items.reduce((s, i) => s + i.quantity * i.unitCost, 0);
  // Purchases have no discount — apply tenant tax on the net total.
  const taxConfig = await getTaxConfig(tenantId);
  const tax = calculateTax(total, 0, taxConfig);
  const grandTotal = calculateGrandTotal(total, 0, tax);
  const status = body.status || "received";

  const purchase = await db.$transaction(async (tx) => {
    const p = await tx.purchase.create({
      data: {
        tenantId,
        code,
        supplierId: body.supplierId,
        warehouseId: body.warehouseId || null,
        date: body.date ? new Date(body.date) : new Date(),
        status,
        total,
        tax,
        grandTotal,
        // When marked as paid, the supplier is paid the full grand total (incl. tax).
        paid: status === "paid" ? grandTotal : 0,
        items: { create: items.map((i) => ({ partId: i.partId, quantity: i.quantity, unitCost: i.unitCost, total: i.quantity * i.unitCost })) },
      },
      include: { items: true },
    });
    // Increase stock on receive
    for (const i of items) {
      await tx.part.update({ where: { id: i.partId }, data: { quantity: { increment: i.quantity } } });
      await tx.stockMovement.create({ data: { tenantId, partId: i.partId, warehouseId: body.warehouseId || null, type: "in", quantity: i.quantity, refType: "purchase", refId: p.id, note: "Received via " + code } });
    }
    return p;
  });
  await writeAudit(tenantId, "created", "purchases", code);
  return NextResponse.json(purchase, { status: 201 });
}

export async function PATCH(req: Request) {
  const denied = await denyWithoutPermission("purchases", "edit");
  if (denied) return denied;

  const tenantId = await getTenantId();
  const body = await req.json();
  const { id, ...fields } = body;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const existing = await db.purchase.findFirst({ where: { id, tenantId }, include: { items: true } });
  if (!existing) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const items = Array.isArray(fields.items) ? fields.items as Array<{ partId: string; quantity: number; unitCost: number }> : null;

  const purchase = await db.$transaction(async (tx) => {
    if (items) {
      for (const i of existing.items) {
        await tx.part.update({ where: { id: i.partId }, data: { quantity: { decrement: i.quantity } } });
        await tx.stockMovement.create({
          data: { tenantId, partId: i.partId, warehouseId: existing.warehouseId, type: "out", quantity: i.quantity, refType: "purchase", refId: id, note: `Reversed edit ${existing.code}` },
        });
      }
      await tx.purchaseItem.deleteMany({ where: { purchaseId: id } });
      const total = items.reduce((s, i) => s + i.quantity * i.unitCost, 0);
      const taxConfig = await getTaxConfig(tenantId);
      const tax = calculateTax(total, 0, taxConfig);
      const grandTotal = calculateGrandTotal(total, 0, tax);
      for (const i of items) {
        await tx.part.update({ where: { id: i.partId }, data: { quantity: { increment: i.quantity } } });
        await tx.stockMovement.create({
          data: { tenantId, partId: i.partId, warehouseId: fields.warehouseId || existing.warehouseId, type: "in", quantity: i.quantity, refType: "purchase", refId: id, note: `Received via ${existing.code}` },
        });
      }
      return tx.purchase.update({
        where: { id },
        data: {
          supplierId: fields.supplierId || existing.supplierId,
          warehouseId: fields.warehouseId !== undefined ? (fields.warehouseId || null) : existing.warehouseId,
          date: fields.date ? new Date(fields.date) : existing.date,
          status: fields.status || existing.status,
          total,
          tax,
          grandTotal,
          paid: (fields.status || existing.status) === "paid" ? grandTotal : existing.paid,
          items: { create: items.map((i) => ({ partId: i.partId, quantity: i.quantity, unitCost: i.unitCost, total: i.quantity * i.unitCost })) },
        },
        include: { supplier: true, warehouse: true, items: { include: { part: true } } },
      });
    }

    const data: any = {};
    if (fields.supplierId !== undefined) data.supplierId = fields.supplierId;
    if (fields.warehouseId !== undefined) data.warehouseId = fields.warehouseId || null;
    if (fields.date !== undefined) data.date = new Date(fields.date);
    if (fields.status !== undefined) {
      data.status = fields.status;
      if (fields.status === "paid") data.paid = existing.grandTotal;
    }
    return tx.purchase.update({
      where: { id },
      data,
      include: { supplier: true, warehouse: true, items: { include: { part: true } } },
    });
  });

  await writeAudit(tenantId, "updated", "purchases", existing.code);
  return NextResponse.json(purchase);
}

export async function DELETE(req: Request) {
  const denied = await denyWithoutPermission("purchases", "delete");
  if (denied) return denied;

  const tenantId = await getTenantId();
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const existing = await db.purchase.findFirst({ where: { id, tenantId }, include: { items: true } });
  if (!existing) return NextResponse.json({ error: "not_found" }, { status: 404 });

  await db.$transaction(async (tx) => {
    for (const i of existing.items) {
      await tx.part.update({ where: { id: i.partId }, data: { quantity: { decrement: i.quantity } } });
      await tx.stockMovement.create({
        data: { tenantId, partId: i.partId, warehouseId: existing.warehouseId, type: "out", quantity: i.quantity, refType: "purchase", refId: id, note: `Reversed delete ${existing.code}` },
      });
    }
    await tx.purchase.delete({ where: { id } });
  });

  await writeAudit(tenantId, "deleted", "purchases", existing.code);
  return NextResponse.json({ ok: true });
}
