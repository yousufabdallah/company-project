import { db } from "@/lib/db";
import { getTenantId } from "@/lib/api";
import { denyWithoutPermission } from "@/lib/guards";
import { getSession } from "@/lib/auth-server";
import { NextResponse } from "next/server";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tenantId = await getTenantId();
  const customer = await db.customer.findFirst({
    where: { id, tenantId },
    include: {
      vehicles: true,
      jobCards: { include: { vehicle: true, technician: true }, orderBy: { createdAt: "desc" } },
      invoices: { orderBy: { createdAt: "desc" }, take: 20 },
      payments: { orderBy: { date: "desc" }, take: 20 },
      appointments: { include: { vehicle: true, service: true }, orderBy: { date: "desc" }, take: 20 },
      estimates: { orderBy: { createdAt: "desc" }, take: 20 },
    },
  });
  if (!customer) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const totalSpent = await db.payment.aggregate({ where: { customerId: id }, _sum: { amount: true } });
  return NextResponse.json({ ...customer, totalSpent: totalSpent._sum.amount ?? 0 });
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await denyWithoutPermission("customers", "edit");
  if (denied) return denied;

  const { id } = await params;
  const tenantId = await getTenantId();
  const body = await req.json();

  const existing = await db.customer.findFirst({ where: { id, tenantId } });
  if (!existing) return NextResponse.json({ error: "not_found" }, { status: 404 });

  // Whitelisted fields only — never spread the request body straight in
  const data: any = {};
  if (body.name !== undefined) data.name = typeof body.name === "string" ? body.name.trim() : "";
  if (body.mobile !== undefined) data.mobile = typeof body.mobile === "string" ? body.mobile.trim() : "";
  if (body.whatsapp !== undefined) data.whatsapp = body.whatsapp?.trim() || null;
  if (body.email !== undefined) data.email = body.email?.trim() || null;
  if (body.address !== undefined) data.address = body.address?.trim() || null;
  if (body.type !== undefined) data.type = body.type === "corporate" ? "corporate" : "individual";
  if (body.notes !== undefined) data.notes = body.notes?.trim() || null;
  if ((data.name !== undefined && !data.name) || (data.mobile !== undefined && !data.mobile)) {
    return NextResponse.json({ error: "name_and_mobile_required" }, { status: 400 });
  }

  const customer = await db.customer.update({ where: { id }, data });
  const session = await getSession();
  await db.auditLog.create({ data: { tenantId, userId: session?.id ?? null, action: "updated", module: "customers", record: `${customer.code} · ${customer.name}` } });
  return NextResponse.json(customer);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await denyWithoutPermission("customers", "delete");
  if (denied) return denied;

  const { id } = await params;
  const tenantId = await getTenantId();

  const existing = await db.customer.findFirst({ where: { id, tenantId } });
  if (!existing) return NextResponse.json({ error: "not_found" }, { status: 404 });

  // Soft delete: keep the customer reachable from invoices, payments, job cards
  // and analytics — only hide them from lists and pickers.
  await db.customer.update({ where: { id }, data: { deleted: true } });
  const session = await getSession();
  await db.auditLog.create({ data: { tenantId, userId: session?.id ?? null, action: "deleted", module: "customers", record: `${existing.code} · ${existing.name}` } });
  return NextResponse.json({ ok: true });
}
