import { db } from "@/lib/db";
import { getTenantId } from "@/lib/api";
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
