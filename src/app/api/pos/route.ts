import { db } from "@/lib/db";
import { getTenantId, nextCode } from "@/lib/api";
import { NextResponse } from "next/server";

// GET /api/pos → today's POS sales summary + recent sales
export async function GET() {
  const tenantId = await getTenantId();
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const todayInvoices = await db.invoice.findMany({
    where: { tenantId, createdAt: { gte: startOfDay }, jobCardId: null, notes: { contains: "POS Sale" } },
    include: { customer: true, items: true, payments: true },
    orderBy: { createdAt: "desc" },
  });

  const todayTotal = todayInvoices.reduce((s, i) => s + i.grandTotal, 0);
  const todayCount = todayInvoices.length;

  // Last 10 POS sales
  const recent = await db.invoice.findMany({
    where: { tenantId, notes: { contains: "POS Sale" } },
    include: { customer: true, items: true },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  return NextResponse.json({ todayTotal, todayCount, recent, todayInvoices });
}

// POST /api/pos → complete an atomic sale: invoice + payment + stock deduction
export async function POST(req: Request) {
  const tenantId = await getTenantId();
  const body = await req.json();
  const tenant = await db.tenant.findUnique({ where: { id: tenantId } });

  const cartItems = (body.items || []) as Array<{ partId: string; name: string; quantity: number; unitPrice: number; total: number }>;
  if (cartItems.length === 0) {
    return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
  }

  // Verify stock availability
  const partIds = cartItems.map((i) => i.partId);
  const parts = await db.part.findMany({ where: { id: { in: partIds }, tenantId } });
  for (const item of cartItems) {
    const part = parts.find((p) => p.id === item.partId);
    if (!part) return NextResponse.json({ error: `Part not found: ${item.name}` }, { status: 400 });
    if (part.quantity < item.quantity) {
      return NextResponse.json({ error: `Insufficient stock for ${part.name}. Available: ${part.quantity}` }, { status: 400 });
    }
  }

  const partsTotal = cartItems.reduce((s, i) => s + Number(i.total), 0);
  const discount = Number(body.discount) || 0;
  const tax = Math.round(((partsTotal - discount) * (tenant?.taxPercent ?? 0)) / 100 * 1000) / 1000;
  const grandTotal = Math.round((partsTotal - discount + tax) * 1000) / 1000;
  const paidAmount = Number(body.paidAmount) || grandTotal;
  const method = body.method || "cash";
  // Ensure a walk-in customer exists before the transaction (customerId is required on Invoice)
  const customerId = body.customerId || (await ensureWalkInCustomer(tenantId));
  const invoiceCode = await nextCode("POS-", "invoice", tenantId);

  const result = await db.$transaction(async (tx) => {
    // 1. Create invoice
    const invoice = await tx.invoice.create({
      data: {
        tenantId,
        code: invoiceCode,
        customerId,
        jobCardId: null,
        dueDate: null,
        laborTotal: 0,
        partsTotal,
        discount,
        tax,
        grandTotal,
        paidAmount,
        status: paidAmount >= grandTotal ? "paid" : paidAmount > 0 ? "partial" : "unpaid",
        notes: "POS Sale" + (body.notes ? " · " + body.notes : ""),
        items: {
          create: cartItems.map((i) => ({
            type: "part",
            name: i.name,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            discount: 0,
            total: i.total,
          })),
        },
      },
      include: { items: true },
    });

    // 2. Deduct stock + record movements
    for (const item of cartItems) {
      await tx.part.update({
        where: { id: item.partId },
        data: { quantity: { decrement: item.quantity } },
      });
      await tx.stockMovement.create({
        data: {
          tenantId,
          partId: item.partId,
          type: "out",
          quantity: item.quantity,
          refType: "pos_sale",
          refId: invoice.id,
          note: "POS sale " + invoiceCode,
        },
      });
    }

    // 3. Record payment
    const payment = await tx.payment.create({
      data: {
        tenantId,
        invoiceId: invoice.id,
        customerId,
        amount: paidAmount,
        method,
        date: new Date(),
        reference: body.reference || invoiceCode,
        note: "POS sale",
      },
    });

    return { invoice, payment };
  });

  // 4. Update customer balance if a real customer is linked and underpaid
  if (body.customerId && paidAmount < grandTotal) {
    await db.customer.update({
      where: { id: body.customerId },
      data: { balance: { increment: grandTotal - paidAmount } },
    });
  }

  await db.auditLog.create({ data: { tenantId, action: "pos_sale", module: "pos", record: invoiceCode } });
  return NextResponse.json(result, { status: 201 });
}

// Ensure a "Walk-in Customer" exists for the tenant (used when no customer is selected)
async function ensureWalkInCustomer(tenantId: string): Promise<string> {
  let walkIn = await db.customer.findFirst({ where: { tenantId, name: "Walk-in Customer" } });
  if (!walkIn) {
    const count = await db.customer.count({ where: { tenantId } });
    walkIn = await db.customer.create({
      data: {
        tenantId,
        code: "CUST-" + String(count + 1).padStart(4, "0"),
        name: "Walk-in Customer",
        mobile: "0000",
        type: "individual",
        balance: 0,
      },
    });
  }
  return walkIn.id;
}
