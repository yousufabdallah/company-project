import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { hashPassword, createSession } from "@/lib/auth-server";

// Self-signup: creates a new tenant (workshop) + owner user with a trial subscription.
// This is the public registration endpoint used by the landing page.

const TRIAL_DAYS = 14;

async function ensureDefaultPlans() {
  const count = await db.plan.count();
  if (count === 0) {
    await db.plan.createMany({
      data: [
        { name: "Basic", description: "For small workshops getting started", price: 29, maxBranches: 1, maxUsers: 3, maxJobCards: 500, features: JSON.stringify(["1 Branch", "3 Users", "500 Job Cards/month", "Basic Reports"]), sortOrder: 1 },
        { name: "Professional", description: "For growing multi-bay workshops", price: 79, maxBranches: 3, maxUsers: 10, maxJobCards: -1, features: JSON.stringify(["3 Branches", "10 Users", "Unlimited Job Cards", "POS + Advanced Reports"]), sortOrder: 2 },
        { name: "Enterprise", description: "For large workshops & fleets", price: 199, maxBranches: -1, maxUsers: -1, maxJobCards: -1, features: JSON.stringify(["Unlimited Branches", "Unlimited Users", "WhatsApp Integration", "API Access"]), sortOrder: 3 },
      ],
    });
  }
}

export async function POST(req: Request) {
  await ensureDefaultPlans();

  const body = await req.json();
  const workshopName = (body.workshopName || "").toString().trim();
  const name = (body.name || "").toString().trim();
  const email = (body.email || "").toString().toLowerCase().trim();
  const password = (body.password || "").toString();
  const planId = (body.planId || "").toString().trim();

  // Validation
  if (!workshopName) return NextResponse.json({ error: "enterWorkshopName", field: "workshopName" }, { status: 400 });
  if (!name) return NextResponse.json({ error: "enterName", field: "name" }, { status: 400 });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: "validEmail", field: "email" }, { status: 400 });
  if (password.length < 6) return NextResponse.json({ error: "enterPassword", field: "password" }, { status: 400 });

  let plan = planId ? await db.plan.findUnique({ where: { id: planId } }) : null;
  if (!plan) {
    plan = await db.plan.findFirst({ where: { name: "Professional" } });
  }
  if (!plan) {
    return NextResponse.json({ error: "selectPlan", field: "planId" }, { status: 400 });
  }

  // Email must be unique
  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "emailInUse", field: "email" }, { status: 409 });
  }

  // Create the new tenant + owner inside a transaction
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + TRIAL_DAYS);

  const hashed = await hashPassword(password);

  const tenant = await db.$transaction(async (tx) => {
    const t = await tx.tenant.create({
      data: {
        name: workshopName,
        currency: "OMR",
        taxPercent: 5,
        invoicePrefix: "INV-",
        jobCardPrefix: "JC-",
        estimatePrefix: "EST-",
        workingHours: "Sat–Thu, 8:00 AM – 6:00 PM",
        invoiceFooter: "Thank you for choosing us. Parts carry 90-day warranty unless stated otherwise.",
        status: "trial",
        plan: plan!.name,
        planId: plan!.id,
        subscriptionStatus: "trial",
        subscriptionExpiry: expiry,
      },
    });

    // Default branch + main warehouse
    const branch = await tx.branch.create({
      data: { tenantId: t.id, name: "Main Branch", address: "", phone: "" },
    });
    await tx.warehouse.create({
      data: { tenantId: t.id, name: "Main Warehouse", branchId: branch.id, location: "Store" },
    });

    // Owner user
    const owner = await tx.user.create({
      data: {
        tenantId: t.id,
        name,
        email,
        password: hashed,
        role: "owner",
        active: true,
      },
    });

    return { tenant: t, owner };
  });

  // Create session for the new owner
  await createSession({
    id: tenant.owner.id,
    name: tenant.owner.name,
    email: tenant.owner.email,
    role: "owner",
    tenantId: tenant.tenant.id,
    tenantName: tenant.tenant.name,
  });

  // Audit log
  await db.auditLog.create({
    data: {
      tenantId: tenant.tenant.id,
      userId: tenant.owner.id,
      action: "self_signup",
      module: "auth",
      record: email,
    },
  });

  return NextResponse.json(
    {
      id: tenant.owner.id,
      name: tenant.owner.name,
      email: tenant.owner.email,
      role: "owner",
      tenantId: tenant.tenant.id,
      tenantName: tenant.tenant.name,
    },
    { status: 201 }
  );
}
