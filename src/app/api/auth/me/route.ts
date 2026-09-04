import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import { withEffectivePermissions } from "@/lib/guards";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ user: null });
  }
  // Include effective permissions so client-side UI gating matches the
  // server-side mutation guards.
  return NextResponse.json({ user: await withEffectivePermissions(session) });
}
