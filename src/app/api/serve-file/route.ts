import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

// Serve uploaded files (logo, stamp) through an API route instead of
// relying on Next.js static file serving which may not work through
// the gateway/preview panel.
//
// Usage: /api/serve-file?path=/uploads/filename.png
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const path = searchParams.get("path");

  if (!path) {
    return new NextResponse("Missing path", { status: 400 });
  }

  // Security: only allow files from /uploads/ directory
  if (!path.startsWith("/uploads/") && !path.startsWith("uploads/")) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  // Normalize the path
  const cleanPath = path.replace(/^\/+/, "");
  const filePath = join(process.cwd(), "public", cleanPath);

  // Check if file exists
  if (!existsSync(filePath)) {
    return new NextResponse("File not found", { status: 404 });
  }

  // Read the file
  const buffer = await readFile(filePath);

  // Determine content type from extension
  const ext = cleanPath.split(".").pop()?.toLowerCase() || "";
  const contentTypes: Record<string, string> = {
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    webp: "image/webp",
    svg: "image/svg+xml",
  };
  const contentType = contentTypes[ext] || "application/octet-stream";

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  });
}
