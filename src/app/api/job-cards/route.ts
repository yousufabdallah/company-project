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
  const items = await db.jobCard.findMany({
    where,
    include: { customer: true, vehicle: true, technician: true, services: { include: { service: true } }, parts: { include: { part: true } }, invoice: { select: { id: true, code: true, status: true, grandTotal: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  const tenantId = await getTenantId();
  const body = await req.json();
  const code = await nextCode("JC-", "jobCard", tenantId);
  const tenant = await db.tenant.findUnique({ where: { id: tenantId } });

  const services = (body.services || []) as Array<{ serviceId?: string; name: string; hours: number; laborPrice: number; discount: number; total: number }>;
  const parts = (body.parts || []) as Array<{ partId: string; quantity: number; unitPrice: number; discount: number; total: number }>;

  const laborTotal = services.reduce((s, i) => s + Number(i.total), 0);
  const partsTotal = parts.reduce((s, i) => s + Number(i.total), 0);
  const subtotal = laborTotal + partsTotal;
  const discount = Number(body.discount) || 0;
  const taxConfig = await getTaxConfig(tenantId);
  const tax = calculateTax(subtotal, discount, taxConfig);
  const grandTotal = calculateGrandTotal(subtotal, discount, tax);

  const jc = await db.$transaction(async (tx) => {
    const job = await tx.jobCard.create({
      data: {
        tenantId,
        code,
        customerId: body.customerId,
        vehicleId: body.vehicleId,
        mileage: Number(body.mileage) || 0,
        complaint: body.complaint,
        diagnosis: body.diagnosis || null,
        estimatedCompletion: body.estimatedCompletion ? new Date(body.estimatedCompletion) : null,
        technicianId: body.technicianId || null,
        advisorId: body.advisorId || null,
        priority: body.priority || "normal",
        status: body.status || "draft",
        laborTotal,
        partsTotal,
        discount,
        tax,
        grandTotal,
        notes: body.notes || null,
        services: { create: services },
      },
      include: { services: true },
    });
    for (const p of parts) {
      await tx.jobCardPart.create({
        data: { jobCardId: job.id, partId: p.partId, quantity: p.quantity, unitPrice: p.unitPrice, discount: p.discount || 0, total: p.total, status: "reserved" },
      });
      // Reserve stock: reduce available quantity (treat as reserved by deducting)
      await tx.stockMovement.create({ data: { tenantId, partId: p.partId, type: "reserved", quantity: p.quantity, refType: "job_card", refId: job.id, note: "Reserved for " + code } });
    }

    // AUTO-INVOICE: create the accounting invoice from the job card in the same transaction.
    // The invoice mirrors labor + parts + tax + grand total so the accountant sees it immediately.
    const invoiceCode = await nextInvoiceCode(tx, tenantId);
    const invoice = await tx.invoice.create({
      data: {
        tenantId,
        code: invoiceCode,
        customerId: body.customerId,
        vehicleId: body.vehicleId || null,
        jobCardId: job.id,
        dueDate: body.estimatedCompletion ? new Date(body.estimatedCompletion) : null,
        laborTotal,
        partsTotal,
        discount,
        tax,
        grandTotal,
        paidAmount: 0,
        status: "unpaid",
        notes: "Auto-generated from " + code,
        items: {
          create: [
            ...services.map((s) => ({ type: "service", name: s.name, quantity: 1, unitPrice: s.laborPrice, discount: s.discount || 0, total: s.total })),
            ...parts.map((p) => ({ type: "part", name: "Part " + String(p.partId).slice(-4), quantity: p.quantity, unitPrice: p.unitPrice, discount: p.discount || 0, total: p.total })),
          ],
        },
      },
      include: { items: true },
    });

    // Increase customer balance by the grand total (accounting)
    await tx.customer.update({ where: { id: body.customerId }, data: { balance: { increment: grandTotal } } });

    return { job, invoice };
  });

  await db.auditLog.create({ data: { tenantId, action: "created", module: "job_cards", record: code } });
  await db.auditLog.create({ data: { tenantId, action: "invoice_created", module: "invoices", record: jc.invoice.code } });
  return NextResponse.json({ ...jc.job, invoice: jc.invoice }, { status: 201 });
}

// Helper to generate the next invoice code within a transaction
async function nextInvoiceCode(tx: any, tenantId: string) {
  const count = await tx.invoice.count({ where: { tenantId } });
  return `INV-${String(count + 1).padStart(5, "0")}`;
}
