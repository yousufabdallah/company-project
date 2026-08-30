import { db } from "@/lib/db";
import { getTenantId } from "@/lib/api";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const tenantId = await getTenantId();
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || "";
  const lowOnly = searchParams.get("low") === "1";
  const where: any = { tenantId };
  if (q) where.OR = [{ name: { contains: q } }, { sku: { contains: q } }, { barcode: { contains: q } }, { nameAr: { contains: q } }];
  const items = await db.part.findMany({
    where,
    include: { category: true, supplier: true },
    orderBy: { name: "asc" },
    take: 300,
  });
  const filtered = lowOnly ? items.filter((p) => p.quantity <= p.minStock) : items;
  return NextResponse.json({ items: filtered });
}

export async function POST(req: Request) {
  const tenantId = await getTenantId();
  const body = await req.json();
  const part = await db.part.create({
    data: {
      tenantId,
      sku: body.sku,
      barcode: body.barcode || null,
      name: body.name,
      nameAr: body.nameAr || null,
      categoryId: body.categoryId || null,
      brand: body.brand || null,
      supplierId: body.supplierId || null,
      costPrice: Number(body.costPrice) || 0,
      sellingPrice: Number(body.sellingPrice) || 0,
      quantity: Number(body.quantity) || 0,
      minStock: Number(body.minStock) || 5,
      maxStock: Number(body.maxStock) || 100,
      location: body.location || null,
      warrantyMonths: Number(body.warrantyMonths) || 0,
    },
  });
  if (part.quantity > 0) {
    const wh = await db.warehouse.findFirst({ where: { tenantId } });
    await db.stockMovement.create({ data: { tenantId, partId: part.id, warehouseId: wh?.id, type: "in", quantity: part.quantity, refType: "opening", note: "Opening stock" } });
  }
  await db.auditLog.create({ data: { tenantId, action: "created", module: "inventory", record: part.sku } });
  return NextResponse.json(part, { status: 201 });
}

// PATCH — update an existing part
export async function PATCH(req: Request) {
  const tenantId = await getTenantId();
  const body = await req.json();
  const { id, ...fields } = body;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  // Verify ownership
  const existing = await db.part.findFirst({ where: { id, tenantId } });
  if (!existing) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const data: any = {};
  const allowed = ["sku", "barcode", "name", "nameAr", "categoryId", "brand", "supplierId", "costPrice", "sellingPrice", "quantity", "minStock", "maxStock", "location", "warrantyMonths"];
  for (const k of allowed) {
    if (k in fields) {
      if (["costPrice", "sellingPrice", "quantity", "minStock", "maxStock", "warrantyMonths"].includes(k)) {
        data[k] = Number(fields[k]) || 0;
      } else {
        data[k] = fields[k] || null;
      }
    }
  }

  // If quantity changed, record a stock movement
  if ("quantity" in fields) {
    const diff = Number(fields.quantity) - existing.quantity;
    if (diff !== 0) {
      const wh = await db.warehouse.findFirst({ where: { tenantId } });
      await db.stockMovement.create({
        data: {
          tenantId,
          partId: id,
          warehouseId: wh?.id,
          type: diff > 0 ? "in" : "out",
          quantity: Math.abs(diff),
          refType: "adjustment",
          note: `Stock adjusted from ${existing.quantity} to ${fields.quantity}`,
        },
      });
    }
  }

  const part = await db.part.update({ where: { id }, data, include: { category: true, supplier: true } });
  await db.auditLog.create({ data: { tenantId, action: "updated", module: "inventory", record: part.sku } });
  return NextResponse.json(part);
}

// DELETE — delete a part (soft: only if quantity is 0)
export async function DELETE(req: Request) {
  const tenantId = await getTenantId();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const existing = await db.part.findFirst({ where: { id, tenantId } });
  if (!existing) return NextResponse.json({ error: "not_found" }, { status: 404 });

  // Check if part is used in any job cards
  const usedInJobs = await db.jobCardPart.count({ where: { partId: id } });
  if (usedInJobs > 0) {
    return NextResponse.json({ error: "part_in_use", count: usedInJobs }, { status: 400 });
  }

  await db.part.delete({ where: { id } });
  await db.auditLog.create({ data: { tenantId, action: "deleted", module: "inventory", record: existing.sku } });
  return NextResponse.json({ ok: true });
}
