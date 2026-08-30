import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { getSession, createSession, hashPassword, verifyPassword } from "@/lib/auth-server";

// GET — return current super admin profile
export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "super_admin") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const user = await db.user.findUnique({
    where: { id: session.id },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });
  return NextResponse.json(user);
}

// PUT — update email and/or password
export async function PUT(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "super_admin") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { email, currentPassword, newPassword } = body;

  const user = await db.user.findUnique({ where: { id: session.id } });
  if (!user) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const data: any = {};

  // Update email (must be unique)
  if (email && email.trim() && email.trim() !== user.email) {
    const existing = await db.user.findUnique({ where: { email: email.toLowerCase().trim() } });
    if (existing && existing.id !== user.id) {
      return NextResponse.json({ error: "email_in_use" }, { status: 409 });
    }
    data.email = email.toLowerCase().trim();
  }

  // Update password (requires current password verification)
  if (newPassword && newPassword.length >= 6) {
    if (!currentPassword) {
      return NextResponse.json({ error: "current_password_required" }, { status: 400 });
    }
    const valid = await verifyPassword(currentPassword, user.password);
    if (!valid) {
      return NextResponse.json({ error: "wrong_password" }, { status: 400 });
    }
    data.password = await hashPassword(newPassword);
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "no_changes" }, { status: 400 });
  }

  const updated = await db.user.update({
    where: { id: session.id },
    data,
    select: { id: true, name: true, email: true, role: true },
  });

  // Re-create session with updated email
  await createSession({
    id: updated.id,
    name: updated.name,
    email: updated.email,
    role: updated.role,
    tenantId: session.tenantId,
    tenantName: session.tenantName,
  });

  await db.auditLog.create({
    data: {
      tenantId: session.tenantId || "",
      userId: session.id,
      action: "account_updated",
      module: "auth",
      record: updated.email,
    },
  });

  return NextResponse.json(updated);
}
