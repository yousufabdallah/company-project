import { db } from "@/lib/db";
import { getTenantId } from "@/lib/api";
import { hashPassword, getSession } from "@/lib/auth-server";
import { NextResponse } from "next/server";

const ROLES = ["owner", "manager", "advisor", "technician", "accountant", "inventory"];

async function canManageUsers() {
  const session = await getSession();
  if (!session) return null;
  if (session.role === "owner" || session.role === "manager") return session;
  return null;
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await canManageUsers();
  if (!session) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { id } = await params;
  const tenantId = await getTenantId();
  const body = await req.json();
  const { name, email, phone, role, password, active } = body;

  // Get existing user
  const existing = await db.user.findFirst({ where: { id, tenantId } });
  if (!existing) return NextResponse.json({ error: "not_found" }, { status: 404 });

  // Prevent demoting the last owner
  if (existing.role === "owner" && role && role !== "owner") {
    const ownerCount = await db.user.count({ where: { tenantId, role: "owner", active: true } });
    if (ownerCount <= 1) return NextResponse.json({ error: "last_owner" }, { status: 400 });
  }

  const data: any = {};
  if (name !== undefined) data.name = name.trim();
  if (email !== undefined) data.email = email.toLowerCase().trim();
  if (phone !== undefined) data.phone = phone?.trim() || null;
  if (role !== undefined && ROLES.includes(role)) data.role = role;
  if (active !== undefined) data.active = active;

  // Update password only if provided
  if (password && password.length >= 6) {
    data.password = await hashPassword(password);
  }

  const user = await db.user.update({
    where: { id },
    data,
    select: { id: true, name: true, email: true, phone: true, role: true, active: true, lastLoginAt: true },
  });

  await db.auditLog.create({ data: { tenantId, action: "user_updated", module: "users", record: user.email } });
  return NextResponse.json(user);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await canManageUsers();
  if (!session) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { id } = await params;
  const tenantId = await getTenantId();

  // Cannot delete self
  if (id === session.id) return NextResponse.json({ error: "cannot_delete_self" }, { status: 400 });

  const existing = await db.user.findFirst({ where: { id, tenantId } });
  if (!existing) return NextResponse.json({ error: "not_found" }, { status: 404 });

  // Prevent deleting last owner
  if (existing.role === "owner") {
    const ownerCount = await db.user.count({ where: { tenantId, role: "owner", active: true } });
    if (ownerCount <= 1) return NextResponse.json({ error: "last_owner" }, { status: 400 });
  }

  await db.user.delete({ where: { id } });
  await db.auditLog.create({ data: { tenantId, action: "user_deleted", module: "users", record: existing.email } });
  return NextResponse.json({ ok: true });
}
