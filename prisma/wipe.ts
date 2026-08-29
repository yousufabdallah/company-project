// Wipe ALL data from every table, then re-create ONLY:
//   1. The Platform Administration tenant (for super admin linkage)
//   2. The super admin user with a fresh bcrypt-hashed password
//
// Run: bun run prisma/wipe.ts
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

const SUPER_ADMIN_EMAIL = "admin@autosaas.com";
const SUPER_ADMIN_PASSWORD = "Admin@2024";
const SUPER_ADMIN_NAME = "Platform Administrator";

async function main() {
  console.log("⚠️  Wiping ALL data from database...\n");

  // Delete in dependency order (children first, parents last)
  const tables = [
    "auditLog",
    "payment",
    "invoiceItem",
    "invoice",
    "jobCardPart",
    "jobCardService",
    "vehicleInspection",
    "jobCard",
    "appointment",
    "estimateItem",
    "estimate",
    "stockMovement",
    "purchaseItem",
    "purchase",
    "warranty",
    "expense",
    "part",
    "service",
    "category",
    "supplier",
    "warehouse",
    "vehicle",
    "customer",
    "user",
    "branch",
    "platformSetting",
    "plan",
    "tenant",
  ];

  for (const table of tables) {
    try {
      const count = await (db as any)[table].deleteMany({});
      if (count.deleted > 0) console.log(`  ✓ ${table}: ${count.deleted} deleted`);
    } catch (e) {
      console.log(`  · ${table}: skipped (${(e as Error).message.slice(0, 60)})`);
    }
  }

  console.log("\n✓ All data wiped.\n");

  // ─── Re-create Platform tenant + super admin ───────────────
  console.log("Creating super admin...\n");

  const platform = await db.tenant.create({
    data: {
      name: "Platform Administration",
      address: "Platform — SaaS Host",
      email: "platform@autosaas.com",
      currency: "OMR",
      taxPercent: 0,
      taxEnabled: false,
      status: "active",
      plan: "Enterprise",
    },
  });

  const hashed = await bcrypt.hash(SUPER_ADMIN_PASSWORD, 10);

  await db.user.create({
    data: {
      tenantId: platform.id,
      name: SUPER_ADMIN_NAME,
      email: SUPER_ADMIN_EMAIL,
      password: hashed,
      role: "super_admin",
      active: true,
    },
  });

  // Ensure default plans exist (for the super admin to manage)
  await db.plan.createMany({
    data: [
      { name: "Basic", description: "For small workshops getting started", price: 29, maxBranches: 1, maxUsers: 3, maxJobCards: 500, features: JSON.stringify(["1 Branch", "3 Users", "500 Job Cards/month", "Basic Reports"]), sortOrder: 1 },
      { name: "Professional", description: "For growing multi-bay workshops", price: 79, maxBranches: 3, maxUsers: 10, maxJobCards: -1, features: JSON.stringify(["3 Branches", "10 Users", "Unlimited Job Cards", "POS + Advanced Reports"]), sortOrder: 2 },
      { name: "Enterprise", description: "For large workshops & fleets", price: 199, maxBranches: -1, maxUsers: -1, maxJobCards: -1, features: JSON.stringify(["Unlimited Branches", "Unlimited Users", "WhatsApp Integration", "API Access"]), sortOrder: 3 },
    ],
  });

  console.log("═══════════════════════════════════════════");
  console.log("  DATABASE WIPED — SUPER ADMIN READY");
  console.log("═══════════════════════════════════════════");
  console.log(`  Email:    ${SUPER_ADMIN_EMAIL}`);
  console.log(`  Password: ${SUPER_ADMIN_PASSWORD}`);
  console.log("═══════════════════════════════════════════");
  console.log("\n3 default plans seeded (Basic / Professional / Enterprise).");
  console.log("The database is now clean — no demo workshops or customers.\n");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
