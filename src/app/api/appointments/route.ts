import { db } from "@/lib/db";
import { getTenantId, writeAudit } from "@/lib/api";
import { denyWithoutPermission } from "@/lib/guards";
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
  const denied = await denyWithoutPermission("appointments", "edit");
  if (denied) return denied;

  const tenantId = await getTenantId();
  const body = await req.json();
  const { id, ...fields } = body;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const existing = await db.appointment.findFirst({ where: { id, tenantId } });
  if (!existing) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const data: any = {};
  if (fields.status !== undefined) data.status = fields.status;
  if (fields.customerId !== undefined) data.customerId = fields.customerId;
  if (fields.vehicleId !== undefined) data.vehicleId = fields.vehicleId || null;
  if (fields.serviceId !== undefined) data.serviceId = fields.serviceId || null;
  if (fields.technicianId !== undefined) data.technicianId = fields.technicianId || null;
  if (fields.date !== undefined) data.date = new Date(fields.date);
  if (fields.time !== undefined) data.time = fields.time;
  if (fields.notes !== undefined) data.notes = fields.notes || null;

  const appt = await db.appointment.update({
    where: { id },
    data,
    include: { customer: true, vehicle: true, service: true, technician: true },
  });
  await writeAudit(tenantId, fields.status && Object.keys(data).length === 1 ? "appointment_status_changed" : "updated", "appointments", id);
  return NextResponse.json(appt);
}

export async function DELETE(req: Request) {
  const denied = await denyWithoutPermission("appointments", "delete");
  if (denied) return denied;

  const tenantId = await getTenantId();
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const existing = await db.appointment.findFirst({ where: { id, tenantId } });
  if (!existing) return NextResponse.json({ error: "not_found" }, { status: 404 });

  await db.appointment.delete({ where: { id } });
  await writeAudit(tenantId, "deleted", "appointments", id);
  return NextResponse.json({ ok: true });
}
