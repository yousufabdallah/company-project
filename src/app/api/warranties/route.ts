import { db } from "@/lib/db";
import { getTenantId, writeAudit } from "@/lib/api";
import { denyWithoutPermission } from "@/lib/guards";
import { NextResponse } from "next/server";

export async function GET() {
  const tenantId = await getTenantId();
  const items = await db.warranty.findMany({
    where: { tenantId },
    include: { jobCard: { include: { customer: true, vehicle: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  const denied = await denyWithoutPermission("warranties", "create");
  if (denied) return denied;

  const tenantId = await getTenantId();
  const body = await req.json();
  const periodMonths = Number(body.periodMonths) || 0;
  if (!body.jobCardId || periodMonths <= 0) return NextResponse.json({ error: "required" }, { status: 400 });

  const jobCard = await db.jobCard.findFirst({ where: { id: body.jobCardId, tenantId } });
  if (!jobCard) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const startDate = body.startDate ? new Date(body.startDate) : new Date();
  const expiryDate = body.expiryDate
    ? new Date(body.expiryDate)
    : new Date(startDate.getTime() + periodMonths * 30 * 24 * 60 * 60 * 1000);

  const warranty = await db.warranty.create({
    data: {
      tenantId,
      type: body.type || "service",
      refId: body.refId || body.jobCardId,
      jobCardId: body.jobCardId,
      partId: body.partId || null,
      serviceId: body.serviceId || null,
      periodMonths,
      startDate,
      expiryDate,
      terms: body.terms || null,
    },
    include: { jobCard: { include: { customer: true, vehicle: true } } },
  });
  await writeAudit(tenantId, "created", "warranties", warranty.id);
  return NextResponse.json(warranty, { status: 201 });
}

export async function PATCH(req: Request) {
  const denied = await denyWithoutPermission("warranties", "edit");
  if (denied) return denied;

  const tenantId = await getTenantId();
  const body = await req.json();
  const { id, ...fields } = body;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const existing = await db.warranty.findFirst({ where: { id, tenantId } });
  if (!existing) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const data: any = {};
  if (fields.type !== undefined) data.type = fields.type;
  if (fields.jobCardId !== undefined) data.jobCardId = fields.jobCardId || null;
  if (fields.periodMonths !== undefined) data.periodMonths = Number(fields.periodMonths) || existing.periodMonths;
  if (fields.startDate !== undefined) data.startDate = new Date(fields.startDate);
  if (fields.expiryDate !== undefined) data.expiryDate = new Date(fields.expiryDate);
  if (fields.terms !== undefined) data.terms = fields.terms || null;
  if (fields.partId !== undefined) data.partId = fields.partId || null;
  if (fields.serviceId !== undefined) data.serviceId = fields.serviceId || null;
  if (data.jobCardId && !fields.expiryDate && (fields.periodMonths !== undefined || fields.startDate !== undefined)) {
    const start = data.startDate || existing.startDate;
    const months = data.periodMonths || existing.periodMonths;
    data.expiryDate = new Date(start.getTime() + months * 30 * 24 * 60 * 60 * 1000);
  }

  const warranty = await db.warranty.update({
    where: { id },
    data,
    include: { jobCard: { include: { customer: true, vehicle: true } } },
  });
  await writeAudit(tenantId, "updated", "warranties", id);
  return NextResponse.json(warranty);
}

export async function DELETE(req: Request) {
  const denied = await denyWithoutPermission("warranties", "delete");
  if (denied) return denied;

  const tenantId = await getTenantId();
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const existing = await db.warranty.findFirst({ where: { id, tenantId } });
  if (!existing) return NextResponse.json({ error: "not_found" }, { status: 404 });

  await db.warranty.delete({ where: { id } });
  await writeAudit(tenantId, "deleted", "warranties", id);
  return NextResponse.json({ ok: true });
}
