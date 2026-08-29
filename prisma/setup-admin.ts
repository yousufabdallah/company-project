// Setup script: creates the Platform tenant + real super admin user
// with a bcrypt-hashed password, and hashes all existing demo users' passwords.
//
// Run: bun run prisma/setup-admin.ts
//
// Super Admin credentials (set by this script):
//   Email:    admin@autosaas.com
//   Password: Admin@2024
//
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

const SUPER_ADMIN_EMAIL = "admin@autosaas.com";
const SUPER_ADMIN_PASSWORD = "Admin@2024";
const SUPER_ADMIN_NAME = "Platform Administrator";

async function main() {
  console.log("Setting up real authentication...\n");

  // 1. Ensure a "Platform Administration" tenant exists (for super admin linkage)
  let platformTenant = await db.tenant.findFirst({
    where: { name: "Platform Administration" },
  });
  if (!platformTenant) {
    platformTenant = await db.tenant.create({
      data: {
        name: "Platform Administration",
        address: "Platform — SaaS Host",
        email: "platform@autosaas.com",
        currency: "OMR",
        taxPercent: 0,
        status: "active",
        plan: "Enterprise",
      },
    });
    console.log("✓ Created 'Platform Administration' tenant");
  } else {
    console.log("• 'Platform Administration' tenant already exists");
  }

  // 2. Hash existing demo users' plaintext passwords (if not already hashed)
  const allUsers = await db.user.findMany();
  let hashedCount = 0;
  for (const u of allUsers) {
    if (!u.password.startsWith("$2")) {
      const hashed = await bcrypt.hash(u.password, 10);
      await db.user.update({ where: { id: u.id }, data: { password: hashed } });
      hashedCount++;
    }
  }
  console.log(`✓ Hashed passwords for ${hashedCount} existing user(s)`);

  // 3. Create or update the super admin user
  const hashedAdminPassword = await bcrypt.hash(SUPER_ADMIN_PASSWORD, 10);
  const existingAdmin = await db.user.findUnique({
    where: { email: SUPER_ADMIN_EMAIL },
  });

  if (existingAdmin) {
    await db.user.update({
      where: { id: existingAdmin.id },
      data: {
        name: SUPER_ADMIN_NAME,
        password: hashedAdminPassword,
        role: "super_admin",
        tenantId: platformTenant.id,
        active: true,
      },
    });
    console.log("✓ Updated existing super admin user");
  } else {
    await db.user.create({
      data: {
        tenantId: platformTenant.id,
        name: SUPER_ADMIN_NAME,
        email: SUPER_ADMIN_EMAIL,
        password: hashedAdminPassword,
        role: "super_admin",
        active: true,
      },
    });
    console.log("✓ Created super admin user");
  }

  console.log("\n═══════════════════════════════════════════");
  console.log("  SUPER ADMIN READY — Real Authentication");
  console.log("═══════════════════════════════════════════");
  console.log(`  Email:    ${SUPER_ADMIN_EMAIL}`);
  console.log(`  Password: ${SUPER_ADMIN_PASSWORD}`);
  console.log(`  (stored as bcrypt hash in the database)`);
  console.log("═══════════════════════════════════════════\n");
  console.log("Workshop demo users (password: demo1234):");
  console.log("  owner@almanara.om    — Workshop Owner");
  console.log("  manager@almanara.om  — Manager");
  console.log("  advisor@almanara.om  — Service Advisor");
  console.log("  tech@almanara.om     — Technician");
  console.log("  accounts@almanara.om — Accountant");
  console.log("  inventory@almanara.om — Inventory Manager");
  console.log("");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
