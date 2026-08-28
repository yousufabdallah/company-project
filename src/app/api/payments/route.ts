import { db } from "@/lib/db";
import { getTenantId } from "@/lib/api";
import { NextResponse } from "next/server";

export async function GET() {
  const tenantId = await getTenantId();
  const items = await db.payment.findMany({
    where: { tenantId },
    include: { customer: true, invoice: true },
    orderBy: { date: "desc" },
    take: 200,
  });
  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  const tenantId = await getTenantId();
  const body = await req.json();
  const amount = Number(body.amount);

  const payment = await db.$transaction(async (tx) => {
    const p = await tx.payment.create({
      data: {
        tenantId,
        invoiceId: body.invoiceId || null,
        customerId: body.customerId,
        amount,
        method: body.method || "cash",
        date: body.date ? new Date(body.date) : new Date(),
        reference: body.reference || null,
        note: body.note || null,
      },
    });
    if (body.invoiceId) {
      const inv = await tx.invoice.findUnique({ where: { id: body.invoiceId } });
      if (inv) {
        const paid = inv.paidAmount + amount;
        const status = paid >= inv.grandTotal ? "paid" : paid > 0 ? "partial" : "unpaid";
        await tx.invoice.update({ where: { id: inv.id }, data: { paidAmount: paid, status } });
        await tx.customer.update({ where: { id: body.customerId }, data: { balance: { decrement: Math.min(amount, inv.grandTotal) } } });
      }
    } else {
      await tx.customer.update({ where: { id: body.customerId }, data: { balance: { decrement: amount } } });
    }
    return p;
  });

  await db.auditLog.create({ data: { tenantId, action: "payment_received", module: "payments", record: String(amount) } });
  return NextResponse.json(payment, { status: 201 });
}
