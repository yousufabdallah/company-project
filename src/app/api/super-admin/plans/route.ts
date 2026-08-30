import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth-server";

async function guard() {
  try {
    await requireSuperAdmin();
    return null;
  } catch {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
}

// Default plans (auto-seeded on first access)
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
  const err = await guard();
  if (err) return err;
  await ensureDefaultPlans();
  const plans = await db.plan.findMany({
    orderBy: { sortOrder: "asc" },
    include: { _count: { select: { tenants: true } } },
  });
  return NextResponse.json({ items: plans });
}

export async function POST(req: Request) {
  const err = await guard();
  if (err) return err;
  const body = await req.json();
  if (!body.name) return NextResponse.json({ error: "Name is required" }, { status: 400 });
  try {
    const plan = await db.plan.create({
      data: {
        name: body.name,
        description: body.description || null,
        price: Number(body.price) || 0,
        maxBranches: body.maxBranches === undefined ? 1 : Number(body.maxBranches),
        maxUsers: body.maxUsers === undefined ? 3 : Number(body.maxUsers),
        maxJobCards: body.maxJobCards === undefined ? 500 : Number(body.maxJobCards),
        features: JSON.stringify(body.features || []),
        active: body.active ?? true,
        sortOrder: Number(body.sortOrder) || 99,
      },
    });
    return NextResponse.json(plan, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.code === "P2002" ? "A plan with this name already exists" : "Error" }, { status: 400 });
  }
}

export async function PATCH(req: Request) {
  const err = await guard();
  if (err) return err;
  const body = await req.json();
  if (!body.id) return NextResponse.json({ error: "id is required" }, { status: 400 });
  const data: any = {};
  if ("name" in body) data.name = body.name;
  if ("description" in body) data.description = body.description || null;
  if ("price" in body) data.price = Number(body.price) || 0;
  if ("maxBranches" in body) data.maxBranches = Number(body.maxBranches);
  if ("maxUsers" in body) data.maxUsers = Number(body.maxUsers);
  if ("maxJobCards" in body) data.maxJobCards = Number(body.maxJobCards);
  if ("features" in body) data.features = JSON.stringify(body.features || []);
  if ("active" in body) data.active = !!body.active;
  if ("sortOrder" in body) data.sortOrder = Number(body.sortOrder);
  try {
    const plan = await db.plan.update({ where: { id: body.id }, data });
    return NextResponse.json(plan);
  } catch (e: any) {
    return NextResponse.json({ error: e?.code === "P2002" ? "A plan with this name already exists" : "Error" }, { status: 400 });
  }
}

export async function DELETE(req: Request) {
  const err = await guard();
  if (err) return err;
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });
  // Soft-delete: deactivate instead of removing (tenants may reference it)
  const plan = await db.plan.update({ where: { id }, data: { active: false } });
  return NextResponse.json(plan);
}
