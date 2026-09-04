import { NextResponse } from "next/server";
import { verifyCredentials, createSession } from "@/lib/auth-server";
import { withEffectivePermissions } from "@/lib/guards";

export async function POST(req: Request) {
  const body = await req.json();
  const { email, password } = body;

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
  }

  const user = await verifyCredentials(email, password);
  if (!user) {
    return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
  }

  await createSession(user);

  return NextResponse.json(await withEffectivePermissions(user));
}
