import { db } from "@/lib/db";
import { getTenantId } from "@/lib/api";
import { hashPassword, getSession } from "@/lib/auth-server";
import { getRoleDefaults } from "@/lib/permissions";
import { NextResponse } from "next/server";

const ROLES = ["owner", "manager", "advisor", "technician", "accountant", "inventory"];

async function canManageUsers() {
  const session = await getSession();
  if (!session) return null;
  if (session.role === "owner" || session.role === "manager") return session;
  return null;
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
      permissions: true,
      lastLoginAt: true,
      createdAt: true,
    },
    orderBy: [{ role: "asc" }, { name: "asc" }],
  });

  // Parse permissions JSON for each user
  const parsed = items.map((u) => ({
    ...u,
    permissions: u.permissions ? JSON.parse(u.permissions) : getRoleDefaults(u.role),
  }));

  const byRole: Record<string, number> = {};
  for (const u of parsed) byRole[u.role] = (byRole[u.role] || 0) + 1;

  return NextResponse.json({ items: parsed, byRole, total: parsed.length });
}

export async function POST(req: Request) {
  const session = await canManageUsers();
  if (!session) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const tenantId = await getTenantId();
  const body = await req.json();
  const { name, email, phone, role, password, active, permissions } = body;

  if (!name?.trim()) return NextResponse.json({ error: "name_required" }, { status: 400 });
  if (!email?.trim()) return NextResponse.json({ error: "email_required" }, { status: 400 });
  if (!ROLES.includes(role)) return NextResponse.json({ error: "invalid_role" }, { status: 400 });
  if (!password || password.length < 6) return NextResponse.json({ error: "password_short" }, { status: 400 });

  const existing = await db.user.findUnique({ where: { email: email.toLowerCase().trim() } });
  if (existing) return NextResponse.json({ error: "email_in_use" }, { status: 409 });

  const hashed = await hashPassword(password);
  // Use provided permissions or fall back to role defaults
  const perms = permissions || getRoleDefaults(role);

  const user = await db.user.create({
    data: {
      tenantId,
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phone: phone?.trim() || null,
      role,
      password: hashed,
      active: active ?? true,
      permissions: JSON.stringify(perms),
    },
    select: { id: true, name: true, email: true, phone: true, role: true, active: true, permissions: true, createdAt: true },
  });

  await db.auditLog.create({ data: { tenantId, action: "user_created", module: "users", record: user.email } });
  return NextResponse.json({ ...user, permissions: JSON.parse(user.permissions) }, { status: 201 });
}
