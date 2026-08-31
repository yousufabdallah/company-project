// Bootstrap script: ensures the two accounts needed to sign in exist.
//
//   super admin -> Platform Administration tenant
//   owner       -> the workshop tenant
//
// Safe to run on every deploy: it only creates what is missing and never
// deletes anything. Unlike prisma/seed.ts, it wipes no tables and inserts no
// demo business data. Passwords are bcrypt-hashed and read from the
// environment, so a deployment can set its own without editing this file.
//
// Run: bun run prisma/bootstrap.ts
//
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

const PLATFORM_TENANT = "Platform Administration";

const SUPER_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL || "admin@autosaas.com";
const SUPER_ADMIN_PASSWORD = process.env.SUPER_ADMIN_PASSWORD || "Admin@2024";
const SUPER_ADMIN_NAME = process.env.SUPER_ADMIN_NAME || "Platform Administrator";

const WORKSHOP_NAME = process.env.WORKSHOP_NAME || "Al-Manara Auto Service";
const OWNER_EMAIL = process.env.OWNER_EMAIL || "owner@almanara.om";
const OWNER_PASSWORD = process.env.OWNER_PASSWORD || "Owner@2024";
const OWNER_NAME = process.env.OWNER_NAME || "Workshop Owner";

// Create the tenant only if one with this name is not already there. Tenant.name
// is not unique in the schema, so upsert cannot be used here.
async function ensureTenant(name: string, data: Record<string, unknown>) {
  const existing = await db.tenant.findFirst({ where: { name } });
  if (existing) {
    console.log(`• tenant "${name}" already exists`);
    return existing;
  }
  const created = await db.tenant.create({ data: { name, ...data } });
  console.log(`✓ created tenant "${name}"`);
  return created;
}

// Email is unique, so an upsert keeps this idempotent. An existing account has
// its password reset to the configured one, which keeps a deployment able to
// recover a lost login by changing the environment and re-running.
async function ensureUser(
  email: string,
  password: string,
  data: { tenantId: string; name: string; role: string },
) {
  const hashed = await bcrypt.hash(password, 10);
  const user = await db.user.upsert({
    where: { email },
    update: { ...data, password: hashed, active: true },
    create: { email, password: hashed, active: true, ...data },
  });
  console.log(`✓ ${data.role} ready: ${email}`);
  return user;
}

async function main() {
  const platform = await ensureTenant(PLATFORM_TENANT, {
    address: "Platform — SaaS Host",
    email: "platform@autosaas.com",
    currency: "OMR",
    taxPercent: 0,
    status: "active",
    plan: "Enterprise",
  });

  await ensureUser(SUPER_ADMIN_EMAIL, SUPER_ADMIN_PASSWORD, {
    tenantId: platform.id,
    name: SUPER_ADMIN_NAME,
    role: "super_admin",
  });

  const workshop = await ensureTenant(WORKSHOP_NAME, {
    currency: "OMR",
    taxPercent: 5,
    status: "active",
    plan: "Professional",
  });

  await ensureUser(OWNER_EMAIL, OWNER_PASSWORD, {
    tenantId: workshop.id,
    name: OWNER_NAME,
    role: "owner",
  });

  console.log("\n═══════════════════════════════════════════");
  console.log("  Accounts ready");
  console.log("═══════════════════════════════════════════");
  console.log(`  super admin : ${SUPER_ADMIN_EMAIL}`);
  console.log(`  owner       : ${OWNER_EMAIL}`);
  console.log("  (passwords come from the environment; stored as bcrypt hashes)");
  console.log("═══════════════════════════════════════════\n");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
