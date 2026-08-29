import { db } from "@/lib/db";
import { getTenantId, nextCode } from "@/lib/api";
import { getTaxConfig, calculateTax, calculateGrandTotal } from "@/lib/tax";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const tenantId = await getTenantId();
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const where: any = { tenantId };
  if (status) where.status = status;
  const items = await db.invoice.findMany({
    where,
    include: { customer: true, vehicle: true, jobCard: true, items: true, payments: true },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  const tenantId = await getTenantId();
  const body = await req.json();
  const code = await nextCode("INV-", "invoice", tenantId);
  const tenant = await db.tenant.findUnique({ where: { id: tenantId } });

  const items = (body.items || []) as Array<{ type: string; name: string; quantity: number; unitPrice: number; discount: number; total: number }>;
  const laborTotal = items.filter((i) => i.type === "service").reduce((s, i) => s + Number(i.total), 0);
  const partsTotal = items.filter((i) => i.type === "part").reduce((s, i) => s + Number(i.total), 0);
  const subtotal = laborTotal + partsTotal;
  const discount = Number(body.discount) || 0;
  const taxConfig = await getTaxConfig(tenantId);
  const tax = calculateTax(subtotal, discount, taxConfig);
  const grandTotal = calculateGrandTotal(subtotal, discount, tax);

  const invoice = await db.invoice.create({
    data: {
      tenantId,
      code,
      customerId: body.customerId,
      vehicleId: body.vehicleId || null,
      jobCardId: body.jobCardId || null,
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
      laborTotal,
      partsTotal,
      discount,
      tax,
      grandTotal,
      paidAmount: 0,
      status: "unpaid",
      notes: body.notes || null,
      items: { create: items },
    },
    include: { items: true },
  });

  // Update customer balance
  await db.customer.update({ where: { id: body.customerId }, data: { balance: { increment: grandTotal } } });
  await db.auditLog.create({ data: { tenantId, action: "invoice_created", module: "invoices", record: code } });
  return NextResponse.json(invoice, { status: 201 });
}
