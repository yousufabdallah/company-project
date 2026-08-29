import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth-server";

// Seed additional demo tenants for the Super Admin view if only one exists
async function ensureDemoTenants() {
  const count = await db.tenant.count();
  if (count > 1) return;

  const now = new Date();
  const demoTenants = [
    { name: "Al-Shams Garage", email: "info@alshams.om", plan: "Basic", status: "trial", daysAgo: 3 },
    { name: "Muscat Motors Service", email: "contact@muscatmotors.om", plan: "Professional", status: "active", daysAgo: 28 },
    { name: "Sohar Auto Repair", email: "service@soharauto.om", plan: "Professional", status: "active", daysAgo: 65 },
    { name: "Salalah Car Center", email: "info@salalahcar.om", plan: "Enterprise", status: "active", daysAgo: 120 },
    { name: "Nizwa Auto Workshop", email: "nizwa.auto@mail.om", plan: "Basic", status: "active", daysAgo: 45 },
    { name: "Sur Fleet Service", email: "sur.fleet@mail.om", plan: "Professional", status: "suspended", daysAgo: 90 },
    { name: "Barka Quick Fix", email: "barka.quickfix@mail.om", plan: "Basic", status: "trial", daysAgo: 1 },
    { name: "Rustaq Auto Care", email: "rustaq.auto@mail.om", plan: "Professional", status: "active", daysAgo: 15 },
  ];

  for (const dt of demoTenants) {
    const created = new Date(now);
    created.setDate(created.getDate() - dt.daysAgo);
    await db.tenant.create({
      data: {
        name: dt.name,
        email: dt.email,
        address: "Oman",
        phone: "+968 2000 0000",
        currency: "OMR",
        taxPercent: 5,
        invoicePrefix: "INV-",
        jobCardPrefix: "JC-",
        estimatePrefix: "EST-",
        status: dt.status,
        plan: dt.plan,
        createdAt: created,
        updatedAt: created,
      },
    });
  }
}

const PLAN_PRICES: Record<string, number> = { Basic: 29, Professional: 79, Enterprise: 199 };

export async function GET() {
  // Protect this route — only authenticated super admins can access
  try {
    await requireSuperAdmin();
  } catch {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  await ensureDemoTenants();

  const tenants = await db.tenant.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { users: true, customers: true, jobCards: true, invoices: true, vehicles: true } },
      planRecord: { select: { id: true, name: true, price: true } },
    },
  });

  const total = tenants.length;
  const active = tenants.filter((t) => t.status === "active").length;
  const trial = tenants.filter((t) => t.status === "trial").length;
  const suspended = tenants.filter((t) => t.status === "suspended").length;

  // Plan prices from the Plan table (fallback to defaults)
  const planRows = await db.plan.findMany({ select: { name: true, price: true } });
  const priceByName = new Map(planRows.map((p) => [p.name, p.price]));

  // MRR = sum of active plan prices
  const mrr = tenants
    .filter((t) => t.status === "active")
    .reduce((sum, t) => sum + (priceByName.get(t.plan) ?? PLAN_PRICES[t.plan] ?? 0), 0);

  // New registrations this month
  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const newThisMonth = tenants.filter((t) => t.createdAt >= startOfMonth).length;

  // Expiring soon (trial tenants created within last 7 days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const expiringSoon = tenants.filter((t) => t.status === "trial" && t.createdAt >= sevenDaysAgo).length;

  // Revenue by plan
  const revenueByPlan = Object.entries(PLAN_PRICES).map(([plan, price]) => ({
    plan,
    revenue: tenants.filter((t) => t.status === "active" && t.plan === plan).length * price,
    count: tenants.filter((t) => t.plan === plan).length,
  }));

  // Workshops growth (last 6 months)
  const growth: { label: string; count: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(new Date().getFullYear(), new Date().getMonth() - i, 1);
    const end = new Date(new Date().getFullYear(), new Date().getMonth() - i + 1, 1);
    const count = tenants.filter((t) => t.createdAt >= d && t.createdAt < end).length;
    growth.push({ label: d.toLocaleDateString("en", { month: "short" }), count });
  }

  // Total platform stats
  const totalCustomers = tenants.reduce((s, t) => s + (t._count?.customers ?? 0), 0);
  const totalJobCards = tenants.reduce((s, t) => s + (t._count?.jobCards ?? 0), 0);
  const totalInvoices = tenants.reduce((s, t) => s + (t._count?.invoices ?? 0), 0);

  return NextResponse.json({
    kpis: {
      total,
      active,
      trial,
      suspended,
      mrr,
      newThisMonth,
      expiringSoon,
      totalCustomers,
      totalJobCards,
      totalInvoices,
    },
    charts: { revenueByPlan, growth },
    tenants: tenants.map((t) => ({
      id: t.id,
      name: t.name,
      email: t.email,
      phone: t.phone,
      plan: t.plan,
      planId: t.planId,
      planPrice: t.planRecord?.price ?? null,
      subscriptionStatus: t.subscriptionStatus,
      subscriptionExpiry: t.subscriptionExpiry,
      status: t.status,
      mrr: t.status === "active" ? (priceByName.get(t.plan) ?? PLAN_PRICES[t.plan] ?? 0) : 0,
      users: t._count?.users ?? 0,
      customers: t._count?.customers ?? 0,
      jobCards: t._count?.jobCards ?? 0,
      invoices: t._count?.invoices ?? 0,
      vehicles: t._count?.vehicles ?? 0,
      createdAt: t.createdAt,
    })),
  });
}
