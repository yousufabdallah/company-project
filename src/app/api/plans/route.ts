import { db } from "@/lib/db";
import { NextResponse } from "next/server";

// PUBLIC plans listing — powers the landing page pricing section.
// Returns only active plans. Lazy-seeds defaults on first access.

const DEFAULT_PLANS = [
  { name: "Basic", description: "For small workshops getting started", price: 29, maxBranches: 1, maxUsers: 3, maxJobCards: 500, features: JSON.stringify(["1 Branch", "3 Users", "500 Job Cards/month", "Basic Reports"]), sortOrder: 1 },
  { name: "Professional", description: "For growing multi-bay workshops", price: 79, maxBranches: 3, maxUsers: 10, maxJobCards: -1, features: JSON.stringify(["3 Branches", "10 Users", "Unlimited Job Cards", "POS + Advanced Reports"]), sortOrder: 2 },
  { name: "Enterprise", description: "For large workshops & fleets", price: 199, maxBranches: -1, maxUsers: -1, maxJobCards: -1, features: JSON.stringify(["Unlimited Branches", "Unlimited Users", "WhatsApp Integration", "API Access"]), sortOrder: 3 },
];

async function ensureDefaultPlans() {
  const count = await db.plan.count();
  if (count === 0) {
    await db.plan.createMany({ data: DEFAULT_PLANS });
  }
}

export async function GET() {
  await ensureDefaultPlans();

  const plans = await db.plan.findMany({
    where: { active: true },
    orderBy: { sortOrder: "asc" },
    select: { id: true, name: true, description: true, price: true, features: true },
  });

  // Public currency from platform settings (no session needed)
  const currencyRow = await db.platformSetting.findUnique({ where: { key: "defaultCurrency" } });
  const currency = currencyRow?.value || "OMR";

  return NextResponse.json({
    currency,
    items: plans.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      price: p.price,
      features: (() => {
        try {
          return JSON.parse(p.features || "[]");
        } catch {
          return [];
        }
      })(),
    })),
  });
}
