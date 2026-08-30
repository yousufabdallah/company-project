import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
async function main() {
  const models = ["tenant","user","branch","customer","vehicle","jobCard","jobCardService","jobCardPart","invoice","invoiceItem","payment","expense","estimate","estimateItem","appointment","part","category","service","supplier","warehouse","stockMovement","purchase","purchaseItem","warranty","auditLog","plan","platformSetting","vehicleInspection"];
  for (const m of models) {
    try { const c = await (db as any)[m].count(); if (c > 0) console.log(`  ${m}: ${c} rows`); } catch {}
  }
  console.log("--- done ---");
}
main().finally(() => db.$disconnect());
