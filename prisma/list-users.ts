// List all users in the database (emails, roles, names)
import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();

async function main() {
  const users = await db.user.findMany({
    orderBy: [{ role: "asc" }, { email: "asc" }],
    select: { name: true, email: true, role: true, active: true, tenant: { select: { name: true } } },
  });
  console.log(`Total users: ${users.length}\n`);
  console.log("EMAIL | ROLE | NAME | TENANT | ACTIVE");
  for (const u of users) {
    console.log(`${u.email} | ${u.role} | ${u.name} | ${u.tenant?.name} | ${u.active}`);
  }
}

main().finally(() => db.$disconnect());
