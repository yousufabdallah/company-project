"use client";

import { useT, formatMoney, formatDateTime } from "@/lib/format";
import { useApi, useApiMutation, EmptyState, LoadingRows, PageHeader } from "@/components/shared";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Banknote, CreditCard, Landmark, Wallet, ArrowDownLeft, ArrowUpRight, TrendingUp, TrendingDown, Scale, ArrowUpFromLine, Loader2 } from "lucide-react";
import { useState } from "react";

const METHOD_ICONS: Record<string, any> = {
  banknote: Banknote,
  "credit-card": CreditCard,
  landmark: Landmark,
  wallet: Wallet,
};

const METHOD_COLORS: Record<string, { text: string; bg: string; ring: string }> = {
  emerald: { text: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-950/40", ring: "ring-emerald-200 dark:ring-emerald-900" },
  sky: { text: "text-sky-600 dark:text-sky-400", bg: "bg-sky-50 dark:bg-sky-950/40", ring: "ring-sky-200 dark:ring-sky-900" },
  violet: { text: "text-violet-600 dark:text-violet-400", bg: "bg-violet-50 dark:bg-violet-950/40", ring: "ring-violet-200 dark:ring-violet-900" },
  amber: { text: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-950/40", ring: "ring-amber-200 dark:ring-amber-900" },
};

export function AccountsView() {
  const { t, lang } = useT();
  const { data, isLoading } = useApi<any>("/api/accounts");
  const [methodFilter, setMethodFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [q, setQ] = useState("");
  const { invalidate, toastSuccess, toastError } = useApiMutation();
  const [withdrawDialog, setWithdrawDialog] = useState<any>(null);

  const money = (n: number) => formatMoney(n, "OMR", lang);

  if (isLoading || !data) {
    return (
      <div>
        <PageHeader title={t("accounts")} subtitle={t("accountsDesc")} />
        <LoadingRows rows={8} />
      </div>
    );
  }

  const accounts = data.accounts || [];
  const totals = data.totals || {};
  const allTxns = data.transactions || [];

  const filteredTxns = allTxns.filter((tx: any) => {
    if (methodFilter !== "all" && tx.method !== methodFilter) return false;
    if (typeFilter !== "all" && tx.type !== typeFilter) return false;
    if (q) {
      const text = `${tx.party || ""} ${tx.description || ""} ${tx.reference || ""} ${tx.invoiceCode || ""}`.toLowerCase();
      if (!text.includes(q.toLowerCase())) return false;
    }
    return true;
  });

  return (
    <div>
      <PageHeader title={t("accounts")} subtitle={t("accountsDesc")} />

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 mb-5">
        <Card className="bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">{t("totalInflow")}</p>
                <p className="mt-1 text-2xl font-bold text-emerald-600 dark:text-emerald-400 tnum">{money(totals.inflow || 0)}</p>
              </div>
              <div className="rounded-lg bg-emerald-100 dark:bg-emerald-900/50 p-2.5">
                <ArrowDownLeft className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">{t("totalOutflow")}</p>
                <p className="mt-1 text-2xl font-bold text-red-600 dark:text-red-400 tnum">{money(totals.outflow || 0)}</p>
              </div>
              <div className="rounded-lg bg-red-100 dark:bg-red-900/50 p-2.5">
                <ArrowUpRight className="h-5 w-5 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-primary/5 border-primary/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">{t("netBalance")}</p>
                <p className={`mt-1 text-2xl font-bold tnum ${(totals.net || 0) >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>{money(totals.net || 0)}</p>
              </div>
              <div className="rounded-lg bg-primary/10 p-2.5">
                <Scale className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payment account boxes */}
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{t("paymentAccounts")}</h2>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        {accounts.map((acc: any) => {
          const Icon = METHOD_ICONS[acc.meta.icon] || Wallet;
          const colors = METHOD_COLORS[acc.meta.color] || METHOD_COLORS.amber;
          const accountLabel = t(`account${acc.method.charAt(0).toUpperCase() + acc.method.slice(1)}`);
          return (
            <Card key={acc.method} className={`relative overflow-hidden border ${colors.ring} hover:shadow-md transition-shadow`}>
              <CardContent className="p-4">
                {/* Top row: icon + method name */}
                <div className="flex items-start justify-between">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${colors.bg}`}>
                    <Icon className={`h-5 w-5 ${colors.text}`} />
                  </div>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground tnum">
                    {acc.count} {t("transactionsCount")}
                  </span>
                </div>
                {/* Method name */}
                <h3 className="mt-3 text-sm font-bold">{accountLabel}</h3>
                {/* Net balance (big) */}
                <p className={`mt-1 text-2xl font-bold tnum ${acc.net >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                  {money(acc.net)}
                </p>
                <p className="text-[10px] text-muted-foreground">{t("netBalance")}</p>

                {/* Inflow / outflow mini */}
                <div className="mt-3 grid grid-cols-2 gap-2 border-t pt-2">
                  <div className="text-start">
                    <p className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <TrendingUp className="h-3 w-3 text-emerald-500" />
                      {t("inflow")}
                    </p>
                    <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 tnum">{money(acc.inflow)}</p>
                  </div>
                  <div className="text-end">
                    <p className="flex items-center justify-end gap-1 text-[10px] text-muted-foreground">
                      <TrendingDown className="h-3 w-3 text-red-500" />
                      {t("outflow")}
                    </p>
                    <p className="text-xs font-semibold text-red-600 dark:text-red-400 tnum">{money(acc.outflow)}</p>
                  </div>
                </div>

                {/* Last transaction */}
                {acc.lastDate && (
                  <p className="mt-2 text-[10px] text-muted-foreground">
                    {t("lastTransaction")}: {formatDateTime(acc.lastDate, lang)}
                  </p>
                )}

                {/* Withdraw button — only enabled if balance > 0 */}
                <Button
                  size="sm"
                  variant="outline"
                  className={`mt-3 w-full h-8 text-xs ${colors.text} ${colors.bg} border-current/30 hover:opacity-80`}
                  disabled={acc.net <= 0}
                  onClick={() => setWithdrawDialog(acc)}
                >
                  <ArrowUpFromLine className="h-3.5 w-3.5 me-1" />
                  {t("withdraw")}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Withdraw dialog */}
      {withdrawDialog && (
        <WithdrawDialog
          account={withdrawDialog}
          onClose={() => setWithdrawDialog(null)}
          onSuccess={() => {
            invalidate(["/api/accounts", "/api/dashboard"]);
            setWithdrawDialog(null);
          }}
        />
      )}

      {/* All transactions table */}
      <Card>
        <CardContent className="p-3 sm:p-4">
          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-sm font-semibold">{t("allTransactions")} ({filteredTxns.length})</h2>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("search")} className="h-9 w-40 ps-9" />
              </div>
              <Select value={methodFilter} onValueChange={setMethodFilter}>
                <SelectTrigger className="h-9 w-32"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("all")}</SelectItem>
                  <SelectItem value="cash">{t("cash")}</SelectItem>
                  <SelectItem value="card">{t("card")}</SelectItem>
                  <SelectItem value="bank">{t("bankTransfer")}</SelectItem>
                  <SelectItem value="other">{t("other")}</SelectItem>
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="h-9 w-32"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("all")}</SelectItem>
                  <SelectItem value="inflow">{t("inflow")}</SelectItem>
                  <SelectItem value="outflow">{t("outflow")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {filteredTxns.length === 0 ? (
            <EmptyState title={t("noTransactions")} icon={Wallet} />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">{t("date")}</TableHead>
                    <TableHead className="text-xs">{t("paymentMethod")}</TableHead>
                    <TableHead className="text-xs">{t("type")}</TableHead>
                    <TableHead className="text-xs">{t("description")}</TableHead>
                    <TableHead className="text-xs hidden md:table-cell">{t("reference")}</TableHead>
                    <TableHead className="text-xs text-end">{t("amount")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTxns.map((tx: any) => {
                    const Icon = METHOD_ICONS[tx.method === "cash" ? "banknote" : tx.method === "card" ? "credit-card" : tx.method === "bank" ? "landmark" : "wallet"];
                    const colors = METHOD_COLORS[tx.method === "cash" ? "emerald" : tx.method === "card" ? "sky" : tx.method === "bank" ? "violet" : "amber"];
                    return (
                      <TableRow key={tx.id}>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{formatDateTime(tx.date, lang)}</TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium ${colors.bg} ${colors.text}`}>
                            <Icon className="h-3 w-3" />
                            {t(tx.method === "bank" ? "bankTransfer" : tx.method)}
                          </span>
                        </TableCell>
                        <TableCell>
                          {tx.type === "inflow" ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                              <ArrowDownLeft className="h-3 w-3" />
                              {t("inflow")}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-medium text-red-800 dark:bg-red-950 dark:text-red-300">
                              <ArrowUpRight className="h-3 w-3" />
                              {t("outflow")}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs">
                          <p className="font-medium">{tx.description}</p>
                          {tx.party && <p className="text-muted-foreground text-[10px]">{tx.party}</p>}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-xs font-mono text-muted-foreground">{tx.reference || tx.invoiceCode || "—"}</TableCell>
                        <TableCell className={`text-end font-semibold tnum text-xs ${tx.type === "inflow" ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                          {tx.type === "inflow" ? "+" : "−"} {money(tx.amount)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Withdraw Dialog ──────────────────────────────────────────
function WithdrawDialog({ account, onClose, onSuccess }: { account: any; onClose: () => void; onSuccess: () => void }) {
  const { t, lang } = useT();
  const { toastSuccess, toastError } = useApiMutation();
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("catCashOut");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const money = (n: number) => formatMoney(n, "OMR", lang);
  const amt = Number(amount) || 0;
  const currentBalance = account.net;
  const newBalance = currentBalance - amt;
  const accountLabel = t(`account${account.method.charAt(0).toUpperCase() + account.method.slice(1)}`);

  const submit = async () => {
    if (!amount || amt <= 0) return toastError(t("required"));
    setSaving(true);
    try {
      const res = await fetch("/api/accounts/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          method: account.method,
          amount: amt,
          category: t(category),
          description: description || t(category),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error === "insufficientBalance") {
          toastError(t("insufficientBalance"));
        } else {
          toastError(data.error || "Error");
        }
        return;
      }
      toastSuccess(t("withdrawSuccess"));
      onSuccess();
    } catch {
      toastError("Error");
    } finally {
      setSaving(false);
    }
  };

  const categories = ["catCashOut", "catBankDeposit", "catOwnerWithdrawal", "catTransfer", "catExpensePayment"];

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowUpFromLine className="h-5 w-5 text-red-500" />
            {t("withdrawFromAccount")}
          </DialogTitle>
          <DialogDescription>
            {accountLabel} — {t("withdrawDesc")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current balance display */}
          <div className="rounded-lg border bg-muted/30 p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">{t("currentBalance")}</p>
                <p className={`text-2xl font-bold tnum ${currentBalance >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                  {money(currentBalance)}
                </p>
              </div>
              <div className="text-end">
                <p className="text-xs text-muted-foreground">{t("newBalance")}</p>
                <p className={`text-2xl font-bold tnum ${newBalance >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                  {money(newBalance)}
                </p>
              </div>
            </div>
          </div>

          {/* Amount input + quick buttons */}
          <div className="space-y-1.5">
            <Label htmlFor="withdraw-amount" className="text-xs">{t("withdrawAmount")} *</Label>
            <div className="relative">
              <Input
                id="withdraw-amount"
                type="number"
                step="0.001"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.000"
                className="text-end text-lg font-bold tnum pe-12"
                autoFocus
              />
              <span className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground">OMR</span>
            </div>
            <div className="flex gap-1">
              {[0.25, 0.5, 0.75, 1].map((pct) => (
                <Button
                  key={pct}
                  type="button"
                  size="sm"
                  variant="outline"
                  className="flex-1 h-7 text-xs tnum"
                  onClick={() => setAmount(String(Math.round(currentBalance * pct * 1000) / 1000))}
                >
                  {pct === 1 ? t("all") || "All" : `${pct * 100}%`}
                </Button>
              ))}
            </div>
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <Label className="text-xs">{t("withdrawCategory")}</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c} value={c}>{t(c)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="withdraw-reason" className="text-xs">{t("withdrawReason")}</Label>
            <Textarea
              id="withdraw-reason"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("withdrawReason")}
              rows={2}
            />
          </div>

          {/* Action buttons */}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>{t("cancel")}</Button>
            <Button
              onClick={submit}
              disabled={saving || amt <= 0 || amt > currentBalance}
              variant="destructive"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin me-1" />}
              {t("withdraw")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
