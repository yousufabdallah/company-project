"use client";

import { useT, formatMoney, formatDate } from "@/lib/format";
import { useApi, StatusBadge, EmptyState, LoadingRows, PageHeader, useApiMutation } from "@/components/shared";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useApp } from "@/lib/store";
import { useState } from "react";
import { Receipt, Plus, Search, Printer, Wallet } from "lucide-react";

export function InvoicesView() {
  const { t, lang } = useT();
  const { data, isLoading } = useApi<any>("/api/invoices");
  const setQuickCreate = useApp((s) => s.setQuickCreate);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selected, setSelected] = useState<string | null>(null);
  const money = (n: number) => formatMoney(n, "OMR", lang);

  const items = (data?.items || []).filter((i: any) => {
    if (statusFilter !== "all" && i.status !== statusFilter) return false;
    if (q && !i.code.toLowerCase().includes(q.toLowerCase()) && !i.customer?.name.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });
  const { data: detail } = useApi<any>(selected ? `/api/invoices/${selected}` : null);

  return (
    <div>
      <PageHeader title={t("invoices")} subtitle={`${items.length} ${t("invoices").toLowerCase()}`}>
        <Button size="sm" variant="outline" onClick={() => setQuickCreate("payment")}><Wallet className="h-4 w-4 me-1" />{t("receivePayment")}</Button>
      </PageHeader>

      <Card>
        <CardContent className="p-3 sm:p-4">
          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("search")} className="ps-9" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("all")}</SelectItem>
                <SelectItem value="unpaid">{t("status_unpaid")}</SelectItem>
                <SelectItem value="partial">{t("status_partial")}</SelectItem>
                <SelectItem value="paid">{t("status_paid")}</SelectItem>
                <SelectItem value="refunded">{t("status_refunded")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? <LoadingRows /> : items.length === 0 ? <EmptyState title={t("noResults")} icon={Receipt} /> : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("invoiceNumber")}</TableHead>
                    <TableHead>{t("customer")}</TableHead>
                    <TableHead className="hidden md:table-cell">{t("vehicle")}</TableHead>
                    <TableHead className="hidden sm:table-cell">{t("date")}</TableHead>
                    <TableHead>{t("status")}</TableHead>
                    <TableHead className="text-end">{t("grandTotal")}</TableHead>
                    <TableHead className="text-end hidden lg:table-cell">{t("paid")}</TableHead>
                    <TableHead className="text-end">{t("remaining")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((i: any) => (
                    <TableRow key={i.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelected(i.id)}>
                      <TableCell className="font-mono text-xs font-bold tnum">{i.code}</TableCell>
                      <TableCell className="text-sm font-medium">{i.customer?.name}</TableCell>
                      <TableCell className="hidden md:table-cell text-xs text-muted-foreground">{i.vehicle?.plateNumber}</TableCell>
                      <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">{formatDate(i.date, lang)}</TableCell>
                      <TableCell><StatusBadge status={i.status} /></TableCell>
                      <TableCell className="text-end font-semibold tnum">{money(i.grandTotal)}</TableCell>
                      <TableCell className="text-end tnum text-emerald-600 hidden lg:table-cell">{money(i.paidAmount)}</TableCell>
                      <TableCell className={`text-end tnum font-medium ${i.grandTotal - i.paidAmount > 0 ? "text-red-600" : "text-muted-foreground"}`}>{money(i.grandTotal - i.paidAmount)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto scroll-thin">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Receipt className="h-5 w-5" />{detail?.code}<StatusBadge status={detail?.status} /></DialogTitle>
            <DialogDescription className="sr-only">{t("invoices")}</DialogDescription>
          </DialogHeader>
          {detail && <InvoiceDetail inv={detail} money={money} onClose={() => setSelected(null)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function InvoiceDetail({ inv, money, onClose }: { inv: any; money: (n: number) => string; onClose: () => void }) {
  const { t, lang } = useT();
  const { invalidate, toastSuccess, toastError } = useApiMutation();
  const tn = inv.tenant || {};
  const [payOpen, setPayOpen] = useState(false);
  const [payAmt, setPayAmt] = useState("");
  const [payMethod, setPayMethod] = useState("cash");

  const remaining = inv.grandTotal - inv.paidAmount;

  const pay = async () => {
    if (!payAmt) return toastError(t("required"));
    try {
      await fetch("/api/payments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ invoiceId: inv.id, customerId: inv.customerId, amount: Number(payAmt), method: payMethod }) });
      invalidate(["/api/payments", "/api/invoices", "/api/customers", "/api/dashboard"]);
      toastSuccess();
      setPayOpen(false); setPayAmt("");
      onClose();
    } catch {
      toastError("Error");
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border p-4 print-area">
        {/* Print header */}
        <div className="flex items-start justify-between gap-4 border-b pb-3">
          <div>
            <h2 className="text-lg font-bold">{tn.name || t("appName")}</h2>
            <p className="text-xs text-muted-foreground">{tn.address}</p>
            <p className="text-xs text-muted-foreground">{t("phone")}: {tn.phone} · {t("email")}: {tn.email}</p>
            <p className="text-xs text-muted-foreground">{t("taxNumber")}: {tn.taxNumber}</p>
          </div>
          <div className="text-end">
            <h3 className="text-base font-bold uppercase">{t("invoices")}</h3>
            <p className="font-mono text-sm font-bold tnum">{inv.code}</p>
            <p className="text-xs text-muted-foreground">{formatDate(inv.date, lang)}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 py-3 text-xs">
          <div>
            <p className="font-semibold text-muted-foreground">{t("customer")}</p>
            <p className="text-sm font-medium">{inv.customer?.name}</p>
            <p className="text-muted-foreground">{inv.customer?.mobile}</p>
          </div>
          <div>
            <p className="font-semibold text-muted-foreground">{t("vehicle")}</p>
            <p className="text-sm font-medium">{inv.vehicle?.plateNumber} · {inv.vehicle?.make} {inv.vehicle?.model}</p>
          </div>
        </div>

        <div className="overflow-x-auto rounded border">
          <Table>
            <TableHeader><TableRow><TableHead className="text-xs">{t("description")}</TableHead><TableHead className="text-xs text-end">{t("quantity")}</TableHead><TableHead className="text-xs text-end">{t("unitPrice")}</TableHead><TableHead className="text-xs text-end">{t("total")}</TableHead></TableRow></TableHeader>
            <TableBody>
              {inv.items?.map((i: any) => (
                <TableRow key={i.id}>
                  <TableCell className="text-xs font-medium">{i.name}</TableCell>
                  <TableCell className="text-xs text-end tnum">{i.quantity}</TableCell>
                  <TableCell className="text-xs text-end tnum">{money(i.unitPrice)}</TableCell>
                  <TableCell className="text-xs text-end tnum font-medium">{money(i.total)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="ms-auto mt-3 w-full max-w-xs space-y-1 text-sm">
          <div className="flex justify-between text-muted-foreground"><span>{t("laborTotal")}</span><span className="tnum">{money(inv.laborTotal)}</span></div>
          <div className="flex justify-between text-muted-foreground"><span>{t("partsTotal")}</span><span className="tnum">{money(inv.partsTotal)}</span></div>
          {inv.discount > 0 && <div className="flex justify-between text-muted-foreground"><span>{t("discount")}</span><span className="tnum">- {money(inv.discount)}</span></div>}
          <div className="flex justify-between text-muted-foreground"><span>{t("tax")} ({tn.taxPercent}%)</span><span className="tnum">{money(inv.tax)}</span></div>
          <div className="flex justify-between border-t pt-1 text-base font-bold"><span>{t("grandTotal")}</span><span className="tnum">{money(inv.grandTotal)}</span></div>
          <div className="flex justify-between text-emerald-600"><span>{t("paid")}</span><span className="tnum">{money(inv.paidAmount)}</span></div>
          {remaining > 0 && <div className="flex justify-between text-red-600 font-semibold"><span>{t("remaining")}</span><span className="tnum">{money(remaining)}</span></div>}
        </div>

        {tn.terms && (
          <div className="mt-4 border-t pt-3">
            <p className="text-[10px] font-semibold uppercase text-muted-foreground">{t("termsConditions")}</p>
            <p className="mt-1 text-[10px] text-muted-foreground">{tn.terms}</p>
          </div>
        )}
        {tn.invoiceFooter && <p className="mt-2 text-center text-[10px] text-muted-foreground">{tn.invoiceFooter}</p>}
      </div>

      {/* Payment actions */}
      {remaining > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg bg-muted/50 p-3 no-print">
          {!payOpen ? (
            <>
              <Button size="sm" onClick={() => setPayOpen(true)}><Wallet className="h-3.5 w-3.5 me-1" />{t("receivePayment")}</Button>
              <Button size="sm" variant="outline" className="ms-auto" onClick={() => window.print()}><Printer className="h-3.5 w-3.5 me-1" />{t("print")}</Button>
            </>
          ) : (
            <div className="flex w-full flex-wrap items-center gap-2">
              <Input type="number" step="0.001" value={payAmt} onChange={(e) => setPayAmt(e.target.value)} placeholder={money(remaining)} className="w-32" />
              <Select value={payMethod} onValueChange={setPayMethod}>
                <SelectTrigger className="w-28 h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">{t("cash")}</SelectItem>
                  <SelectItem value="card">{t("card")}</SelectItem>
                  <SelectItem value="bank">{t("bankTransfer")}</SelectItem>
                </SelectContent>
              </Select>
              <Button size="sm" onClick={pay}>{t("save")}</Button>
              <Button size="sm" variant="outline" onClick={() => setPayOpen(false)}>{t("cancel")}</Button>
            </div>
          )}
        </div>
      )}
      {remaining <= 0 && (
        <div className="flex justify-end gap-2 no-print">
          <Button size="sm" variant="outline" onClick={() => window.print()}><Printer className="h-3.5 w-3.5 me-1" />{t("print")}</Button>
        </div>
      )}

      {/* Payments history */}
      {inv.payments?.length > 0 && (
        <div>
          <h4 className="mb-2 text-sm font-semibold">{t("payments")}</h4>
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader><TableRow><TableHead className="text-xs">{t("date")}</TableHead><TableHead className="text-xs">{t("paymentMethod")}</TableHead><TableHead className="text-xs">{t("reference")}</TableHead><TableHead className="text-xs text-end">{t("amount")}</TableHead></TableRow></TableHeader>
              <TableBody>
                {inv.payments.map((p: any) => (
                  <TableRow key={p.id}>
                    <TableCell className="text-xs">{formatDate(p.date, lang)}</TableCell>
                    <TableCell className="text-xs capitalize">{t(p.method) || p.method}</TableCell>
                    <TableCell className="text-xs font-mono">{p.reference || "—"}</TableCell>
                    <TableCell className="text-xs text-end tnum font-medium text-emerald-600">{money(p.amount)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}
