import { db } from "@/lib/db";
import { getTenantId, getTenant } from "@/lib/api";
import { NextResponse } from "next/server";

// Services Report: aggregates every JobCardService performed in a date range.
// Supports filtering by ?from=ISO&to=ISO  (defaults to all-time).
// Returns:
//   - totals (count + revenue, broken down catalog vs custom)
//   - list of services with times performed + revenue
//   - tenant info for the printable report header
export async function GET(req: Request) {
  const tenantId = await getTenantId();
  const tenant = await getTenant();

  const { searchParams } = new URL(req.url);
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");

  // Build date filter
  const dateFilter: any = {};
  if (fromParam) dateFilter.gte = new Date(fromParam);
  // 'to' is inclusive — use end of day
  if (toParam) {
    const toDate = new Date(toParam);
    toDate.setHours(23, 59, 59, 999);
    dateFilter.lte = toDate;
  }

  // Fetch all JobCardService rows for this tenant in the period
  const where: any = { jobCard: { tenantId } };
  if (fromParam || toParam) where.jobCard = { tenantId, createdAt: dateFilter };

  const services = await db.jobCardService.findMany({
    where,
    include: {
      service: { select: { id: true, name: true, code: true, durationHours: true } },
      jobCard: {
        select: {
          id: true,
          code: true,
          createdAt: true,
          customer: { select: { id: true, name: true } },
          vehicle: { select: { id: true, plateNumber: true, make: true, model: true } },
          technician: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { jobCard: { createdAt: "desc" } },
  });

  // Aggregate per service name (custom services have null serviceId but a name)
  const byName = new Map<
    string,
    { name: string; code: string | null; isCustom: boolean; count: number; revenue: number; lastDate: Date | null }
  >();

  for (const s of services) {
    const key = s.name;
    const existing = byName.get(key) || {
      name: s.name,
      code: s.service?.code || null,
      isCustom: !s.serviceId,
      count: 0,
      revenue: 0,
      lastDate: null,
    };
    existing.count += 1;
    existing.revenue += Number(s.total);
    if (!existing.lastDate || s.jobCard.createdAt > existing.lastDate) {
      existing.lastDate = s.jobCard.createdAt;
    }
    byName.set(key, existing);
  }

  const aggregated = [...byName.values()].sort((a, b) => b.revenue - a.revenue);

  // Totals
  const totalRevenue = aggregated.reduce((s, a) => s + a.revenue, 0);
  const totalCount = aggregated.reduce((s, a) => s + a.count, 0);
  const catalogCount = aggregated.filter((a) => !a.isCustom).reduce((s, a) => s + a.count, 0);
  const customCount = aggregated.filter((a) => a.isCustom).reduce((s, a) => s + a.count, 0);
  const catalogRevenue = aggregated.filter((a) => !a.isCustom).reduce((s, a) => s + a.revenue, 0);
  const customRevenue = aggregated.filter((a) => a.isCustom).reduce((s, a) => s + a.revenue, 0);

  return NextResponse.json({
    tenant,
    period: { from: fromParam || null, to: toParam || null },
    totals: {
      revenue: totalRevenue,
      count: totalCount,
      catalogCount,
      customCount,
      catalogRevenue,
      customRevenue,
      distinctServices: aggregated.length,
    },
    services: aggregated,
    // Recent detailed transactions (last 50)
    recent: services.slice(0, 50).map((s) => ({
      id: s.id,
      name: s.name,
      code: s.service?.code || null,
      isCustom: !s.serviceId,
      price: Number(s.laborPrice),
      total: Number(s.total),
      hours: s.hours,
      date: s.jobCard.createdAt,
      jobCardCode: s.jobCard.code,
      customerName: s.jobCard.customer?.name || null,
      vehiclePlate: s.jobCard.vehicle?.plateNumber || null,
      vehicleLabel: s.jobCard.vehicle ? `${s.jobCard.vehicle.make} ${s.jobCard.vehicle.model}` : null,
      technicianName: s.jobCard.technician?.name || null,
    })),
  });
}
