// Bootstrap script: ensures the two accounts needed to sign in exist.
//
//   super admin -> Platform Administration tenant
//   owner       -> the workshop tenant
//
// Safe to run on every deploy: it only creates what is missing and never
// deletes anything. Unlike prisma/seed.ts, it wipes no tables and inserts no
// demo business data. Passwords are bcrypt-hashed and read from the
// environment, so a deployment can set its own without editing this file.
// The environment password only applies when an account is first created (or
// when BOOTSTRAP_RESET_PASSWORDS=1) — passwords changed in the app survive
// redeploys.
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

// Email is unique, so a find-then-create/update keeps this idempotent. An
// existing account's password is left untouched: users change their passwords
// in the app, and a redeploy must never revert them. Set
// BOOTSTRAP_RESET_PASSWORDS=1 to force accounts back to the configured
// passwords (e.g. to recover a lost login).
async function ensureUser(
  email: string,
  password: string,
  data: { tenantId: string; name: string; role: string },
) {
  const resetPasswords = ["1", "true"].includes(
    (process.env.BOOTSTRAP_RESET_PASSWORDS || "").toLowerCase(),
  );
  const existing = await db.user.findUnique({ where: { email } });

  if (!existing) {
    const hashed = await bcrypt.hash(password, 10);
    await db.user.create({
      data: { email, password: hashed, active: true, ...data },
    });
    console.log(`✓ ${data.role} created: ${email}`);
    return;
  }

  await db.user.update({
    where: { email },
    data: resetPasswords
      ? { ...data, active: true, password: await bcrypt.hash(password, 10) }
      : { ...data, active: true },
  });
  console.log(
    `✓ ${data.role} ready: ${email}${resetPasswords ? " (password reset from environment)" : ""}`,
  );
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
  console.log("  (in-app password changes are kept across redeploys; set");
  console.log("  BOOTSTRAP_RESET_PASSWORDS=1 to force-reset from the environment)");
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
