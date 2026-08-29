import { db } from "@/lib/db";
import { getTenantId } from "@/lib/api";
import { NextResponse } from "next/server";

export async function GET() {
  const tenantId = await getTenantId();
  const [payments, invoices, expenses, parts, customers, jobCards] = await Promise.all([
    db.payment.findMany({ where: { tenantId }, include: { customer: true } }),
    db.invoice.findMany({ where: { tenantId }, include: { customer: true, vehicle: true } }),
    db.expense.findMany({ where: { tenantId } }),
    db.part.findMany({ where: { tenantId }, include: { category: true } }),
    db.customer.findMany({ where: { tenantId }, include: { vehicles: true } }),
    db.jobCard.findMany({ where: { tenantId }, include: { customer: true, vehicle: true, technician: true } }),
  ]);

  const revenue = payments.reduce((s, p) => s + p.amount, 0);
  const expensesTotal = expenses.reduce((s, e) => s + e.amount, 0);
  const stockValue = parts.reduce((s, p) => s + p.costPrice * p.quantity, 0);

  // Top customers by spending
  const custSpend = new Map<string, { name: string; total: number }>();
  for (const p of payments) {
    const cur = custSpend.get(p.customerId) ?? { name: p.customer?.name ?? "—", total: 0 };
    cur.total += p.amount;
    custSpend.set(p.customerId, cur);
  }
  const topCustomers = [...custSpend.entries()].map(([id, v]) => ({ id, ...v })).sort((a, b) => b.total - a.total).slice(0, 8);

  // Most serviced vehicles
  const vehSvc = new Map<string, { label: string; count: number; spent: number }>();
  for (const jc of jobCards) {
    const key = jc.vehicleId;
    const label = `${jc.vehicle?.plateNumber ?? "—"} · ${jc.vehicle?.make ?? ""} ${jc.vehicle?.model ?? ""}`;
    const cur = vehSvc.get(key) ?? { label, count: 0, spent: 0 };
    cur.count += 1;
    cur.spent += jc.grandTotal;
    vehSvc.set(key, cur);
  }
  const mostServiced = [...vehSvc.entries()].map(([id, v]) => ({ id, ...v })).sort((a, b) => b.count - a.count).slice(0, 8);

  // Fast/slow moving parts
  const movements = await db.stockMovement.findMany({ where: { tenantId, type: "out" }, select: { partId: true, quantity: true } });
  const moveMap = new Map<string, number>();
  for (const m of movements) moveMap.set(m.partId, (moveMap.get(m.partId) ?? 0) + m.quantity);
  const partMove = parts.map((p) => ({ name: p.name, moved: moveMap.get(p.id) ?? 0 })).sort((a, b) => b.moved - a.moved);
  const fast = partMove.filter((p) => p.moved > 0).slice(0, 8);
  const slow = partMove.filter((p) => p.moved === 0).slice(0, 8);

  // Expenses by category
  const expCat = new Map<string, number>();
  for (const e of expenses) expCat.set(e.category, (expCat.get(e.category) ?? 0) + e.amount);
  const expensesByCategory = [...expCat.entries()].map(([category, total]) => ({ category, total }));

  // Sales by technician
  const techSales = new Map<string, number>();
  for (const jc of jobCards) {
    if (jc.technicianId) techSales.set(jc.technicianId, (techSales.get(jc.technicianId) ?? 0) + jc.grandTotal);
  }
  const techList = await db.user.findMany({ where: { tenantId, role: "technician" } });
  const salesByTech = techList.map((t) => ({ name: t.name, total: techSales.get(t.id) ?? 0 })).sort((a, b) => b.total - a.total);

  return NextResponse.json({
    summary: {
      revenue,
      expenses: expensesTotal,
      grossProfit: revenue - expensesTotal,
      netProfit: revenue - expensesTotal,
      stockValue,
      invoices: invoices.length,
      customers: customers.length,
      jobCards: jobCards.length,
    },
    topCustomers,
    mostServicedVehicles: mostServiced,
    fastMovingParts: fast,
    slowMovingParts: slow,
    expensesByCategory,
    salesByTechnician: salesByTech,
    lowStock: parts.filter((p) => p.quantity <= p.minStock),
    recentInvoices: invoices.slice(0, 10),
  });
}
