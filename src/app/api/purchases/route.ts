import { db } from "@/lib/db";
import { getTenantId, nextCode } from "@/lib/api";
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

  const purchase = await db.$transaction(async (tx) => {
    const p = await tx.purchase.create({
      data: {
        tenantId,
        code,
        supplierId: body.supplierId,
        warehouseId: body.warehouseId || null,
        date: body.date ? new Date(body.date) : new Date(),
        status: body.status || "received",
        total,
        paid: body.status === "paid" ? total : 0,
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
  await db.auditLog.create({ data: { tenantId, action: "created", module: "purchases", record: code } });
  return NextResponse.json(purchase, { status: 201 });
}
