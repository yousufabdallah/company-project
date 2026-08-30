import { db } from "@/lib/db";

// Shared tax calculation — used by all APIs to ensure consistent tax logic.
// When tax is disabled on the tenant, returns 0.
// Formula: tax = (subtotal - discount) * taxPercent / 100

export interface TaxConfig {
  enabled: boolean;
  percent: number;
  taxNumber: string | null;
}

export async function getTaxConfig(tenantId: string): Promise<TaxConfig> {
  const tenant = await db.tenant.findUnique({
    where: { id: tenantId },
    select: { taxEnabled: true, taxPercent: true, taxNumber: true },
  });
  return {
    enabled: tenant?.taxEnabled ?? true,
    percent: tenant?.taxPercent ?? 0,
    taxNumber: tenant?.taxNumber ?? null,
  };
}

export function calculateTax(subtotal: number, discount: number, config: TaxConfig): number {
  if (!config.enabled || config.percent <= 0) return 0;
  const taxable = Math.max(0, subtotal - discount);
  return Math.round((taxable * config.percent) / 100 * 1000) / 1000;
}

export function calculateGrandTotal(subtotal: number, discount: number, tax: number): number {
  return Math.round((subtotal - discount + tax) * 1000) / 1000;
}
