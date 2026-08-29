import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { getTenantId } from "@/lib/api";
import { db } from "@/lib/db";
import { randomBytes } from "crypto";
import { getSession } from "@/lib/auth-server";

// Upload workshop logo or stamp.
// Saves the file to /public/uploads/<tenantId>_<type>_<random>.<ext>
// and persists the URL on the tenant.
export async function POST(req: Request) {
  // Resolve tenant from session (real auth)
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // For super_admin without a workshop, fall back to the platform tenant
  let tenantId = session.tenantId;
  if (!tenantId || session.role === "super_admin") {
    const platform = await db.tenant.findFirst({ where: { name: "Platform Administration" } });
    tenantId = platform?.id;
    if (!tenantId) {
      return NextResponse.json({ error: "no_tenant" }, { status: 400 });
    }
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const type = (formData.get("type") as string) || "logo";

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }
  if (!["logo", "stamp"].includes(type)) {
    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  }

  // Validate mime type — images only
  const allowed = ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/svg+xml", "image/gif"];
  if (!allowed.includes(file.type)) {
    return NextResponse.json({ error: "Only image files are allowed (PNG, JPG, WebP, SVG, GIF)" }, { status: 400 });
  }

  // Size limit: 2 MB
  if (file.size > 2 * 1024 * 1024) {
    return NextResponse.json({ error: "File too large (max 2 MB)" }, { status: 400 });
  }

  const ext = file.name.split(".").pop()?.toLowerCase() || "png";
  const rand = randomBytes(4).toString("hex");
  const filename = `${tenantId}_${type}_${rand}.${ext}`;
  const uploadDir = join(process.cwd(), "public", "uploads");
  await mkdir(uploadDir, { recursive: true });
  const filepath = join(uploadDir, filename);
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(filepath, buffer);

  const url = `/api/serve-file?path=/uploads/${filename}`;

  // Persist the URL on the tenant
  await db.tenant.update({
    where: { id: tenantId },
    data: type === "logo" ? { logo: url } : { stamp: url },
  });

  return NextResponse.json({ url, type });
}
