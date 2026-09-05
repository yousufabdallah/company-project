import { db } from "@/lib/db";
import { getTenantId } from "@/lib/api";
import { denyWithoutPermission } from "@/lib/guards";
import { getSession } from "@/lib/auth-server";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const tenantId = await getTenantId();
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || "";
  const lowOnly = searchParams.get("low") === "1";
  const where: any = { tenantId, deleted: false };
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
  const denied = await denyWithoutPermission("inventory", "create");
  if (denied) return denied;

  const tenantId = await getTenantId();
  const body = await req.json();
  if (!body.sku?.trim() || !body.name?.trim()) return NextResponse.json({ error: "sku_and_name_required" }, { status: 400 });
  const part = await db.part.create({
    data: {
      tenantId,
      sku: body.sku.trim(),
      barcode: body.barcode || null,
      name: body.name.trim(),
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
  const session = await getSession();
  await db.auditLog.create({ data: { tenantId, userId: session?.id ?? null, action: "created", module: "inventory", record: part.sku } });
  return NextResponse.json(part, { status: 201 });
}

// PATCH — update an existing part
export async function PATCH(req: Request) {
  const denied = await denyWithoutPermission("inventory", "edit");
  if (denied) return denied;

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
  const session = await getSession();
  await db.auditLog.create({ data: { tenantId, userId: session?.id ?? null, action: "updated", module: "inventory", record: part.sku } });
  return NextResponse.json(part);
}

// DELETE — soft-delete a part (?id=...). Stock movements, job card parts and
// purchase history keep resolving the flagged record.
export async function DELETE(req: Request) {
  const denied = await denyWithoutPermission("inventory", "delete");
  if (denied) return denied;

  const tenantId = await getTenantId();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const existing = await db.part.findFirst({ where: { id, tenantId } });
  if (!existing) return NextResponse.json({ error: "not_found" }, { status: 404 });

  await db.part.update({ where: { id }, data: { deleted: true } });
  const session = await getSession();
  await db.auditLog.create({ data: { tenantId, userId: session?.id ?? null, action: "deleted", module: "inventory", record: existing.sku } });
  return NextResponse.json({ ok: true });
}
