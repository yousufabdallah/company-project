import { db } from "@/lib/db";
import { getTenantId } from "@/lib/api";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const tenantId = await getTenantId();
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const where: any = { tenantId };
  if (status) where.status = status;
  if (from || to) {
    where.date = {};
    if (from) where.date.gte = new Date(from);
    if (to) where.date.lte = new Date(to);
  }
  const items = await db.appointment.findMany({
    where,
    include: { customer: true, vehicle: true, service: true, technician: true },
    orderBy: { date: "asc" },
    take: 300,
  });
  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  const tenantId = await getTenantId();
  const body = await req.json();
  const appt = await db.appointment.create({
    data: {
      tenantId,
      customerId: body.customerId,
      vehicleId: body.vehicleId || null,
      serviceId: body.serviceId || null,
      date: new Date(body.date),
      time: body.time,
      technicianId: body.technicianId || null,
      status: body.status || "scheduled",
      notes: body.notes || null,
    },
  });
  await db.auditLog.create({ data: { tenantId, action: "created", module: "appointments", record: appt.id } });
  return NextResponse.json(appt, { status: 201 });
}

export async function PATCH(req: Request) {
  const tenantId = await getTenantId();
  const body = await req.json();
  const { id, status } = body;
  const appt = await db.appointment.updateMany({ where: { id, tenantId }, data: { status } });
  await db.auditLog.create({ data: { tenantId, action: "appointment_status_changed", module: "appointments", record: id } });
  return NextResponse.json(appt);
}
