import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const { status } = body; // "active" | "suspended" | "trial"

  const tenant = await db.tenant.update({
    where: { id },
    data: { status },
  });

  return NextResponse.json(tenant);
}
