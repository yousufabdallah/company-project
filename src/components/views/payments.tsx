"use client";

import { useT, formatMoney, formatDateTime } from "@/lib/format";
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
import { useApp } from "@/lib/store";
import { useState } from "react";
import { Wallet, Search, Printer, Pencil, Loader2 } from "lucide-react";

export function PaymentsView() {
  const { t, lang } = useT();
  const { data, isLoading } = useApi<any>("/api/payments");
  const setQuickCreate = useApp((s) => s.setQuickCreate);
  const { canCreate, canEdit, canDelete } = usePermissions();
  const { invalidate, toastSuccess, toastError } = useApiMutation();
  const [q, setQ] = useState("");
  const [methodFilter, setMethodFilter] = useState("all");
  const [editing, setEditing] = useState<any>(null);
  const money = (n: number) => formatMoney(n, "OMR", lang);

  const deletePayment = async (p: any) => {
    if (!confirm(t("confirmDeletePayment"))) return;
    try {
      const res = await fetch(`/api/payments?id=${p.id}`, { method: "DELETE" });
      if (!res.ok) { toastError(t("requestFailed")); return; }
      invalidate(["/api/payments", "/api/invoices", "/api/customers", "/api/accounts", "/api/dashboard"]);
      toastSuccess();
    } catch {
      toastError(t("requestFailed"));
    }
  };

  const items = (data?.items || []).filter((p: any) => {
    if (methodFilter !== "all" && p.method !== methodFilter) return false;
    if (q && !p.customer?.name.toLowerCase().includes(q.toLowerCase()) && !(p.reference || "").toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  const total = items.reduce((s: number, p: any) => s + p.amount, 0);

  return (
    <div>
      <PageHeader title={t("payments")} subtitle={`${items.length} · ${money(total)}`}>
        {canCreate("payments") && <Button size="sm" onClick={() => setQuickCreate("payment")}><Wallet className="h-4 w-4 me-1" />{t("receivePayment")}</Button>}
      </PageHeader>

      <Card>
        <CardContent className="p-3 sm:p-4">
          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("search")} className="ps-9" />
            </div>
            <Select value={methodFilter} onValueChange={setMethodFilter}>
              <SelectTrigger className="w-full sm:w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("all")}</SelectItem>
                <SelectItem value="cash">{t("cash")}</SelectItem>
                <SelectItem value="card">{t("card")}</SelectItem>
                <SelectItem value="bank">{t("bankTransfer")}</SelectItem>
                <SelectItem value="other">{t("other")}</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" variant="outline" onClick={() => window.print()} className="no-print"><Printer className="h-4 w-4 me-1" />{t("print")}</Button>
          </div>

          {isLoading ? <LoadingRows /> : items.length === 0 ? <EmptyState title={t("noResults")} icon={Wallet} /> : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("date")}</TableHead>
                    <TableHead>{t("customer")}</TableHead>
                    <TableHead className="hidden md:table-cell">{t("invoiceNumber")}</TableHead>
                    <TableHead className="hidden sm:table-cell">{t("paymentMethod")}</TableHead>
                    <TableHead className="hidden lg:table-cell">{t("reference")}</TableHead>
                    <TableHead className="text-end">{t("amount")}</TableHead>
                    {(canEdit("payments") || canDelete("payments")) && <TableHead className="text-end">{t("actions")}</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((p: any) => (
                    <TableRow key={p.id}>
                      <TableCell className="text-xs text-muted-foreground">{formatDateTime(p.date, lang)}</TableCell>
                      <TableCell className="text-sm font-medium">{p.customer?.name}</TableCell>
                      <TableCell className="hidden md:table-cell text-xs font-mono tnum">{p.invoice?.code || "—"}</TableCell>
                      <TableCell className="hidden sm:table-cell text-xs capitalize">{t(p.method) || p.method}</TableCell>
                      <TableCell className="hidden lg:table-cell text-xs font-mono">{p.reference || "—"}</TableCell>
                      <TableCell className="text-end font-semibold text-emerald-600 tnum">{money(p.amount)}</TableCell>
                      {(canEdit("payments") || canDelete("payments")) && (
                        <TableCell className="text-end">
                          <RowActions canEdit={canEdit("payments")} canDelete={canDelete("payments")} onEdit={() => setEditing(p)} onDelete={() => deletePayment(p)} />
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

      {editing && <EditPaymentDialog payment={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

function EditPaymentDialog({ payment, onClose }: { payment: any; onClose: () => void }) {
  const { t } = useT();
  const { invalidate, toastSuccess, toastError } = useApiMutation();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    amount: String(payment.amount ?? ""),
    method: payment.method || "cash",
    date: payment.date ? new Date(payment.date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
    reference: payment.reference || "",
    note: payment.note || "",
  });

  const save = async () => {
    if (!form.amount) return toastError(t("required"));
    setSaving(true);
    try {
      const res = await fetch("/api/payments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: payment.id, ...form, amount: Number(form.amount) }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toastError(err.error === "invoice_has_payments" ? t("invoiceHasPayments") : t("requestFailed"));
        return;
      }
      invalidate(["/api/payments", "/api/invoices", "/api/customers", "/api/accounts", "/api/dashboard"]);
      toastSuccess();
      onClose();
    } catch {
      toastError(t("requestFailed"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Pencil className="h-5 w-5" />{t("edit")}: {t("payments")}</DialogTitle>
          <DialogDescription className="sr-only">{payment.customer?.name}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label className="text-xs">{t("amount")} *</Label><Input type="number" step="0.001" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
            <div className="space-y-1.5"><Label className="text-xs">{t("paymentMethod")}</Label>
              <Select value={form.method} onValueChange={(v) => setForm({ ...form, method: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">{t("cash")}</SelectItem>
                  <SelectItem value="card">{t("card")}</SelectItem>
                  <SelectItem value="bank">{t("bankTransfer")}</SelectItem>
                  <SelectItem value="other">{t("other")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label className="text-xs">{t("date")}</Label><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
            <div className="space-y-1.5"><Label className="text-xs">{t("reference")}</Label><Input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} /></div>
          </div>
          <div className="space-y-1.5"><Label className="text-xs">{t("notes")}</Label><Textarea value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} rows={2} /></div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>{t("cancel")}</Button>
            <Button onClick={save} disabled={saving}>{saving && <Loader2 className="h-4 w-4 animate-spin me-1" />}{t("save")}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
