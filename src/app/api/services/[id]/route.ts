import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getTenantId } from "@/lib/api";
import { getSession } from "@/lib/auth-server";
import { denyWithoutPermission } from "@/lib/guards";
import { updateServiceSchema } from "@/lib/service-input";
import { NextResponse } from "next/server";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: RouteContext) {
  const { id } = await params;
  const tenantId = await getTenantId();
  const service = await db.service.findFirst({ where: { id, tenantId } });

  if (!service) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return NextResponse.json(service);
}

export async function PUT(req: Request, { params }: RouteContext) {
  const denied = await denyWithoutPermission("services", "edit");
  if (denied) return denied;

  const { id } = await params;
  const tenantId = await getTenantId();
  const body = await req.json().catch(() => null);
  const parsed = updateServiceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_service_data" }, { status: 400 });
  }

  const existing = await db.service.findFirst({ where: { id, tenantId } });
  if (!existing) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  if (parsed.data.code) {
    const duplicate = await db.service.findFirst({
      where: {
        tenantId,
        id: { not: id },
        code: { equals: parsed.data.code, mode: "insensitive" },
      },
      select: { id: true },
    });
    if (duplicate) {
      return NextResponse.json({ error: "service_code_in_use" }, { status: 409 });
    }
  }

  const service = await db.service.update({ where: { id }, data: parsed.data });
  const session = await getSession();
  await db.auditLog.create({
    data: {
      tenantId,
      userId: session?.id ?? null,
      action: "updated",
      module: "services",
      record: `${service.code} · ${service.name}`,
    },
  });

  return NextResponse.json(service);
}

export async function DELETE(_req: Request, { params }: RouteContext) {
  const denied = await denyWithoutPermission("services", "delete");
  if (denied) return denied;

  const { id } = await params;
  const tenantId = await getTenantId();
  const existing = await db.service.findFirst({ where: { id, tenantId } });
  if (!existing) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const [jobCards, appointments] = await Promise.all([
    db.jobCardService.count({ where: { serviceId: id } }),
    db.appointment.count({ where: { serviceId: id } }),
  ]);
  if (jobCards + appointments > 0) {
    return NextResponse.json(
      { error: "service_in_use", counts: { jobCards, appointments } },
      { status: 409 },
    );
  }

  try {
    await db.service.delete({ where: { id } });
  } catch (error) {
    // A linked record may have been created after the usage check.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
      return NextResponse.json({ error: "service_in_use" }, { status: 409 });
    }
    throw error;
  }

  const session = await getSession();
  await db.auditLog.create({
    data: {
      tenantId,
      userId: session?.id ?? null,
      action: "deleted",
      module: "services",
      record: `${existing.code} · ${existing.name}`,
    },
  });

  return NextResponse.json({ ok: true });
}
