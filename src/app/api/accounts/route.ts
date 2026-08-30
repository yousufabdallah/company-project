import { db } from "@/lib/db";
import { getTenantId } from "@/lib/api";
import { NextResponse } from "next/server";

const METHODS = ["cash", "card", "bank", "other"];

const METHOD_META: Record<string, { icon: string; color: string; bgColor: string }> = {
  cash: { icon: "banknote", color: "emerald", bgColor: "bg-emerald-50 dark:bg-emerald-950/30" },
  card: { icon: "credit-card", color: "sky", bgColor: "bg-sky-50 dark:bg-sky-950/30" },
  bank: { icon: "landmark", color: "violet", bgColor: "bg-violet-50 dark:bg-violet-950/30" },
  other: { icon: "wallet", color: "amber", bgColor: "bg-amber-50 dark:bg-amber-950/30" },
};

export async function GET() {
  const tenantId = await getTenantId();

  // Get all payments (inflow) grouped by method
  const payments = await db.payment.findMany({
    where: { tenantId },
    include: { customer: true, invoice: true },
    orderBy: { date: "desc" },
  });

  // Get all expenses (outflow) grouped by method
  const expenses = await db.expense.findMany({
    where: { tenantId },
    include: { branch: true },
    orderBy: { date: "desc" },
  });

  // Build accounts (one per payment method)
  const accounts = METHODS.map((method) => {
    const methodPayments = payments.filter((p) => p.method === method);
    const methodExpenses = expenses.filter((e) => e.method === method);
    const inflow = methodPayments.reduce((s, p) => s + p.amount, 0);
    const outflow = methodExpenses.reduce((s, e) => s + e.amount, 0);
    const net = inflow - outflow;
    const lastPayment = methodPayments[0];
    const lastExpense = methodExpenses[0];
    const lastDate = lastPayment && lastExpense
      ? (lastPayment.date > lastExpense.date ? lastPayment.date : lastExpense.date)
      : (lastPayment?.date || lastExpense?.date || null);

    return {
      method,
      meta: METHOD_META[method],
      inflow,
      outflow,
      net,
      count: methodPayments.length + methodExpenses.length,
      lastDate,
    };
  });

  // Totals across all accounts
  const totals = {
    inflow: accounts.reduce((s, a) => s + a.inflow, 0),
    outflow: accounts.reduce((s, a) => s + a.outflow, 0),
    net: accounts.reduce((s, a) => s + a.net, 0),
    count: accounts.reduce((s, a) => s + a.count, 0),
  };

  // Combined transactions list (all accounts, newest first)
  const transactions = [
    ...payments.map((p) => ({
      id: p.id,
      type: "inflow",
      method: p.method,
      amount: p.amount,
      date: p.date.toISOString(),
      customerName: p.customer?.name || null,
      reference: p.reference || null,
      note: p.note || null,
      invoiceCode: p.invoice?.code || null,
      party: p.customer?.name || null,
      description: p.note || (p.invoice ? `Payment for ${p.invoice.code}` : "Payment received"),
    })),
    ...expenses.map((e) => ({
      id: e.id,
      type: "outflow",
      method: e.method,
      amount: e.amount,
      date: e.date.toISOString(),
      customerName: null,
      reference: null,
      note: e.description || null,
      invoiceCode: null,
      party: e.branch?.name || null,
      description: e.description || `Expense: ${e.category}`,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return NextResponse.json({ accounts, totals, transactions });
}
