import { db } from "@/lib/db";
import { getTenantId } from "@/lib/api";
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
  const { id } = await params;
  const tenantId = await getTenantId();
  const body = await req.json();
  const customer = await db.customer.updateMany({ where: { id, tenantId }, data: { ...body, tenantId: undefined } });
  await db.auditLog.create({ data: { tenantId, action: "updated", module: "customers", record: id } });
  return NextResponse.json(customer);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tenantId = await getTenantId();
  await db.customer.deleteMany({ where: { id, tenantId } });
  await db.auditLog.create({ data: { tenantId, action: "deleted", module: "customers", record: id } });
  return NextResponse.json({ ok: true });
}
