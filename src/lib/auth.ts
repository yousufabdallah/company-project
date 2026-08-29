// Demo credentials for the Auto Workshop SaaS
// In production these would be in the database with hashed passwords.

export interface DemoUser {
  email: string;
  password: string;
  name: string;
  role: "owner" | "manager" | "advisor" | "technician" | "accountant" | "inventory" | "super_admin";
  tenantName?: string;
}

export const DEMO_USERS: DemoUser[] = [
  { email: "owner@almanara.om", password: "demo1234", name: "Khalid Al-Rashidi", role: "owner", tenantName: "Al-Manara Auto Service" },
  { email: "manager@almanara.om", password: "demo1234", name: "Sami Al-Balushi", role: "manager", tenantName: "Al-Manara Auto Service" },
  { email: "advisor@almanara.om", password: "demo1234", name: "Yousef Al-Hinai", role: "advisor", tenantName: "Al-Manara Auto Service" },
  { email: "tech@almanara.om", password: "demo1234", name: "Ahmed Al-Maawali", role: "technician", tenantName: "Al-Manara Auto Service" },
  { email: "accounts@almanara.om", password: "demo1234", name: "Fatima Al-Zadjali", role: "accountant", tenantName: "Al-Manara Auto Service" },
  { email: "inventory@almanara.om", password: "demo1234", name: "Omar Al-Jabri", role: "inventory", tenantName: "Al-Manara Auto Service" },
  { email: "admin@autosaas.com", password: "admin123", name: "Platform Administrator", role: "super_admin" },
];

export function authenticate(email: string, password: string): DemoUser | null {
  const user = DEMO_USERS.find((u) => u.email.toLowerCase() === email.toLowerCase().trim() && u.password === password);
  return user || null;
}
