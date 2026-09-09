import { db } from "@/lib/db";
import { getTenantId, writeAudit } from "@/lib/api";
import { denyWithoutPermission } from "@/lib/guards";
import { getTaxConfig, calculateTax, calculateGrandTotal } from "@/lib/tax";
import { NextResponse } from "next/server";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tenantId = await getTenantId();
  const invoice = await db.invoice.findFirst({
    where: { id, tenantId },
    include: { customer: true, vehicle: true, jobCard: true, items: true, payments: true },
  });
  if (!invoice) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const tenant = await db.tenant.findUnique({ where: { id: tenantId } });
  return NextResponse.json({ ...invoice, tenant });
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await denyWithoutPermission("invoices", "edit");
  if (denied) return denied;

  const { id } = await params;
  const tenantId = await getTenantId();
  const body = await req.json();
  const existing = await db.invoice.findFirst({ where: { id, tenantId }, include: { items: true } });
  if (!existing) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const data: any = {};
  if (body.notes !== undefined) data.notes = body.notes?.trim() || null;
  if (body.dueDate !== undefined) data.dueDate = body.dueDate ? new Date(body.dueDate) : null;

  const items = Array.isArray(body.items) ? body.items as Array<{ type: string; name: string; quantity: number; unitPrice: number; discount: number; total: number }> : null;
  if (items) {
    if (existing.paidAmount > 0) return NextResponse.json({ error: "invoice_has_payments" }, { status: 400 });
    const laborTotal = items.filter((i) => i.type === "service").reduce((s, i) => s + Number(i.total), 0);
    const partsTotal = items.filter((i) => i.type === "part").reduce((s, i) => s + Number(i.total), 0);
    const subtotal = laborTotal + partsTotal;
    const discount = Number(body.discount ?? existing.discount) || 0;
    const taxConfig = await getTaxConfig(tenantId);
    const tax = calculateTax(subtotal, discount, taxConfig);
    const grandTotal = calculateGrandTotal(subtotal, discount, tax);
    const delta = grandTotal - existing.grandTotal;
    data.laborTotal = laborTotal;
    data.partsTotal = partsTotal;
    data.discount = discount;
    data.tax = tax;
    data.grandTotal = grandTotal;
    data.status = existing.paidAmount >= grandTotal ? "paid" : existing.paidAmount > 0 ? "partial" : "unpaid";

    const invoice = await db.$transaction(async (tx) => {
      await tx.invoiceItem.deleteMany({ where: { invoiceId: id } });
      const updated = await tx.invoice.update({
        where: { id },
        data: { ...data, items: { create: items.map((i) => ({ type: i.type, name: i.name, quantity: Number(i.quantity) || 1, unitPrice: Number(i.unitPrice) || 0, discount: Number(i.discount) || 0, total: Number(i.total) || 0 })) } },
        include: { customer: true, vehicle: true, jobCard: true, items: true, payments: true },
      });
      if (delta !== 0) {
        await tx.customer.update({ where: { id: existing.customerId }, data: { balance: { increment: delta } } });
      }
      return updated;
    });
    await writeAudit(tenantId, "updated", "invoices", invoice.code);
    return NextResponse.json(invoice);
  }

  if (body.discount !== undefined && !items) {
    const discount = Number(body.discount) || 0;
    const subtotal = existing.laborTotal + existing.partsTotal;
    const taxConfig = await getTaxConfig(tenantId);
    const tax = calculateTax(subtotal, discount, taxConfig);
    const grandTotal = calculateGrandTotal(subtotal, discount, tax);
    const delta = grandTotal - existing.grandTotal;
    data.discount = discount;
    data.tax = tax;
    data.grandTotal = grandTotal;
    data.status = existing.paidAmount >= grandTotal ? "paid" : existing.paidAmount > 0 ? "partial" : "unpaid";
    if (existing.paidAmount > grandTotal) return NextResponse.json({ error: "invoice_has_payments" }, { status: 400 });
    const invoice = await db.$transaction(async (tx) => {
      const updated = await tx.invoice.update({ where: { id }, data, include: { customer: true, vehicle: true, jobCard: true, items: true, payments: true } });
      if (delta !== 0) await tx.customer.update({ where: { id: existing.customerId }, data: { balance: { increment: delta } } });
      return updated;
    });
    await writeAudit(tenantId, "updated", "invoices", invoice.code);
    return NextResponse.json(invoice);
  }

  const invoice = await db.invoice.update({ where: { id }, data, include: { customer: true, vehicle: true, jobCard: true, items: true, payments: true } });
  await writeAudit(tenantId, "updated", "invoices", invoice.code);
  return NextResponse.json(invoice);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await denyWithoutPermission("invoices", "delete");
  if (denied) return denied;

  const { id } = await params;
  const tenantId = await getTenantId();
  const existing = await db.invoice.findFirst({ where: { id, tenantId }, include: { payments: true } });
  if (!existing) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (existing.paidAmount > 0 || existing.payments.length > 0) {
    return NextResponse.json({ error: "invoice_has_payments" }, { status: 400 });
  }

  await db.$transaction(async (tx) => {
    const posMoves = await tx.stockMovement.findMany({ where: { tenantId, refId: id, refType: "pos_sale" } });
    for (const m of posMoves) {
      if (m.type === "out") {
        await tx.part.update({ where: { id: m.partId }, data: { quantity: { increment: m.quantity } } });
        await tx.stockMovement.create({
          data: { tenantId, partId: m.partId, warehouseId: m.warehouseId, type: "return", quantity: m.quantity, refType: "pos_sale", refId: id, note: `Reversed ${existing.code}` },
        });
      }
    }
    const remaining = existing.grandTotal - existing.paidAmount;
    if (remaining !== 0) {
      await tx.customer.update({ where: { id: existing.customerId }, data: { balance: { decrement: remaining } } });
    }
    await tx.invoice.delete({ where: { id } });
  });

  await writeAudit(tenantId, "deleted", "invoices", existing.code);
  return NextResponse.json({ ok: true });
}
