// Auth helper for client-side code.
// Real authentication is handled by /api/auth/* endpoints (see src/lib/auth-server.ts).
// This file only contains the demo role list used by the login screen's demo dropdown.

export const DEMO_ROLES = [
  "owner",
  "manager",
  "advisor",
  "technician",
  "accountant",
  "inventory",
  "super_admin",
] as const;

export type DemoRole = (typeof DEMO_ROLES)[number];
