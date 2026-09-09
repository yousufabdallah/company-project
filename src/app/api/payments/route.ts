import { db } from "@/lib/db";
import { getTenantId, writeAudit } from "@/lib/api";
import { denyWithoutPermission } from "@/lib/guards";
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

  await writeAudit(
    tenantId,
    "payment_received",
    "payments",
    `${effectiveAmount}${changeDue > 0 ? ` (received ${receivedAmount}, change ${changeDue})` : ""}`,
  );

  return NextResponse.json({ ...payment, changeDue, receivedAmount, effectiveAmount }, { status: 201 });
}

function invoiceStatus(paid: number, grandTotal: number) {
  return paid >= grandTotal ? "paid" : paid > 0 ? "partial" : "unpaid";
}

export async function PATCH(req: Request) {
  const denied = await denyWithoutPermission("payments", "edit");
  if (denied) return denied;

  const tenantId = await getTenantId();
  const body = await req.json();
  const { id, ...fields } = body;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const existing = await db.payment.findFirst({ where: { id, tenantId } });
  if (!existing) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const data: any = {};
  if (fields.method !== undefined) data.method = fields.method || "cash";
  if (fields.date !== undefined) data.date = new Date(fields.date);
  if (fields.reference !== undefined) data.reference = fields.reference || null;
  if (fields.note !== undefined) data.note = fields.note || null;

  if (fields.amount !== undefined) {
    const newAmount = Number(fields.amount);
    if (!(newAmount > 0)) return NextResponse.json({ error: "required" }, { status: 400 });
    const diff = newAmount - existing.amount;
    if (diff !== 0) {
      if (existing.invoiceId) {
        const inv = await db.invoice.findUnique({ where: { id: existing.invoiceId } });
        if (inv) {
          const paid = inv.paidAmount + diff;
          if (paid < 0 || paid > inv.grandTotal + 0.0001) {
            return NextResponse.json({ error: "invoice_has_payments" }, { status: 400 });
          }
        }
      }
      data.amount = newAmount;
      const payment = await db.$transaction(async (tx) => {
        if (existing.invoiceId) {
          const inv = await tx.invoice.findUnique({ where: { id: existing.invoiceId } });
          if (inv) {
            const paid = inv.paidAmount + diff;
            await tx.invoice.update({ where: { id: inv.id }, data: { paidAmount: paid, status: invoiceStatus(paid, inv.grandTotal) } });
          }
        }
        await tx.customer.update({ where: { id: existing.customerId }, data: { balance: { decrement: diff } } });
        return tx.payment.update({ where: { id }, data, include: { customer: true, invoice: true } });
      });
      await writeAudit(tenantId, "updated", "payments", String(newAmount));
      return NextResponse.json(payment);
    }
  }

  const payment = await db.payment.update({ where: { id }, data, include: { customer: true, invoice: true } });
  await writeAudit(tenantId, "updated", "payments", String(payment.amount));
  return NextResponse.json(payment);
}

export async function DELETE(req: Request) {
  const denied = await denyWithoutPermission("payments", "delete");
  if (denied) return denied;

  const tenantId = await getTenantId();
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const existing = await db.payment.findFirst({ where: { id, tenantId } });
  if (!existing) return NextResponse.json({ error: "not_found" }, { status: 404 });

  await db.$transaction(async (tx) => {
    if (existing.invoiceId) {
      const inv = await tx.invoice.findUnique({ where: { id: existing.invoiceId } });
      if (inv) {
        const paid = Math.max(0, inv.paidAmount - existing.amount);
        await tx.invoice.update({ where: { id: inv.id }, data: { paidAmount: paid, status: invoiceStatus(paid, inv.grandTotal) } });
      }
    }
    await tx.customer.update({ where: { id: existing.customerId }, data: { balance: { increment: existing.amount } } });
    await tx.payment.delete({ where: { id } });
  });

  await writeAudit(tenantId, "deleted", "payments", String(existing.amount));
  return NextResponse.json({ ok: true });
}
