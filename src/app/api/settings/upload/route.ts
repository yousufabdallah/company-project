import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { getTenantId } from "@/lib/api";
import { db } from "@/lib/db";
import { randomBytes } from "crypto";

// Upload workshop logo or stamp.
// Saves the file to /public/uploads/<tenantId>_<type>_<random>.<ext>
// and returns the public URL. The settings PUT then stores the URL on the tenant.
export async function POST(req: Request) {
  const tenantId = await getTenantId();
  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const type = (formData.get("type") as string) || "logo"; // logo | stamp

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

  const ext = file.name.split(".").pop()?.toLowerCase() || (file.type === "image/png" ? "png" : file.type === "image/jpeg" ? "jpg" : file.type === "image/webp" ? "webp" : file.type === "image/svg+xml" ? "svg" : "img");
  const rand = randomBytes(4).toString("hex");
  const filename = `${tenantId}_${type}_${rand}.${ext}`;
  const uploadDir = join(process.cwd(), "public", "uploads");
  await mkdir(uploadDir, { recursive: true });
  const filepath = join(uploadDir, filename);
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(filepath, buffer);

  const url = `/uploads/${filename}`;

  // Persist the URL on the tenant immediately
  await db.tenant.update({ where: { id: tenantId }, data: type === "logo" ? { logo: url } : { stamp: url } });

  return NextResponse.json({ url, type });
}
