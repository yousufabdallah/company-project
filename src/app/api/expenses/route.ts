import { db } from "@/lib/db";
import { getTenantId, writeAudit } from "@/lib/api";
import { denyWithoutPermission } from "@/lib/guards";
import { NextResponse } from "next/server";

export async function GET() {
  const tenantId = await getTenantId();
  const items = await db.expense.findMany({
    where: { tenantId },
    include: { branch: true },
    orderBy: { date: "desc" },
    take: 200,
  });
  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  const tenantId = await getTenantId();
  const body = await req.json();
  const exp = await db.expense.create({
    data: {
      tenantId,
      branchId: body.branchId || null,
      category: body.category,
      amount: Number(body.amount),
      date: body.date ? new Date(body.date) : new Date(),
      method: body.method || "cash",
      description: body.description || null,
    },
  });
  await writeAudit(tenantId, "created", "expenses", exp.category);
  return NextResponse.json(exp, { status: 201 });
}

export async function PATCH(req: Request) {
  const denied = await denyWithoutPermission("expenses", "edit");
  if (denied) return denied;

  const tenantId = await getTenantId();
  const body = await req.json();
  const { id, ...fields } = body;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const existing = await db.expense.findFirst({ where: { id, tenantId } });
  if (!existing) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const data: any = {};
  if (fields.category !== undefined) data.category = fields.category;
  if (fields.amount !== undefined) data.amount = Number(fields.amount);
  if (fields.date !== undefined) data.date = new Date(fields.date);
  if (fields.method !== undefined) data.method = fields.method || "cash";
  if (fields.description !== undefined) data.description = fields.description || null;
  if (fields.branchId !== undefined) data.branchId = fields.branchId || null;
  if (data.amount !== undefined && !(data.amount > 0)) return NextResponse.json({ error: "required" }, { status: 400 });

  const exp = await db.expense.update({ where: { id }, data, include: { branch: true } });
  await writeAudit(tenantId, "updated", "expenses", exp.category);
  return NextResponse.json(exp);
}

export async function DELETE(req: Request) {
  const denied = await denyWithoutPermission("expenses", "delete");
  if (denied) return denied;

  const tenantId = await getTenantId();
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const existing = await db.expense.findFirst({ where: { id, tenantId } });
  if (!existing) return NextResponse.json({ error: "not_found" }, { status: 404 });

  await db.expense.delete({ where: { id } });
  await writeAudit(tenantId, "deleted", "expenses", existing.category);
  return NextResponse.json({ ok: true });
}
