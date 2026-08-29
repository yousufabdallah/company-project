import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
async function main() {
  const tenants = await db.tenant.findMany({ select: { id: true, name: true, logo: true, stamp: true } });
  for (const t of tenants) console.log(`${t.name}: logo=${t.logo || "none"}, stamp=${t.stamp || "none"}`);
}
main().finally(() => db.$disconnect());
