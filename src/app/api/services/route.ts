import { db } from "@/lib/db";
import { getTenantId } from "@/lib/api";
import { getSession } from "@/lib/auth-server";
import { denyWithoutPermission } from "@/lib/guards";
import { createServiceSchema } from "@/lib/service-input";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const tenantId = await getTenantId();
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() || "";
  const active = searchParams.get("active");
  const where: any = { tenantId };
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { code: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
    ];
  }
  if (active === "1" || active === "true") where.active = true;
  if (active === "0" || active === "false") where.active = false;
  const items = await db.service.findMany({ where, orderBy: { code: "asc" }, take: 200 });
  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  const denied = await denyWithoutPermission("services", "create");
  if (denied) return denied;

  const tenantId = await getTenantId();
  const body = await req.json().catch(() => null);
  const parsed = createServiceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_service_data" }, { status: 400 });
  }

  const duplicate = await db.service.findFirst({
    where: { tenantId, code: { equals: parsed.data.code, mode: "insensitive" } },
    select: { id: true },
  });
  if (duplicate) {
    return NextResponse.json({ error: "service_code_in_use" }, { status: 409 });
  }

  const svc = await db.service.create({
    data: {
      tenantId,
      ...parsed.data,
    },
  });
  const session = await getSession();
  await db.auditLog.create({
    data: {
      tenantId,
      userId: session?.id ?? null,
      action: "created",
      module: "services",
      record: `${svc.code} · ${svc.name}`,
    },
  });
  return NextResponse.json(svc, { status: 201 });
}
