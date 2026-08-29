import { db } from "@/lib/db";
import { getTenantId } from "@/lib/api";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const tenantId = await getTenantId();
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || "";
  const where: any = { tenantId };
  if (q) {
    where.OR = [{ plateNumber: { contains: q } }, { vin: { contains: q } }, { make: { contains: q } }, { model: { contains: q } }];
  }
  const items = await db.vehicle.findMany({
    where,
    include: { customer: true },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  const tenantId = await getTenantId();
  const body = await req.json();
  const vehicle = await db.vehicle.create({
    data: {
      tenantId,
      customerId: body.customerId,
      plateNumber: body.plateNumber,
      vin: body.vin || null,
      make: body.make,
      model: body.model,
      year: body.year ? Number(body.year) : null,
      color: body.color || null,
      engineType: body.engineType || null,
      fuelType: body.fuelType || null,
      transmission: body.transmission || null,
      mileage: Number(body.mileage) || 0,
    },
  });
  await db.auditLog.create({ data: { tenantId, action: "created", module: "vehicles", record: vehicle.plateNumber } });
  return NextResponse.json(vehicle, { status: 201 });
}
