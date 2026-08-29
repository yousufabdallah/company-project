import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth-server";

async function guard() {
  try {
    await requireSuperAdmin();
    return null;
  } catch {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
}

const DEFAULT_SETTINGS: Record<string, string> = {
  platformName: "AutoSaaS Platform",
  supportEmail: "support@autosaas.com",
  trialDays: "14",
  defaultCurrency: "OMR",
  maintenanceMode: "false",
};

async function ensureDefaults() {
  const count = await db.platformSetting.count();
  if (count === 0) {
    await db.platformSetting.createMany({
      data: Object.entries(DEFAULT_SETTINGS).map(([key, value]) => ({ key, value })),
    });
  }
}

export async function GET() {
  const err = await guard();
  if (err) return err;
  await ensureDefaults();
  const rows = await db.platformSetting.findMany();
  const settings: Record<string, string> = { ...DEFAULT_SETTINGS };
  for (const r of rows) settings[r.key] = r.value;
  return NextResponse.json(settings);
}

export async function PUT(req: Request) {
  const err = await guard();
  if (err) return err;
  const body = await req.json();
  const allowed = ["platformName", "supportEmail", "trialDays", "defaultCurrency", "maintenanceMode"];
  for (const key of allowed) {
    if (key in body) {
      const value = String(body[key]);
      await db.platformSetting.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      });
    }
  }
  const rows = await db.platformSetting.findMany();
  const settings: Record<string, string> = { ...DEFAULT_SETTINGS };
  for (const r of rows) settings[r.key] = r.value;
  return NextResponse.json(settings);
}
