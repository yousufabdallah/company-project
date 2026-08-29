import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";

// Session management for real authentication.
// Uses HMAC-signed httpOnly cookies (no external session store needed).

const SESSION_SECRET = process.env.SESSION_SECRET || "dev-secret-change-in-production-please";
const SESSION_COOKIE = "ws_session";
const SESSION_MAX_AGE = 7 * 24 * 60 * 60; // 7 days in seconds

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: string;
  tenantId: string | null;
  tenantName?: string | null;
}

// ─── Token signing/verification (HMAC) ────────────────────────
async function signToken(payload: Record<string, unknown>): Promise<string> {
  const { createHmac } = await import("crypto");
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", SESSION_SECRET).update(data).digest("base64url");
  return `${data}.${sig}`;
}

async function verifyToken(token: string): Promise<Record<string, unknown> | null> {
  const { createHmac, timingSafeEqual } = await import("crypto");
  const [data, sig] = token.split(".");
  if (!data || !sig) return null;
  const expectedSig = createHmac("sha256", SESSION_SECRET).update(data).digest("base64url");
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) return null;
  try {
    const payload = JSON.parse(Buffer.from(data, "base64url").toString());
    if (payload.exp && Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

// ─── Session cookie management ────────────────────────────────
export async function createSession(user: SessionUser): Promise<void> {
  const cookieStore = await cookies();
  const token = await signToken({
    ...user,
    exp: Date.now() + SESSION_MAX_AGE * 1000,
  });
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE,
    path: "/",
  });
}

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const payload = await verifyToken(token);
  if (!payload) return null;
  return {
    id: payload.id as string,
    name: payload.name as string,
    email: payload.email as string,
    role: payload.role as string,
    tenantId: (payload.tenantId as string) || null,
    tenantName: (payload.tenantName as string) || null,
  };
}

export async function requireSession(): Promise<SessionUser> {
  const session = await getSession();
  if (!session) {
    throw new Error("Unauthorized");
  }
  return session;
}

export async function requireSuperAdmin(): Promise<SessionUser> {
  const session = await requireSession();
  if (session.role !== "super_admin") {
    throw new Error("Forbidden: super admin only");
  }
  return session;
}

// ─── Password hashing ─────────────────────────────────────────
export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  // Support both bcrypt hashes (start with $2) and legacy plaintext
  if (hash.startsWith("$2")) {
    return bcrypt.compare(plain, hash);
  }
  return plain === hash;
}

// ─── Login verification against the database ─────────────────
export async function verifyCredentials(
  email: string,
  password: string
): Promise<SessionUser | null> {
  const user = await db.user.findUnique({
    where: { email: email.toLowerCase().trim() },
    include: { tenant: { select: { name: true } } },
  });
  if (!user) return null;
  if (!user.active) return null;
  const valid = await verifyPassword(password, user.password);
  if (!valid) return null;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    tenantId: user.tenantId,
    tenantName: user.tenant?.name || null,
  };
}
