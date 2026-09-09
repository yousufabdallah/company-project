import { db } from "@/lib/db";
import { getTenantId, writeAudit } from "@/lib/api";
import { denyWithoutPermission } from "@/lib/guards";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const tenantId = await getTenantId();
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || "";
  const where: any = { tenantId };
  if (q) where.OR = [{ name: { contains: q } }, { company: { contains: q } }, { phone: { contains: q } }];
  const items = await db.supplier.findMany({ where, orderBy: { name: "asc" }, take: 200 });
  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  const tenantId = await getTenantId();
  const body = await req.json();
  const sup = await db.supplier.create({
    data: {
      tenantId,
      name: body.name,
      company: body.company || null,
      phone: body.phone || null,
      whatsapp: body.whatsapp || null,
      email: body.email || null,
      address: body.address || null,
      taxNumber: body.taxNumber || null,
      paymentTerms: body.paymentTerms || null,
    },
  });
  await writeAudit(tenantId, "created", "suppliers", sup.name);
  return NextResponse.json(sup, { status: 201 });
}

export async function PATCH(req: Request) {
  const denied = await denyWithoutPermission("suppliers", "edit");
  if (denied) return denied;

  const tenantId = await getTenantId();
  const body = await req.json();
  const { id, ...fields } = body;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const existing = await db.supplier.findFirst({ where: { id, tenantId } });
  if (!existing) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const data: any = {};
  const allowed = ["name", "company", "phone", "whatsapp", "email", "address", "taxNumber", "paymentTerms"];
  for (const k of allowed) {
    if (k in fields) data[k] = typeof fields[k] === "string" ? (fields[k].trim() || null) : fields[k];
  }
  if (data.name !== undefined) data.name = String(data.name || "").trim();
  if (data.name !== undefined && !data.name) return NextResponse.json({ error: "required" }, { status: 400 });

  const sup = await db.supplier.update({ where: { id }, data });
  await writeAudit(tenantId, "updated", "suppliers", sup.name);
  return NextResponse.json(sup);
}

export async function DELETE(req: Request) {
  const denied = await denyWithoutPermission("suppliers", "delete");
  if (denied) return denied;

  const tenantId = await getTenantId();
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const existing = await db.supplier.findFirst({
    where: { id, tenantId },
    include: { _count: { select: { purchases: true } } },
  });
  if (!existing) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (existing._count.purchases > 0) return NextResponse.json({ error: "supplier_in_use" }, { status: 400 });

  await db.part.updateMany({ where: { supplierId: id }, data: { supplierId: null } });
  await db.supplier.delete({ where: { id } });
  await writeAudit(tenantId, "deleted", "suppliers", existing.name);
  return NextResponse.json({ ok: true });
}
