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
          <DialogHeader className="no-print">
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
      {/* Print CSS — guarantees A4 page size + the invoice fills the page when printed.
          Radix Dialog uses fixed+translate centering + max-height + overflow-auto which break printing.
          These rules neutralize all of that so the invoice flows naturally on A4. */}
      <style dangerouslySetInnerHTML={{ __html: `
        @page { size: A4; margin: 10mm; }

        @media print {
          html, body {
            background: #fff !important;
            margin: 0 !important;
            padding: 0 !important;
            font-size: 11px !important;
            color: #000 !important;
            width: 100% !important;
            height: auto !important;
            max-height: none !important;
            overflow: visible !important;
            /* Cancel Radix's scroll-lock (position:relative + overflow:hidden + height) */
            position: static !important;
            inset: auto !important;
            top: auto !important;
            left: auto !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          /* 1. Hide everything under <body> by default */
          body > * { display: none !important; }

          /* 2. Show only the open dialog (Radix mounts [role=dialog][data-state=open] directly under body) */
          [role="dialog"][data-state="open"],
          body > [role="dialog"][data-state="open"] {
            display: block !important;
          }

          /* 3. Neutralize all of Radix's positioning — make it static, full-width, no transform */
          [role="dialog"],
          [data-slot="dialog-content"],
          [data-slot="dialog-overlay"] {
            position: static !important;
            top: auto !important;
            left: auto !important;
            right: auto !important;
            bottom: auto !important;
            inset: auto !important;
            transform: none !important;
            translate: none !important;
            rotate: none !important;
            scale: none !important;
            margin: 0 !important;
            padding: 0 !important;
            max-width: 100% !important;
            max-height: none !important;
            width: 100% !important;
            height: auto !important;
            overflow: visible !important;
            background: #fff !important;
            border: none !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            z-index: auto !important;
            display: block !important;
          }

          /* 4. Hide the dark overlay (don't print the modal backdrop) */
          [data-slot="dialog-overlay"] {
            display: none !important;
          }

          /* 5. Hide the close button + dialog header (no-print) */
          [data-slot="dialog-close"],
          .no-print {
            display: none !important;
          }

          /* 6. Show all children of the dialog + the print-area normally */
          [role="dialog"] > * { display: block !important; }

          .print-area {
            position: static !important;
            display: block !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
            background: #fff !important;
            width: 100% !important;
            max-width: 100% !important;
          }

          /* 7. Don't break tables/images across pages */
          table, tr, td, th { page-break-inside: avoid; break-inside: avoid; }
          thead { display: table-header-group; }
          img { max-width: 100% !important; }

          /* 8. Crisp black headings on paper */
          h1, h2, h3, h4 { color: #000 !important; }
        }
      ` }} />
      <div className="rounded-lg border bg-white p-6 sm:p-8 print-area text-slate-900 shadow-sm">
        {/* ─── Premium header: logo + workshop info (left) ─ invoice title (right) ─── */}
        <div className="flex items-start justify-between gap-4 border-b-2 border-slate-800 pb-4">
          <div className="flex items-start gap-3">
            {tn.logo ? (
              <img src={tn.logo} alt={tn.name} className="h-14 w-14 shrink-0 rounded-lg object-contain" />
            ) : (
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-white">
                <Receipt className="h-7 w-7" />
              </div>
            )}
            <div>
              <h2 className="text-lg font-bold leading-tight text-slate-900">{tn.name || t("appName")}</h2>
              {tn.address && <p className="mt-0.5 text-[11px] text-slate-600">{tn.address}</p>}
              <p className="text-[11px] text-slate-600">
                {tn.phone && <span>{t("phone")}: {tn.phone}</span>}
                {tn.email && <span className="mx-1">·</span>}
                {tn.email && <span>{tn.email}</span>}
              </p>
              {tn.taxNumber && <p className="text-[11px] text-slate-600">{t("taxNumber")}: {tn.taxNumber}</p>}
              {tn.crNumber && <p className="text-[11px] text-slate-600">{t("crNumber")}: {tn.crNumber}</p>}
            </div>
          </div>
          <div className="text-end">
            <h3 className="text-xl font-bold uppercase tracking-wide text-slate-900">{t("invoices")}</h3>
            <p className="mt-1 inline-block rounded bg-slate-900 px-2 py-0.5 font-mono text-sm font-bold text-white tnum">{inv.code}</p>
            <p className="mt-1 text-xs text-slate-600">{formatDate(inv.date, lang)}</p>
            <div className="mt-2">
              <StatusBadge status={inv.status} />
            </div>
          </div>
        </div>

        {/* ─── Bill To section ─── */}
        <div className="grid grid-cols-1 gap-4 py-4 sm:grid-cols-2">
          <div className="rounded-lg bg-slate-50 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{t("customer")}</p>
            <p className="mt-1 text-sm font-bold text-slate-900">{inv.customer?.name}</p>
            <p className="text-xs text-slate-600">{inv.customer?.mobile}</p>
            {inv.customer?.email && <p className="text-xs text-slate-600">{inv.customer.email}</p>}
          </div>
          <div className="rounded-lg bg-slate-50 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{t("vehicle")}</p>
            <p className="mt-1 text-sm font-bold text-slate-900">{inv.vehicle?.plateNumber} · {inv.vehicle?.make} {inv.vehicle?.model}</p>
            {inv.vehicle?.year && <p className="text-xs text-slate-600">{t("year")}: {inv.vehicle.year}</p>}
            {inv.jobCard?.code && <p className="text-xs text-slate-600">{t("jobCardNumber")}: <span className="font-mono">{inv.jobCard.code}</span></p>}
          </div>
        </div>

        {/* ─── Items table ─── */}
        <div className="overflow-hidden rounded-lg border border-slate-200">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-900 text-white">
                <th className="px-3 py-2 text-start font-semibold">#</th>
                <th className="px-3 py-2 text-start font-semibold">{t("description")}</th>
                <th className="px-3 py-2 text-center font-semibold">{t("quantity")}</th>
                <th className="px-3 py-2 text-end font-semibold">{t("unitPrice")}</th>
                <th className="px-3 py-2 text-end font-semibold">{t("total")}</th>
              </tr>
            </thead>
            <tbody>
              {inv.items?.map((i: any, idx: number) => (
                <tr key={i.id} className="border-t border-slate-100">
                  <td className="px-3 py-2 text-slate-500 tnum">{idx + 1}</td>
                  <td className="px-3 py-2 font-medium text-slate-900">{i.name}</td>
                  <td className="px-3 py-2 text-center tnum text-slate-700">{i.quantity}</td>
                  <td className="px-3 py-2 text-end tnum text-slate-700">{money(i.unitPrice)}</td>
                  <td className="px-3 py-2 text-end tnum font-semibold text-slate-900">{money(i.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ─── Totals + stamp ─── */}
        <div className="mt-4 flex items-start justify-between gap-4">
          <div className="flex-1">
            {/* Stamp */}
            {tn.stamp ? (
              <div className="flex flex-col items-center opacity-90">
                <img src={tn.stamp} alt="Stamp" className="h-28 w-28 object-contain rotate-[-8deg]" />
                <p className="mt-1 text-[9px] font-semibold uppercase tracking-wider text-slate-400">{t("workshopStamp")}</p>
              </div>
            ) : (
              /* Signature area when no stamp */
              <div className="mt-8 max-w-[200px]">
                <div className="border-t border-slate-400 pt-1">
                  <p className="text-[10px] text-slate-500">{t("workshopName")}</p>
                  <p className="text-[10px] text-slate-400">{t("signature") || "Authorized Signature"}</p>
                </div>
              </div>
            )}
          </div>
          <div className="w-full max-w-xs space-y-1.5 text-sm">
            <div className="flex justify-between text-slate-600"><span>{t("laborTotal")}</span><span className="tnum">{money(inv.laborTotal)}</span></div>
            <div className="flex justify-between text-slate-600"><span>{t("partsTotal")}</span><span className="tnum">{money(inv.partsTotal)}</span></div>
            {inv.discount > 0 && <div className="flex justify-between text-slate-600"><span>{t("discount")}</span><span className="tnum">- {money(inv.discount)}</span></div>}
            <div className="flex justify-between text-slate-600"><span>{t("tax")} ({tn.taxPercent}%)</span><span className="tnum">{money(inv.tax)}</span></div>
            <div className="flex justify-between rounded bg-slate-900 px-2 py-1.5 text-base font-bold text-white">
              <span>{t("grandTotal")}</span><span className="tnum">{money(inv.grandTotal)}</span>
            </div>
            <div className="flex justify-between text-emerald-600"><span>{t("paid")}</span><span className="tnum">{money(inv.paidAmount)}</span></div>
            {remaining > 0 && <div className="flex justify-between rounded bg-red-50 px-2 py-1 font-semibold text-red-600"><span>{t("remaining")}</span><span className="tnum">{money(remaining)}</span></div>}
          </div>
        </div>

        {/* ─── Terms + footer ─── */}
        {tn.terms && (
          <div className="mt-6 border-t border-slate-200 pt-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{t("termsConditions")}</p>
            <p className="mt-1 whitespace-pre-line text-[10px] text-slate-600">{tn.terms}</p>
          </div>
        )}
        {tn.invoiceFooter && <p className="mt-3 text-center text-[10px] italic text-slate-500">{tn.invoiceFooter}</p>}
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
