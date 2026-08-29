import { db } from "@/lib/db";
import { getTenantId } from "@/lib/api";
import { NextResponse } from "next/server";

export async function GET() {
  const tenantId = await getTenantId();
  const tenant = await db.tenant.findUnique({ where: { id: tenantId } });
  return NextResponse.json(tenant);
}

export async function PUT(req: Request) {
  const tenantId = await getTenantId();
  const body = await req.json();
  const allowed = ["name", "address", "phone", "whatsapp", "email", "crNumber", "taxNumber", "currency", "taxPercent", "invoicePrefix", "jobCardPrefix", "estimatePrefix", "workingHours", "invoiceFooter", "terms"];
  const data: any = {};
  for (const k of allowed) if (k in body) data[k] = k === "taxPercent" ? Number(body[k]) : body[k];
  const tenant = await db.tenant.update({ where: { id: tenantId }, data });
  await db.auditLog.create({ data: { tenantId, action: "updated", module: "settings", record: "tenant" } });
  return NextResponse.json(tenant);
}
