import { db } from "@/lib/db";
import { getTenantId } from "@/lib/api";
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

  await db.auditLog.create({ data: { tenantId, action: "job_card_status_changed", module: "job_cards", record: prev.code + " → " + status } });
  return NextResponse.json({ ok: true });
}
