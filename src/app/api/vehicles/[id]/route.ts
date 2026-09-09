import { db } from "@/lib/db";
import { getTenantId, writeAudit } from "@/lib/api";
import { denyWithoutPermission } from "@/lib/guards";
import { NextResponse } from "next/server";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tenantId = await getTenantId();
  const vehicle = await db.vehicle.findFirst({
    where: { id, tenantId },
    include: {
      customer: true,
      jobCards: { include: { technician: true, services: true, parts: { include: { part: true } } }, orderBy: { createdAt: "desc" } },
      invoices: { orderBy: { createdAt: "desc" } },
      inspections: { orderBy: { date: "desc" } },
      appointments: { include: { service: true }, orderBy: { date: "desc" } },
    },
  });
  if (!vehicle) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const totalSpent = await db.invoice.aggregate({ where: { vehicleId: id, status: "paid" }, _sum: { grandTotal: true } });
  return NextResponse.json({ ...vehicle, totalSpent: totalSpent._sum.grandTotal ?? 0 });
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await denyWithoutPermission("vehicles", "edit");
  if (denied) return denied;

  const { id } = await params;
  const tenantId = await getTenantId();
  const body = await req.json();

  const existing = await db.vehicle.findFirst({ where: { id, tenantId } });
  if (!existing) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const data: any = {};
  if (body.customerId !== undefined) data.customerId = body.customerId;
  if (body.plateNumber !== undefined) data.plateNumber = String(body.plateNumber).trim();
  if (body.vin !== undefined) data.vin = body.vin?.trim() || null;
  if (body.make !== undefined) data.make = String(body.make).trim();
  if (body.model !== undefined) data.model = String(body.model).trim();
  if (body.year !== undefined) data.year = body.year ? Number(body.year) : null;
  if (body.color !== undefined) data.color = body.color?.trim() || null;
  if (body.engineType !== undefined) data.engineType = body.engineType?.trim() || null;
  if (body.fuelType !== undefined) data.fuelType = body.fuelType?.trim() || null;
  if (body.transmission !== undefined) data.transmission = body.transmission?.trim() || null;
  if (body.mileage !== undefined) data.mileage = Number(body.mileage) || 0;
  if (body.notes !== undefined) data.notes = body.notes?.trim() || null;
  if ((data.plateNumber !== undefined && !data.plateNumber) || (data.make !== undefined && !data.make) || (data.model !== undefined && !data.model)) {
    return NextResponse.json({ error: "required" }, { status: 400 });
  }
  if (data.customerId) {
    const customer = await db.customer.findFirst({ where: { id: data.customerId, tenantId } });
    if (!customer) return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const vehicle = await db.vehicle.update({ where: { id }, data, include: { customer: true } });
  await writeAudit(tenantId, "updated", "vehicles", vehicle.plateNumber);
  return NextResponse.json(vehicle);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await denyWithoutPermission("vehicles", "delete");
  if (denied) return denied;

  const { id } = await params;
  const tenantId = await getTenantId();
  const existing = await db.vehicle.findFirst({
    where: { id, tenantId },
    include: { _count: { select: { jobCards: true, invoices: true, appointments: true, estimates: true } } },
  });
  if (!existing) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const used = existing._count.jobCards + existing._count.invoices + existing._count.appointments + existing._count.estimates;
  if (used > 0) return NextResponse.json({ error: "vehicle_in_use" }, { status: 400 });

  await db.vehicle.delete({ where: { id } });
  await writeAudit(tenantId, "deleted", "vehicles", existing.plateNumber);
  return NextResponse.json({ ok: true });
}
