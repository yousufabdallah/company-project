import { db } from "@/lib/db";
import { getTenantId, nextCode } from "@/lib/api";
import { denyWithoutPermission } from "@/lib/guards";
import { getSession } from "@/lib/auth-server";
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
  const denied = await denyWithoutPermission("customers", "create");
  if (denied) return denied;

  const tenantId = await getTenantId();
  const body = await req.json();
  const name = body.name?.trim();
  const mobile = body.mobile?.trim();
  if (!name || !mobile) return NextResponse.json({ error: "name_and_mobile_required" }, { status: 400 });

  const code = await nextCode("CUST-", "customer", tenantId);
  const customer = await db.customer.create({
    data: {
      tenantId,
      code,
      name,
      mobile,
      whatsapp: body.whatsapp?.trim() || mobile,
      email: body.email?.trim() || null,
      address: body.address?.trim() || null,
      type: body.type === "corporate" ? "corporate" : "individual",
      notes: body.notes?.trim() || null,
    },
  });
  const session = await getSession();
  await db.auditLog.create({ data: { tenantId, userId: session?.id ?? null, action: "created", module: "customers", record: `${customer.code} · ${customer.name}` } });
  return NextResponse.json(customer, { status: 201 });
}
