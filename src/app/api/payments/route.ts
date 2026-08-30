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
  const receivedAmount = Number(body.amount); // what the customer handed over

  // If linked to an invoice, cap the recorded payment at the remaining balance.
  // Any excess (change due to customer) is NOT recorded in accounts.
  let effectiveAmount = receivedAmount; // amount that actually goes towards the invoice
  let changeDue = 0; // overpayment returned to customer

  if (body.invoiceId) {
    const inv = await db.invoice.findUnique({ where: { id: body.invoiceId } });
    if (inv) {
      const remaining = inv.grandTotal - inv.paidAmount;
      if (remaining > 0 && receivedAmount > remaining) {
        // Customer overpaid — cap the payment at the remaining balance
        effectiveAmount = remaining;
        changeDue = Math.round((receivedAmount - remaining) * 1000) / 1000;
      } else if (remaining <= 0) {
        // Invoice already fully paid — nothing to record
        effectiveAmount = 0;
        changeDue = receivedAmount;
      }
    }
  }

  // Record only the effective amount (capped), not the full received amount.
  // This ensures the Accounts view only reflects real workshop income.
  const payment = await db.$transaction(async (tx) => {
    const p = await tx.payment.create({
      data: {
        tenantId,
        invoiceId: body.invoiceId || null,
        customerId: body.customerId,
        amount: effectiveAmount,
        method: body.method || "cash",
        date: body.date ? new Date(body.date) : new Date(),
        reference: body.reference || null,
        note: changeDue > 0 ? `${body.note || "Payment"} | Change due: ${changeDue} OMR` : (body.note || null),
      },
    });
    if (body.invoiceId) {
      const inv = await tx.invoice.findUnique({ where: { id: body.invoiceId } });
      if (inv) {
        const paid = inv.paidAmount + effectiveAmount;
        const status = paid >= inv.grandTotal ? "paid" : paid > 0 ? "partial" : "unpaid";
        await tx.invoice.update({ where: { id: inv.id }, data: { paidAmount: paid, status } });
        // Only decrease customer balance by the effective amount (not the overpayment)
        const decAmount = Math.min(effectiveAmount, inv.grandTotal);
        const customer = await tx.customer.findUnique({ where: { id: body.customerId } });
        if (customer) {
          const newBalance = (customer.balance || 0) - decAmount;
          await tx.customer.update({ where: { id: body.customerId }, data: { balance: newBalance } });
        }
      }
    } else {
      const customer = await tx.customer.findUnique({ where: { id: body.customerId } });
      if (customer) {
        const newBalance = (customer.balance || 0) - effectiveAmount;
        await tx.customer.update({ where: { id: body.customerId }, data: { balance: newBalance } });
      }
    }
    return p;
  });

  await db.auditLog.create({
    data: {
      tenantId,
      action: "payment_received",
      module: "payments",
      record: `${effectiveAmount}${changeDue > 0 ? ` (received ${receivedAmount}, change ${changeDue})` : ""}`,
    },
  });

  return NextResponse.json({ ...payment, changeDue, receivedAmount, effectiveAmount }, { status: 201 });
}
