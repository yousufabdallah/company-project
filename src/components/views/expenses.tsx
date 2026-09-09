"use client";

import { useT, formatMoney, formatDate } from "@/lib/format";
import { useApi, EmptyState, LoadingRows, PageHeader, useApiMutation, RowActions } from "@/components/shared";
import { usePermissions } from "@/lib/use-permissions";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from "recharts";
import { useState } from "react";
import { TrendingDown, Plus, Pencil, Loader2 } from "lucide-react";

const CATEGORIES = ["rent", "electricity", "salaries", "tools", "transport", "maintenance", "marketing", "other"];
const COLORS = ["#ef4444", "#f59e0b", "#8b5cf6", "#0ea5e9", "#14b8a6", "#ec4899", "#84cc16", "#64748b"];

export function ExpensesView() {
  const { t, lang } = useT();
  const { data, isLoading } = useApi<any>("/api/expenses");
  const { canCreate, canEdit, canDelete } = usePermissions();
  const { invalidate, toastSuccess, toastError } = useApiMutation();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const money = (n: number) => formatMoney(n, "OMR", lang);

  const deleteExpense = async (e: any) => {
    if (!confirm(t("confirmDeleteRecord"))) return;
    try {
      const res = await fetch(`/api/expenses?id=${e.id}`, { method: "DELETE" });
      if (!res.ok) { toastError(t("requestFailed")); return; }
      invalidate(["/api/expenses", "/api/accounts", "/api/dashboard"]);
      toastSuccess();
    } catch {
      toastError(t("requestFailed"));
    }
  };

  const total = (data?.items || []).reduce((s: number, e: any) => s + e.amount, 0);
  const byCat = new Map<string, number>();
  for (const e of data?.items || []) byCat.set(e.category, (byCat.get(e.category) ?? 0) + e.amount);
  const chartData = [...byCat.entries()].map(([category, total]) => ({ category: t(category), total }));

  return (
    <div>
      <PageHeader title={t("expenses")} subtitle={`${data?.items?.length ?? 0} · ${money(total)}`}>
        {canCreate("expenses") && <Button size="sm" onClick={() => setCreating(true)}><Plus className="h-4 w-4 me-1" />{t("addNew")}</Button>}
      </PageHeader>

      <div className="grid gap-4 lg:grid-cols-3 mb-4">
        <Card className="lg:col-span-1">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">{t("expensesTotal")}</p>
            <p className="mt-1 text-2xl font-bold text-red-500 tnum">{money(total)}</p>
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardContent className="p-4">
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="category" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" width={50} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="total" radius={[3, 3, 0, 0]}>
                  {chartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-3 sm:p-4">
          {isLoading ? <LoadingRows /> : (data?.items || []).length === 0 ? <EmptyState title={t("noData")} icon={TrendingDown} /> : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("date")}</TableHead>
                    <TableHead>{t("expenseCategory")}</TableHead>
                    <TableHead className="hidden md:table-cell">{t("description")}</TableHead>
                    <TableHead className="hidden sm:table-cell">{t("paymentMethod")}</TableHead>
                    <TableHead className="text-end">{t("amount")}</TableHead>
                    {(canEdit("expenses") || canDelete("expenses")) && <TableHead className="text-end">{t("actions")}</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(data?.items || []).map((e: any) => (
                    <TableRow key={e.id}>
                      <TableCell className="text-xs text-muted-foreground">{formatDate(e.date, lang)}</TableCell>
                      <TableCell className="text-sm font-medium capitalize">{t(e.category) || e.category}</TableCell>
                      <TableCell className="hidden md:table-cell text-xs text-muted-foreground">{e.description || "—"}</TableCell>
                      <TableCell className="hidden sm:table-cell text-xs capitalize">{t(e.method) || e.method}</TableCell>
                      <TableCell className="text-end font-semibold tnum text-red-500">- {money(e.amount)}</TableCell>
                      {(canEdit("expenses") || canDelete("expenses")) && (
                        <TableCell className="text-end">
                          <RowActions canEdit={canEdit("expenses")} canDelete={canDelete("expenses")} onEdit={() => setEditing(e)} onDelete={() => deleteExpense(e)} />
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <ExpenseDialog open={creating} onOpenChange={setCreating} />
      {editing && <ExpenseDialog open expense={editing} onOpenChange={(o) => !o && setEditing(null)} />}
    </div>
  );
}

function ExpenseDialog({ open, onOpenChange, expense }: { open: boolean; onOpenChange: (o: boolean) => void; expense?: any }) {
  const { t } = useT();
  const { invalidate, toastSuccess, toastError } = useApiMutation();
  const isEdit = !!expense;
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({
    category: expense?.category || "rent",
    amount: expense ? String(expense.amount) : "",
    date: expense?.date ? new Date(expense.date).toISOString().slice(0, 10) : today,
    method: expense?.method || "cash",
    description: expense?.description || "",
  });
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!form.amount) return toastError(t("required"));
    setSaving(true);
    try {
      const res = await fetch("/api/expenses", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isEdit ? { id: expense.id, ...form, amount: Number(form.amount) } : { ...form, amount: Number(form.amount) }),
      });
      if (!res.ok) { toastError(t("requestFailed")); return; }
      invalidate(["/api/expenses", "/api/accounts", "/api/dashboard"]);
      toastSuccess();
      if (!isEdit) setForm({ category: "rent", amount: "", date: today, method: "cash", description: "" });
      onOpenChange(false);
    } catch {
      toastError(t("requestFailed"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isEdit ? <Pencil className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
            {isEdit ? `${t("edit")}: ${t(expense.category) || expense.category}` : `${t("addNew")} · ${t("expenses")}`}
          </DialogTitle>
          <DialogDescription className="sr-only">{t("newRecord")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label className="text-xs">{t("expenseCategory")}</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{t(c)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label className="text-xs">{t("amount")} *</Label><Input type="number" step="0.001" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
            <div className="space-y-1.5"><Label className="text-xs">{t("date")}</Label><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
            <div className="space-y-1.5"><Label className="text-xs">{t("paymentMethod")}</Label>
              <Select value={form.method} onValueChange={(v) => setForm({ ...form, method: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">{t("cash")}</SelectItem>
                  <SelectItem value="card">{t("card")}</SelectItem>
                  <SelectItem value="bank">{t("bankTransfer")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5"><Label className="text-xs">{t("description")}</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} /></div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>{t("cancel")}</Button>
            <Button onClick={submit} disabled={saving}>{saving && <Loader2 className="h-4 w-4 animate-spin me-1" />}{isEdit ? t("save") : t("create")}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
