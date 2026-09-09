import { db } from "@/lib/db";
import { getTenantId, writeAudit } from "@/lib/api";
import { denyWithoutPermission } from "@/lib/guards";
import { NextResponse } from "next/server";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tenantId = await getTenantId();
  const jc = await db.jobCard.findFirst({
    where: { id, tenantId },
    include: {
      customer: true,
      vehicle: { include: { customer: true } },
      technician: true,
      services: { include: { service: true } },
      parts: { include: { part: { include: { category: true } } } },
      inspections: true,
      invoice: { include: { payments: true } },
    },
  });
  if (!jc) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(jc);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await denyWithoutPermission("jobCards", "edit");
  if (denied) return denied;

  const { id } = await params;
  const tenantId = await getTenantId();
  const body = await req.json();
  const { status, diagnosis, notes, technicianId } = body;
  const prev = await db.jobCard.findFirst({ where: { id, tenantId } });
  if (!prev) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.$transaction(async (tx) => {
    await tx.jobCard.update({ where: { id }, data: { status, diagnosis, notes, technicianId } });
    // When moving to in_progress/quality_check/completed → convert reserved parts to used + deduct stock
    if (status !== prev.status && ["in_progress", "quality_check", "completed", "ready_for_delivery", "delivered"].includes(status)) {
      const jcp = await tx.jobCardPart.findMany({ where: { jobCardId: id, status: "reserved" } });
      for (const p of jcp) {
        await tx.jobCardPart.update({ where: { id: p.id }, data: { status: "used" } });
        await tx.part.update({ where: { id: p.partId }, data: { quantity: { decrement: p.quantity } } });
        await tx.stockMovement.create({ data: { tenantId, partId: p.partId, type: "out", quantity: p.quantity, refType: "job_card", refId: id, note: "Used in " + prev.code } });
      }
    }
    // When cancelled → release reserved stock
    if (status === "cancelled") {
      const jcp = await tx.jobCardPart.findMany({ where: { jobCardId: id, status: "reserved" } });
      for (const p of jcp) {
        await tx.jobCardPart.update({ where: { id: p.id }, data: { status: "used" } });
        await tx.stockMovement.create({ data: { tenantId, partId: p.partId, type: "return", quantity: p.quantity, refType: "job_card", refId: id, note: "Released (cancelled) " + prev.code } });
      }
    }
  });

  await writeAudit(tenantId, "job_card_status_changed", "job_cards", prev.code + " → " + status);
  return NextResponse.json({ ok: true });
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await denyWithoutPermission("jobCards", "edit");
  if (denied) return denied;

  const { id } = await params;
  const tenantId = await getTenantId();
  const body = await req.json();
  const existing = await db.jobCard.findFirst({ where: { id, tenantId } });
  if (!existing) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const data: any = {};
  if (body.complaint !== undefined) data.complaint = String(body.complaint || "").trim();
  if (body.diagnosis !== undefined) data.diagnosis = body.diagnosis?.trim() || null;
  if (body.notes !== undefined) data.notes = body.notes?.trim() || null;
  if (body.technicianId !== undefined) data.technicianId = body.technicianId || null;
  if (body.advisorId !== undefined) data.advisorId = body.advisorId || null;
  if (body.mileage !== undefined) data.mileage = Number(body.mileage) || 0;
  if (body.priority !== undefined) data.priority = body.priority || "normal";
  if (body.estimatedCompletion !== undefined) data.estimatedCompletion = body.estimatedCompletion ? new Date(body.estimatedCompletion) : null;
  if (body.status !== undefined) data.status = body.status;

  const jc = await db.jobCard.update({
    where: { id },
    data,
    include: { customer: true, vehicle: true, technician: true },
  });
  await writeAudit(tenantId, "updated", "job_cards", jc.code);
  return NextResponse.json(jc);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await denyWithoutPermission("jobCards", "delete");
  if (denied) return denied;

  const { id } = await params;
  const tenantId = await getTenantId();
  const existing = await db.jobCard.findFirst({
    where: { id, tenantId },
    include: { invoice: { include: { payments: true } }, parts: true },
  });
  if (!existing) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (existing.invoice && (existing.invoice.paidAmount > 0 || existing.invoice.payments.length > 0)) {
    return NextResponse.json({ error: "invoice_has_payments" }, { status: 400 });
  }

  await db.$transaction(async (tx) => {
    for (const p of existing.parts) {
      if (p.status === "used") {
        await tx.part.update({ where: { id: p.partId }, data: { quantity: { increment: p.quantity } } });
      }
      await tx.stockMovement.create({
        data: {
          tenantId,
          partId: p.partId,
          type: "return",
          quantity: p.quantity,
          refType: "job_card",
          refId: id,
          note: `Released on delete ${existing.code}`,
        },
      });
    }
    await tx.warranty.deleteMany({ where: { jobCardId: id } });
    await tx.vehicleInspection.updateMany({ where: { jobCardId: id }, data: { jobCardId: null } });
    if (existing.invoice) {
      const remaining = existing.invoice.grandTotal - existing.invoice.paidAmount;
      if (remaining !== 0) {
        await tx.customer.update({ where: { id: existing.customerId }, data: { balance: { decrement: remaining } } });
      }
      await tx.invoice.delete({ where: { id: existing.invoice.id } });
    }
    await tx.jobCard.delete({ where: { id } });
  });

  await writeAudit(tenantId, "deleted", "job_cards", existing.code);
  return NextResponse.json({ ok: true });
}
