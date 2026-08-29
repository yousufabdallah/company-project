import { db } from "@/lib/db";
import { getTenantId } from "@/lib/api";
import { NextResponse } from "next/server";

export async function GET() {
  const tenantId = await getTenantId();
  const tenant = await db.tenant.findUnique({ where: { id: tenantId } });
  const currency = tenant?.currency ?? "OMR";

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfYear = new Date(now.getFullYear(), 0, 1);

  const [todayPayments, monthPayments, yearPayments, openJobs, completedJobs, vehiclesInShop, pendingApprovals, waitingParts, outstanding, todaysAppointments, allPayments, allCustomers, allJobCards, expenses, allParts] = await Promise.all([
    db.payment.findMany({ where: { tenantId, date: { gte: startOfDay } }, select: { amount: true } }),
    db.payment.findMany({ where: { tenantId, date: { gte: startOfMonth } }, select: { amount: true } }),
    db.payment.findMany({ where: { tenantId, date: { gte: startOfYear } }, select: { amount: true } }),
    db.jobCard.count({ where: { tenantId, status: { notIn: ["completed", "delivered", "cancelled"] } } }),
    db.jobCard.count({ where: { tenantId, status: { in: ["completed", "delivered"] } } }),
    db.jobCard.count({ where: { tenantId, status: { in: ["in_progress", "waiting_parts", "waiting_customer", "quality_check", "ready_for_delivery"] } } }),
    db.estimate.count({ where: { tenantId, status: "pending" } }),
    db.jobCard.count({ where: { tenantId, status: "waiting_parts" } }),
    db.customer.aggregate({ where: { tenantId, balance: { gt: 0 } }, _sum: { balance: true } }),
    db.appointment.findMany({ where: { tenantId, date: { gte: startOfDay, lt: new Date(startOfDay.getTime() + 86400000) } }, include: { customer: true, vehicle: true, service: true, technician: true }, orderBy: { time: "asc" } }),
    db.payment.findMany({ where: { tenantId }, include: { customer: true } }),
    db.customer.findMany({ where: { tenantId }, select: { id: true, name: true, createdAt: true } }),
    db.jobCard.findMany({ where: { tenantId }, include: { customer: true, vehicle: true, technician: true }, orderBy: { createdAt: "desc" }, take: 8 }),
    db.expense.findMany({ where: { tenantId } }),
    db.part.findMany({ where: { tenantId } }),
  ]);

  const sum = (arr: { amount?: number | null }[]) => arr.reduce((s, x) => s + Number(x.amount ?? 0), 0);

  const days: { label: string; revenue: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(startOfDay);
    d.setDate(d.getDate() - i);
    const next = new Date(d);
    next.setDate(next.getDate() + 1);
    const rev = allPayments.filter((p) => p.date >= d && p.date < next).reduce((s, p) => s + p.amount, 0);
    days.push({ label: d.toLocaleDateString("en", { weekday: "short" }), revenue: Math.round(rev * 1000) / 1000 });
  }

  const statusGroups = ["draft", "waiting_approval", "approved", "in_progress", "waiting_parts", "waiting_customer", "quality_check", "completed", "ready_for_delivery", "delivered"];
  const statusBreakdown = await Promise.all(statusGroups.map(async (s) => ({ status: s, count: await db.jobCard.count({ where: { tenantId, status: s } }) })));

  const jcs = await db.jobCardService.findMany({ where: { jobCard: { tenantId } }, include: { service: true } });
  const svcMap = new Map<string, number>();
  for (const js of jcs) {
    const name = js.service?.name ?? js.name;
    svcMap.set(name, (svcMap.get(name) ?? 0) + 1);
  }
  const topServices = [...svcMap.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 5);

  const users = await db.user.findMany({ where: { tenantId, role: "technician" } });
  const techPerf = await Promise.all(users.map(async (u) => {
    const assigned = await db.jobCard.count({ where: { tenantId, technicianId: u.id } });
    const done = await db.jobCard.count({ where: { tenantId, technicianId: u.id, status: { in: ["completed", "delivered", "ready_for_delivery"] } } });
    return { name: u.name, assigned, done };
  }));

  const growth: { label: string; count: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
    const count = allCustomers.filter((c) => c.createdAt >= d && c.createdAt < end).length;
    growth.push({ label: d.toLocaleDateString("en", { month: "short" }), count });
  }

  const totalRevenue = allPayments.reduce((s, p) => s + p.amount, 0);
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const stockValue = allParts.reduce((s, p) => s + p.costPrice * p.quantity, 0);

  const lowStockParts = allParts.filter((p) => p.quantity <= p.minStock).slice(0, 8);

  const allInvoices = await db.invoice.findMany({ where: { tenantId } });

  return NextResponse.json({
    tenant,
    currency,
    kpis: {
      todayRevenue: sum(todayPayments),
      monthRevenue: sum(monthPayments),
      yearRevenue: sum(yearPayments),
      openJobs,
      completedJobs,
      vehiclesInShop,
      pendingApprovals,
      waitingParts,
      outstandingPayments: outstanding._sum.balance ?? 0,
      lowStockCount: lowStockParts.length,
    },
    charts: {
      revenueTrend: days,
      statusBreakdown,
      topServices,
      technicianPerformance: techPerf,
      customerGrowth: growth,
    },
    financial: {
      revenue: totalRevenue,
      expenses: totalExpenses,
      grossProfit: totalRevenue - totalExpenses,
      netProfit: totalRevenue - totalExpenses,
      stockValue,
      invoicesCount: allInvoices.length,
      paidInvoices: allInvoices.filter((i) => i.status === "paid").length,
      unpaidInvoices: allInvoices.filter((i) => i.status === "unpaid").length,
      partialInvoices: allInvoices.filter((i) => i.status === "partial").length,
    },
    lists: {
      todaysAppointments,
      recentJobCards: allJobCards,
      lowStockParts,
    },
  });
}
