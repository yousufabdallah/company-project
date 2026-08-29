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
