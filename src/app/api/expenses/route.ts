import { db } from "@/lib/db";
import { getTenantId } from "@/lib/api";
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
  await db.auditLog.create({ data: { tenantId, action: "created", module: "expenses", record: exp.category } });
  return NextResponse.json(exp, { status: 201 });
}
