import { db } from "@/lib/db";
import { getTenantId } from "@/lib/api";
import { hashPassword } from "@/lib/auth-server";
import { getSession } from "@/lib/auth-server";
import { NextResponse } from "next/server";

const ROLES = ["owner", "manager", "advisor", "technician", "accountant", "inventory"];

// Only owners and managers can manage users
async function canManageUsers() {
  const session = await getSession();
  if (!session) return false;
  return session.role === "owner" || session.role === "manager";
}

export async function GET() {
  const tenantId = await getTenantId();
  const items = await db.user.findMany({
    where: { tenantId },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      active: true,
      lastLoginAt: true,
      createdAt: true,
    },
    orderBy: [{ role: "asc" }, { name: "asc" }],
  });

  // Count by role
  const byRole: Record<string, number> = {};
  for (const u of items) byRole[u.role] = (byRole[u.role] || 0) + 1;

  return NextResponse.json({ items, byRole, total: items.length });
}

export async function POST(req: Request) {
  const canManage = await canManageUsers();
  if (!canManage) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const tenantId = await getTenantId();
  const body = await req.json();
  const { name, email, phone, role, password, active } = body;

  // Validation
  if (!name?.trim()) return NextResponse.json({ error: "name_required" }, { status: 400 });
  if (!email?.trim()) return NextResponse.json({ error: "email_required" }, { status: 400 });
  if (!ROLES.includes(role)) return NextResponse.json({ error: "invalid_role" }, { status: 400 });
  if (!password || password.length < 6) return NextResponse.json({ error: "password_short" }, { status: 400 });

  // Check email uniqueness
  const existing = await db.user.findUnique({ where: { email: email.toLowerCase().trim() } });
  if (existing) return NextResponse.json({ error: "email_in_use" }, { status: 409 });

  const hashed = await hashPassword(password);
  const user = await db.user.create({
    data: {
      tenantId,
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phone: phone?.trim() || null,
      role,
      password: hashed,
      active: active ?? true,
    },
    select: { id: true, name: true, email: true, phone: true, role: true, active: true, createdAt: true },
  });

  await db.auditLog.create({ data: { tenantId, action: "user_created", module: "users", record: user.email } });
  return NextResponse.json(user, { status: 201 });
}
