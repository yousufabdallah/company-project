import { db } from "@/lib/db";
import { getTenantId, nextCode } from "@/lib/api";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const tenantId = await getTenantId();
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || "";
  const type = searchParams.get("type") || "";

  const where: any = { tenantId };
  if (q) where.OR = [{ name: { contains: q } }, { mobile: { contains: q } }, { code: { contains: q } }, { email: { contains: q } }];
  if (type) where.type = type;

  const items = await db.customer.findMany({
    where,
    include: { vehicles: { select: { id: true, plateNumber: true, make: true, model: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  const tenantId = await getTenantId();
  const body = await req.json();
  const code = await nextCode("CUST-", "customer", tenantId);
  const customer = await db.customer.create({
    data: {
      tenantId,
      code,
      name: body.name,
      mobile: body.mobile,
      whatsapp: body.whatsapp || body.mobile,
      email: body.email || null,
      address: body.address || null,
      type: body.type || "individual",
      notes: body.notes || null,
    },
  });
  await db.auditLog.create({ data: { tenantId, action: "created", module: "customers", record: customer.code } });
  return NextResponse.json(customer, { status: 201 });
}
