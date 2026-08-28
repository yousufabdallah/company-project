import { db } from "@/lib/db";
import { getTenantId } from "@/lib/api";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const tenantId = await getTenantId();
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || "";
  const where: any = { tenantId };
  if (q) where.OR = [{ name: { contains: q } }, { code: { contains: q } }];
  const items = await db.service.findMany({ where, orderBy: { code: "asc" }, take: 200 });
  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  const tenantId = await getTenantId();
  const body = await req.json();
  const svc = await db.service.create({
    data: {
      tenantId,
      code: body.code,
      name: body.name,
      description: body.description || null,
      durationHours: Number(body.durationHours) || 1,
      laborCost: Number(body.laborCost) || 0,
      price: Number(body.price) || 0,
      warrantyMonths: Number(body.warrantyMonths) || 0,
    },
  });
  await db.auditLog.create({ data: { tenantId, action: "created", module: "services", record: svc.code } });
  return NextResponse.json(svc, { status: 201 });
}
