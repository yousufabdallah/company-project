"use client";

import { useT, formatMoney, formatDate } from "@/lib/format";
import { useApi, StatusBadge, EmptyState, LoadingRows, PageHeader, useApiMutation } from "@/components/shared";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useApp } from "@/lib/store";
import { useMemo, useState } from "react";
import { FileText, Plus, Search, Check, X, Printer, Trash2, ArrowRight } from "lucide-react";

export function EstimatesView() {
  const { t, lang } = useT();
  const { data, isLoading } = useApi<any>("/api/estimates");
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [creating, setCreating] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const money = (n: number) => formatMoney(n, "OMR", lang);

  const items = (data?.items || []).filter((e: any) => {
    if (statusFilter !== "all" && e.status !== statusFilter) return false;
    if (q && !e.code.toLowerCase().includes(q.toLowerCase()) && !e.customer?.name.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });
  const { data: detail } = useApi<any>(selected ? `/api/estimates/${selected}` : null);

  return (
    <div>
      <PageHeader title={t("estimates")} subtitle={`${items.length} ${t("estimates").toLowerCase()}`}>
        <Button size="sm" onClick={() => setCreating(true)}><Plus className="h-4 w-4 me-1" />{t("addNew")}</Button>
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
                <SelectItem value="pending">{t("status_pending")}</SelectItem>
                <SelectItem value="approved">{t("status_approved")}</SelectItem>
                <SelectItem value="rejected">{t("status_rejected")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? <LoadingRows /> : items.length === 0 ? <EmptyState title={t("noResults")} icon={FileText} /> : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("estimateNumber")}</TableHead>
                    <TableHead>{t("customer")} / {t("vehicle")}</TableHead>
                    <TableHead className="hidden md:table-cell">{t("date")}</TableHead>
                    <TableHead>{t("status")}</TableHead>
                    <TableHead className="text-end">{t("grandTotal")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((e: any) => (
                    <TableRow key={e.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelected(e.id)}>
                      <TableCell className="font-mono text-xs font-bold tnum">{e.code}</TableCell>
                      <TableCell>
                        <p className="text-sm font-medium">{e.customer?.name}</p>
                        <p className="text-xs text-muted-foreground">{e.vehicle?.plateNumber}</p>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-xs text-muted-foreground">{formatDate(e.date, lang)}</TableCell>
                      <TableCell><StatusBadge status={e.status} /></TableCell>
                      <TableCell className="text-end font-semibold tnum">{money(e.grandTotal)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <EstimateCreateDialog open={creating} onOpenChange={setCreating} />

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto scroll-thin">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><FileText className="h-5 w-5" />{detail?.code}<StatusBadge status={detail?.status} /></DialogTitle>
            <DialogDescription className="sr-only">{t("estimates")}</DialogDescription>
          </DialogHeader>
          {detail && <EstimateDetail est={detail} money={money} onClose={() => setSelected(null)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EstimateDetail({ est, money, onClose }: { est: any; money: (n: number) => string; onClose: () => void }) {
  const { t, lang } = useT();
  const { invalidate, toastSuccess, toastError } = useApiMutation();
  // Fetch tenant settings to show the tax percentage on the tax row.
  const { data: settings } = useApi<any>("/api/settings");
  const taxPercent = settings?.taxEnabled ? (settings?.taxPercent ?? 0) : 0;

  const setStatus = async (status: string) => {
    try {
      await fetch("/api/estimates", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: est.id, status }) });
      invalidate(["/api/estimates", "/api/dashboard"]);
      toastSuccess();
      onClose();
    } catch {
      toastError("Error");
    }
  };

  const convertToJobCard = async () => {
    try {
      const services = est.items.filter((i: any) => i.type === "service").map((i: any) => ({ name: i.name, hours: 1, laborPrice: i.unitPrice, discount: i.discount, total: i.total }));
      const parts = est.items.filter((i: any) => i.type === "part").map((i: any) => ({ partId: i.partId || i.id, quantity: i.quantity, unitPrice: i.unitPrice, discount: i.discount, total: i.total }));
      await fetch("/api/job-cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId: est.customerId, vehicleId: est.vehicleId, complaint: est.notes || "From estimate " + est.code, services, parts, status: "waiting_approval" }),
      });
      await setStatus("approved");
      invalidate(["/api/job-cards", "/api/estimates", "/api/dashboard"]);
      toastSuccess(t("jobCards") + " ✓");
      onClose();
    } catch {
      toastError("Error");
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 text-xs">
        <Info label={t("customer")} value={est.customer?.name} />
        <Info label={t("vehicle")} value={est.vehicle?.plateNumber} />
        <Info label={t("date")} value={formatDate(est.date, lang)} />
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader><TableRow><TableHead className="text-xs">{t("description")}</TableHead><TableHead className="text-xs">{t("category")}</TableHead><TableHead className="text-xs text-end">{t("quantity")}</TableHead><TableHead className="text-xs text-end">{t("unitPrice")}</TableHead><TableHead className="text-xs text-end">{t("total")}</TableHead></TableRow></TableHeader>
          <TableBody>
            {est.items?.map((i: any) => (
              <TableRow key={i.id}>
                <TableCell className="text-xs font-medium">{i.name}</TableCell>
                <TableCell className="text-xs"><StatusBadge status={i.type === "service" ? "info" : "normal"} label={i.type === "service" ? t("labor") : t("parts")} /></TableCell>
                <TableCell className="text-xs text-end tnum">{i.quantity}</TableCell>
                <TableCell className="text-xs text-end tnum">{money(i.unitPrice)}</TableCell>
                <TableCell className="text-xs text-end tnum font-medium">{money(i.total)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="ms-auto w-full max-w-xs space-y-1 text-sm">
        <Row label={t("laborTotal")} value={money(est.laborTotal)} />
        <Row label={t("partsTotal")} value={money(est.partsTotal)} />
        {est.discount > 0 && <Row label={t("discount")} value={"- " + money(est.discount)} />}
        <Row label={`${t("tax")} (${taxPercent}%)`} value={money(est.tax)} />
        <div className="flex justify-between border-t pt-1 text-base font-bold"><span>{t("grandTotal")}</span><span className="tnum">{money(est.grandTotal)}</span></div>
      </div>

      {est.notes && <div className="rounded-lg bg-muted/50 p-3 text-sm"><p className="text-xs text-muted-foreground mb-1">{t("notes")}</p>{est.notes}</div>}

      {est.status === "pending" && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg bg-muted/50 p-3">
          <Button size="sm" variant="default" onClick={() => setStatus("approved")}><Check className="h-3.5 w-3.5 me-1" />{t("approve")}</Button>
          <Button size="sm" variant="destructive" onClick={() => setStatus("rejected")}><X className="h-3.5 w-3.5 me-1" />{t("reject")}</Button>
          <Button size="sm" variant="outline" onClick={convertToJobCard}><ArrowRight className="h-3.5 w-3.5 me-1" />{t("jobCards")}</Button>
          <Button size="sm" variant="outline" className="ms-auto no-print" onClick={() => window.print()}><Printer className="h-3.5 w-3.5 me-1" />{t("print")}</Button>
        </div>
      )}
      {est.status === "approved" && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg bg-muted/50 p-3">
          <Button size="sm" variant="default" onClick={convertToJobCard}><ArrowRight className="h-3.5 w-3.5 me-1" />{t("jobCards")}</Button>
          <Button size="sm" variant="outline" className="ms-auto no-print" onClick={() => window.print()}><Printer className="h-3.5 w-3.5 me-1" />{t("print")}</Button>
        </div>
      )}
    </div>
  );
}

function EstimateCreateDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { t, lang } = useT();
  const { data: cust } = useApi<any>("/api/customers");
  const { data: svc } = useApi<any>("/api/services?active=1");
  const { data: parts } = useApi<any>("/api/parts");
  const { data: settings } = useApi<any>("/api/settings");
  const taxPercent = settings?.taxEnabled ? (settings?.taxPercent ?? 0) : 0;
  const { invalidate, toastSuccess, toastError } = useApiMutation();

  const [customerId, setCustomerId] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  const vehicles = (cust?.items || []).find((c: any) => c.id === customerId)?.vehicles || [];

  const addService = (s: any) => setItems([...items, { type: "service", name: s.name, quantity: 1, unitPrice: s.price, discount: 0, total: s.price }]);
  const addPart = (p: any) => setItems([...items, { type: "part", name: p.name, quantity: 1, unitPrice: p.sellingPrice, discount: 0, total: p.sellingPrice }]);
  const removeItem = (i: number) => setItems(items.filter((_, idx) => idx !== i));

  const { laborTotal, partsTotal, subtotal, tax, grand } = useMemo(() => {
    const laborTotal = items.filter((i) => i.type === "service").reduce((s, i) => s + i.total, 0);
    const partsTotal = items.filter((i) => i.type === "part").reduce((s, i) => s + i.total, 0);
    const subtotal = laborTotal + partsTotal;
    const tax = Math.round((subtotal * taxPercent) / 100 * 1000) / 1000;
    const grand = Math.round((subtotal + tax) * 1000) / 1000;
    return { laborTotal, partsTotal, subtotal, tax, grand };
  }, [items, taxPercent]);

  const submit = async () => {
    if (!customerId || items.length === 0) return toastError(t("required"));
    setSaving(true);
    try {
      await fetch("/api/estimates", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ customerId, vehicleId, items, notes }) });
      invalidate(["/api/estimates", "/api/dashboard"]);
      toastSuccess();
      setItems([]); setNotes(""); setCustomerId(""); setVehicleId("");
      onOpenChange(false);
    } catch {
      toastError("Error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto scroll-thin">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><FileText className="h-5 w-5" />{t("addNew")} · {t("estimates")}</DialogTitle>
          <DialogDescription>{t("services")} + {t("parts")} → {t("grandTotal")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">{t("customer")} *</Label>
              <Select value={customerId} onValueChange={(v) => { setCustomerId(v); setVehicleId(""); }}>
                <SelectTrigger><SelectValue placeholder={t("customer")} /></SelectTrigger>
                <SelectContent>
                  {(cust?.items || []).map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name} · {c.mobile}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t("vehicle")}</Label>
              <Select value={vehicleId} onValueChange={setVehicleId} disabled={!customerId}>
                <SelectTrigger><SelectValue placeholder={t("vehicle")} /></SelectTrigger>
                <SelectContent>
                  {vehicles.map((v: any) => <SelectItem key={v.id} value={v.id}>{v.plateNumber} · {v.make} {v.model}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Quick add */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label className="text-xs mb-1.5 block">{t("addNew")} · {t("services")}</Label>
              <Select onValueChange={(v) => { const s = (svc?.items || []).find((x: any) => x.id === v); if (s) addService(s); }}>
                <SelectTrigger><SelectValue placeholder={t("services")} /></SelectTrigger>
                <SelectContent>{(svc?.items || []).map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name} · {formatMoney(s.price, "OMR", lang)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs mb-1.5 block">{t("addNew")} · {t("parts")}</Label>
              <Select onValueChange={(v) => { const p = (parts?.items || []).find((x: any) => x.id === v); if (p) addPart(p); }}>
                <SelectTrigger><SelectValue placeholder={t("parts")} /></SelectTrigger>
                <SelectContent>{(parts?.items || []).map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name} · {formatMoney(p.sellingPrice, "OMR", lang)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          {/* Items */}
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader><TableRow><TableHead className="text-xs">{t("description")}</TableHead><TableHead className="text-xs text-end">{t("quantity")}</TableHead><TableHead className="text-xs text-end">{t("unitPrice")}</TableHead><TableHead className="text-xs text-end">{t("total")}</TableHead><TableHead /></TableRow></TableHeader>
              <TableBody>
                {items.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center text-xs text-muted-foreground py-6">{t("noData")}</TableCell></TableRow>
                ) : items.map((it, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-xs"><span className="font-medium">{it.name}</span><span className="block text-muted-foreground">{it.type === "service" ? t("labor") : t("parts")}</span></TableCell>
                    <TableCell className="text-xs text-end tnum">{it.quantity}</TableCell>
                    <TableCell className="text-xs text-end tnum">{formatMoney(it.unitPrice, "OMR", lang)}</TableCell>
                    <TableCell className="text-xs text-end tnum font-medium">{formatMoney(it.total, "OMR", lang)}</TableCell>
                    <TableCell><Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => removeItem(i)}><Trash2 className="h-3.5 w-3.5" /></Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t("notes")} rows={2} />
            <div className="space-y-1 text-sm">
              <Row label={t("laborTotal")} value={formatMoney(laborTotal, "OMR", lang)} />
              <Row label={t("partsTotal")} value={formatMoney(partsTotal, "OMR", lang)} />
              <Row label={`${t("tax")} (${taxPercent}%)`} value={formatMoney(tax, "OMR", lang)} />
              <div className="flex justify-between border-t pt-1 text-base font-bold"><span>{t("grandTotal")}</span><span className="tnum">{formatMoney(grand, "OMR", lang)}</span></div>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>{t("cancel")}</Button>
            <Button onClick={submit} disabled={saving}>{t("create")}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg border p-2"><p className="text-[10px] text-muted-foreground">{label}</p><p className="mt-0.5 text-sm font-medium truncate">{value || "—"}</p></div>;
}
function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between text-muted-foreground"><span>{label}</span><span className="tnum">{value}</span></div>;
}
