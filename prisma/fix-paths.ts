import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();

async function main() {
  const tenants = await db.tenant.findMany({
    where: {
      OR: [
        { logo: { startsWith: "/uploads/" } },
        { stamp: { startsWith: "/uploads/" } },
      ],
    },
    select: { id: true, logo: true, stamp: true },
  });

  for (const t of tenants) {
    const data: any = {};
    if (t.logo && t.logo.startsWith("/uploads/")) {
      data.logo = `/api/serve-file?path=${t.logo}`;
    }
    if (t.stamp && t.stamp.startsWith("/uploads/")) {
      data.stamp = `/api/serve-file?path=${t.stamp}`;
    }
    if (Object.keys(data).length > 0) {
      await db.tenant.update({ where: { id: t.id }, data });
      console.log(`Updated tenant ${t.id}: logo=${data.logo || "—"}, stamp=${data.stamp || "—"}`);
    }
  }
  console.log("Done.");
}

main().finally(() => db.$disconnect());
