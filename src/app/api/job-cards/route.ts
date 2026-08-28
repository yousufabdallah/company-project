import { db } from "@/lib/db";
import { getTenantId, nextCode } from "@/lib/api";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const tenantId = await getTenantId();
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const where: any = { tenantId };
  if (status) where.status = status;
  const items = await db.jobCard.findMany({
    where,
    include: { customer: true, vehicle: true, technician: true, services: { include: { service: true } }, parts: { include: { part: true } } },
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
  const tax = Math.round(((subtotal - discount) * (tenant?.taxPercent ?? 0)) / 100 * 1000) / 1000;
  const grandTotal = Math.round((subtotal - discount + tax) * 1000) / 1000;

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
    return job;
  });

  await db.auditLog.create({ data: { tenantId, action: "created", module: "job_cards", record: code } });
  return NextResponse.json(jc, { status: 201 });
}
