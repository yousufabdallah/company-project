import { db } from "@/lib/db";
import { getTenantId } from "@/lib/api";
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
  await db.auditLog.create({ data: { tenantId, action: "created", module: "suppliers", record: sup.name } });
  return NextResponse.json(sup, { status: 201 });
}
