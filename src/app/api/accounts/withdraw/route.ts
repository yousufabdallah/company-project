import { db } from "@/lib/db";
import { getTenantId } from "@/lib/api";
import { NextResponse } from "next/server";

// Withdraw funds from a payment account (cash / card / bank / other).
// Records an Expense with the same payment method so the Accounts view
// reflects the withdrawal as an outflow for that account.
export async function POST(req: Request) {
  const tenantId = await getTenantId();
  const body = await req.json();
  const { method, amount, category, description } = body;

  // Validation
  if (!method || !["cash", "card", "bank", "other"].includes(method)) {
    return NextResponse.json({ error: "Invalid payment method" }, { status: 400 });
  }
  const amt = Number(amount);
  if (!amt || amt <= 0) {
    return NextResponse.json({ error: "Amount must be greater than 0" }, { status: 400 });
  }
  if (!category) {
    return NextResponse.json({ error: "Category is required" }, { status: 400 });
  }

  // Verify the account has enough balance (inflow - outflow for this method)
  const methodPayments = await db.payment.aggregate({
    where: { tenantId, method },
    _sum: { amount: true },
  });
  const methodExpenses = await db.expense.aggregate({
    where: { tenantId, method },
    _sum: { amount: true },
  });
  const inflow = methodPayments._sum.amount ?? 0;
  const outflow = methodExpenses._sum.amount ?? 0;
  const currentBalance = inflow - outflow;

  if (amt > currentBalance) {
    return NextResponse.json(
      { error: "insufficientBalance", balance: currentBalance, requested: amt },
      { status: 400 }
    );
  }

  // Record the withdrawal as an expense (outflow)
  const expense = await db.expense.create({
    data: {
      tenantId,
      branchId: null,
      category: category, // e.g. "Bank Deposit", "Owner Withdrawal", etc.
      amount: amt,
      date: new Date(),
      method, // cash | card | bank | other — same payment method
      description: description || `Withdrawal from ${method} account: ${category}`,
    },
  });

  // Audit log
  await db.auditLog.create({
    data: {
      tenantId,
      action: "account_withdrawal",
      module: "accounts",
      record: `${method} - ${amt} - ${category}`,
    },
  });

  const newBalance = currentBalance - amt;

  return NextResponse.json(
    {
      id: expense.id,
      method,
      amount: amt,
      category,
      description: expense.description,
      date: expense.date,
      previousBalance: currentBalance,
      newBalance,
    },
    { status: 201 }
  );
}
