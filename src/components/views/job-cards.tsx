"use client";

import { useT, formatMoney, formatDate, formatNumber } from "@/lib/format";
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
import { Wrench, Plus, Search, Printer, Trash2, ArrowRight, Clock, Check } from "lucide-react";

const STATUSES = ["draft", "waiting_approval", "approved", "in_progress", "waiting_parts", "waiting_customer", "quality_check", "completed", "ready_for_delivery", "delivered", "cancelled"];

export function JobCardsView() {
  const { t, lang } = useT();
  const { data, isLoading } = useApi<any>("/api/job-cards");
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [creating, setCreating] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  const money = (n: number) => formatMoney(n, "OMR", lang);
  const items = (data?.items || []).filter((j: any) => {
    if (statusFilter !== "all" && j.status !== statusFilter) return false;
    if (q && !j.code.toLowerCase().includes(q.toLowerCase()) && !j.customer?.name.toLowerCase().includes(q.toLowerCase()) && !j.vehicle?.plateNumber.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  const { data: detail } = useApi<any>(selected ? `/api/job-cards/${selected}` : null);

  return (
    <div>
      <PageHeader title={t("jobCards")} subtitle={`${items.length} ${t("jobCards").toLowerCase()}`}>
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
              <SelectTrigger className="w-full sm:w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("all")}</SelectItem>
                {STATUSES.map((s) => <SelectItem key={s} value={s}>{t("status_" + s)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <LoadingRows />
          ) : items.length === 0 ? (
            <EmptyState title={t("noResults")} icon={Wrench} />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("jobCardNumber")}</TableHead>
                    <TableHead>{t("customer")} / {t("vehicle")}</TableHead>
                    <TableHead className="hidden md:table-cell">{t("complaint")}</TableHead>
                    <TableHead className="hidden lg:table-cell">{t("technician")}</TableHead>
                    <TableHead>{t("status")}</TableHead>
                    <TableHead className="text-end">{t("grandTotal")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((j: any) => (
                    <TableRow key={j.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelected(j.id)}>
                      <TableCell className="font-mono text-xs font-bold tnum">{j.code}</TableCell>
                      <TableCell>
                        <p className="text-sm font-medium">{j.customer?.name}</p>
                        <p className="text-xs text-muted-foreground">{j.vehicle?.plateNumber} · {j.vehicle?.make} {j.vehicle?.model}</p>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-xs text-muted-foreground max-w-xs truncate">{j.complaint}</TableCell>
                      <TableCell className="hidden lg:table-cell text-xs">{j.technician?.name || "—"}</TableCell>
                      <TableCell><StatusBadge status={j.status} /></TableCell>
                      <TableCell className="text-end font-semibold tnum">{money(j.grandTotal)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create dialog */}
      <JobCardCreateDialog open={creating} onOpenChange={setCreating} />

      {/* Detail dialog */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto scroll-thin">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5" />{detail?.code}
              {detail && <StatusBadge status={detail.status} />}
            </DialogTitle>
            <DialogDescription className="sr-only">{t("jobCards")}</DialogDescription>
          </DialogHeader>
          {detail && <JobCardDetail jc={detail} money={money} onClose={() => setSelected(null)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function JobCardDetail({ jc, money, onClose }: { jc: any; money: (n: number) => string; onClose: () => void }) {
  const { t, lang } = useT();
  const { invalidate, toastSuccess, toastError } = useApiMutation();
  const [notes, setNotes] = useState(jc.diagnosis || "");

  const nextStatus = (s: string) => {
    const idx = STATUSES.indexOf(s);
    return STATUSES[idx + 1] && STATUSES[idx + 1] !== "cancelled" ? STATUSES[idx + 1] : null;
  };
  const next = nextStatus(jc.status);

  const advance = async (status: string) => {
    try {
      await fetch(`/api/job-cards/${jc.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status, diagnosis: notes }) });
      invalidate(["/api/job-cards", "/api/dashboard", "/api/parts"]);
      toastSuccess();
      onClose();
    } catch {
      toastError("Error");
    }
  };

  const generateInvoice = async () => {
    try {
      const items = [
        ...jc.services.map((s: any) => ({ type: "service", name: s.name, quantity: 1, unitPrice: s.laborPrice, discount: s.discount || 0, total: s.total })),
        ...jc.parts.map((p: any) => ({ type: "part", name: p.part.name, quantity: p.quantity, unitPrice: p.unitPrice, discount: p.discount || 0, total: p.total })),
      ];
      const res = await fetch("/api/invoices", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ customerId: jc.customerId, vehicleId: jc.vehicleId, jobCardId: jc.id, items, discount: jc.discount }) });
      if (res.ok) {
        toastSuccess(t("generateInvoice"));
        invalidate(["/api/invoices", "/api/job-cards", "/api/dashboard"]);
        onClose();
      }
    } catch {
      toastError("Error");
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 text-xs">
        <Info label={t("customer")} value={jc.customer?.name} />
        <Info label={t("vehicle")} value={`${jc.vehicle?.plateNumber} · ${jc.vehicle?.make} ${jc.vehicle?.model}`} />
        <Info label={t("mileage")} value={`${formatNumber(jc.mileage, lang)} km`} />
        <Info label={t("priority")} value={t("status_" + jc.priority)} />
        <Info label={t("technician")} value={jc.technician?.name || "—"} />
        <Info label={t("estimatedCompletion")} value={jc.estimatedCompletion ? formatDate(jc.estimatedCompletion, lang) : "—"} />
        <Info label={t("date")} value={formatDate(jc.createdAt, lang)} />
        <Info label={t("grandTotal")} value={money(jc.grandTotal)} />
      </div>

      <div className="rounded-lg border p-3">
        <p className="text-xs font-medium text-muted-foreground mb-1">{t("complaint")}</p>
        <p className="text-sm">{jc.complaint}</p>
      </div>

      <div>
        <p className="text-xs font-medium text-muted-foreground mb-1">{t("diagnosis")}</p>
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t("diagnosis")} rows={2} />
      </div>

      {/* Services & parts */}
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <h4 className="mb-2 text-sm font-semibold">{t("labor")} ({jc.services?.length ?? 0})</h4>
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader><TableRow><TableHead className="text-xs">{t("services")}</TableHead><TableHead className="text-xs text-end">{t("total")}</TableHead></TableRow></TableHeader>
              <TableBody>
                {jc.services?.map((s: any) => (
                  <TableRow key={s.id}>
                    <TableCell className="text-xs"><span className="font-medium">{s.name}</span><span className="block text-muted-foreground">{s.hours}h</span></TableCell>
                    <TableCell className="text-xs text-end tnum font-medium">{money(s.total)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
        <div>
          <h4 className="mb-2 text-sm font-semibold">{t("parts")} ({jc.parts?.length ?? 0})</h4>
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader><TableRow><TableHead className="text-xs">{t("name")}</TableHead><TableHead className="text-xs text-end">{t("quantity")}</TableHead><TableHead className="text-xs text-end">{t("total")}</TableHead></TableRow></TableHeader>
              <TableBody>
                {jc.parts?.map((p: any) => (
                  <TableRow key={p.id}>
                    <TableCell className="text-xs"><span className="font-medium">{p.part?.name}</span><StatusBadge status={p.status} label={p.status} /></TableCell>
                    <TableCell className="text-xs text-end tnum">{p.quantity}</TableCell>
                    <TableCell className="text-xs text-end tnum font-medium">{money(p.total)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      {/* Totals */}
      <div className="ms-auto w-full max-w-xs space-y-1 text-sm">
        <Row label={t("laborTotal")} value={money(jc.laborTotal)} />
        <Row label={t("partsTotal")} value={money(jc.partsTotal)} />
        {jc.discount > 0 && <Row label={t("discount")} value={"- " + money(jc.discount)} />}
        <Row label={t("tax")} value={money(jc.tax)} />
        <div className="flex justify-between border-t pt-1 text-base font-bold"><span>{t("grandTotal")}</span><span className="tnum">{money(jc.grandTotal)}</span></div>
      </div>

      {/* Status workflow */}
      <div className="flex flex-wrap items-center gap-2 rounded-lg bg-muted/50 p-3">
        <Clock className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground">{t("status")}:</span>
        <Select defaultValue={jc.status} onValueChange={(v) => advance(v)}>
          <SelectTrigger className="h-8 w-44 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {STATUSES.map((s) => <SelectItem key={s} value={s}>{t("status_" + s)}</SelectItem>)}
          </SelectContent>
        </Select>
        {next && (
          <Button size="sm" variant="default" onClick={() => advance(next)}>
            <ArrowRight className="h-3.5 w-3.5 me-1" />{t("status_" + next)}
          </Button>
        )}
        {(jc.status === "completed" || jc.status === "ready_for_delivery") && !jc.invoice && (
          <Button size="sm" variant="default" onClick={generateInvoice}><Plus className="h-3.5 w-3.5 me-1" />{t("generateInvoice")}</Button>
        )}
        <Button size="sm" variant="outline" className="ms-auto no-print" onClick={() => window.print()}><Printer className="h-3.5 w-3.5 me-1" />{t("print")}</Button>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border p-2">
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-medium truncate">{value || "—"}</p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between text-muted-foreground"><span>{label}</span><span className="tnum">{value}</span></div>;
}

// ─── Create Dialog ─────────────────────────────────────────
function JobCardCreateDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { t, lang } = useT();
  const { data: cust } = useApi<any>("/api/customers");
  const { data: svc } = useApi<any>("/api/services");
  const { data: parts } = useApi<any>("/api/parts");
  const { data: tenants } = useApi<any>("/api/settings");
  const taxPercent = tenants?.taxPercent ?? 0;
  const { invalidate, toastSuccess, toastError } = useApiMutation();
  const [saving, setSaving] = useState(false);

  const [customerId, setCustomerId] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [complaint, setComplaint] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [technicianId, setTechnicianId] = useState("");
  const [priority, setPriority] = useState("normal");
  const [estimatedCompletion, setEstimatedCompletion] = useState("");
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [selectedParts, setSelectedParts] = useState<Record<string, number>>({});

  const customers = cust?.items || [];
  const services = svc?.items || [];
  const allParts = parts?.items || [];
  const selectedCustomer = customers.find((c: any) => c.id === customerId) || null;
  const vehicles = selectedCustomer?.vehicles || [];

  const calc = useMemo(() => {
    const svcs = services.filter((s: any) => selectedServices.includes(s.id));
    const laborTotal = svcs.reduce((sum: number, s: any) => sum + s.price, 0);
    const partItems = Object.entries(selectedParts).map(([pid, qty]) => {
      const p = allParts.find((x: any) => x.id === pid);
      return p ? { ...p, qty } : null;
    }).filter(Boolean);
    const partsTotal = partItems.reduce((sum: number, p: any) => sum + p.sellingPrice * p.qty, 0);
    const subtotal = laborTotal + partsTotal;
    const tax = Math.round((subtotal * taxPercent) / 100 * 1000) / 1000;
    const grand = Math.round((subtotal + tax) * 1000) / 1000;
    return { svcs, partItems, laborTotal, partsTotal, tax, grand };
  }, [selectedServices, selectedParts, services, allParts, taxPercent]);

  const reset = () => {
    setCustomerId(""); setVehicleId(""); setComplaint(""); setDiagnosis(""); setTechnicianId(""); setPriority("normal"); setEstimatedCompletion(""); setSelectedServices([]); setSelectedParts({});
  };

  const submit = async () => {
    if (!customerId || !vehicleId || !complaint) return toastError(t("required"));
    setSaving(true);
    try {
      const servicesPayload = calc.svcs.map((s: any) => ({ serviceId: s.id, name: s.name, hours: s.durationHours, laborPrice: s.price, discount: 0, total: s.price }));
      const jobParts = calc.partItems.map((p: any) => ({ partId: p.id, quantity: p.qty, unitPrice: p.sellingPrice, discount: 0, total: p.sellingPrice * p.qty }));
      await fetch("/api/job-cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId, vehicleId, complaint, diagnosis, technicianId, priority, estimatedCompletion, services: servicesPayload, parts: jobParts, status: "draft" }),
      });
      invalidate(["/api/job-cards", "/api/parts", "/api/dashboard"]);
      toastSuccess();
      reset();
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
          <DialogTitle className="flex items-center gap-2"><Wrench className="h-5 w-5" />{t("addNew")} · {t("jobCards")}</DialogTitle>
          <DialogDescription>{t("complaint")} → {t("inspection")} → {t("estimateFor")} → {t("jobCards")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={`${t("customer")} *`}>
              <CustomerPicker
                customers={customers}
                selected={selectedCustomer}
                onSelect={(c) => { setCustomerId(c.id); setVehicleId(""); }}
                onClear={() => { setCustomerId(""); setVehicleId(""); }}
              />
            </Field>
            <Field label={`${t("vehicle")} *`}>
              <Select value={vehicleId} onValueChange={setVehicleId} disabled={!customerId}>
                <SelectTrigger><SelectValue placeholder={t("vehicle")} /></SelectTrigger>
                <SelectContent>
                  {vehicles.map((v: any) => <SelectItem key={v.id} value={v.id}>{v.plateNumber} · {v.make} {v.model}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label={t("complaint")}>
              <Input value={complaint} onChange={(e) => setComplaint(e.target.value)} placeholder={t("complaint")} />
            </Field>
            <Field label={t("diagnosis")}>
              <Input value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} placeholder={t("diagnosis")} />
            </Field>
            <Field label={t("priority")}>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["low", "normal", "high", "urgent"].map((p) => <SelectItem key={p} value={p}>{t("status_" + p)}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label={t("estimatedCompletion")}>
              <Input type="datetime-local" value={estimatedCompletion} onChange={(e) => setEstimatedCompletion(e.target.value)} />
            </Field>
          </div>

          {/* Services — searchable list */}
          <ServicePicker
            services={services}
            selected={selectedServices}
            onToggle={(id) => setSelectedServices(selectedServices.includes(id) ? selectedServices.filter((x) => x !== id) : [...selectedServices, id])}
            onClear={() => setSelectedServices([])}
          />

          {/* Parts — searchable list */}
          <PartPicker
            parts={allParts}
            selected={selectedParts}
            onToggle={(id) => setSelectedParts(selectedParts[id] ? ({ ...selectedParts, [id]: undefined }) : { ...selectedParts, [id]: 1 })}
            onQty={(id, qty) => setSelectedParts({ ...selectedParts, [id]: Math.max(1, qty) })}
            onClear={() => setSelectedParts({})}
          />

          {/* Totals */}
          <div className="ms-auto w-full max-w-xs space-y-1 rounded-lg bg-muted/50 p-3 text-sm">
            <Row label={t("laborTotal")} value={formatMoney(calc.laborTotal, "OMR", lang)} />
            <Row label={t("partsTotal")} value={formatMoney(calc.partsTotal, "OMR", lang)} />
            <Row label={t("tax")} value={formatMoney(calc.tax, "OMR", lang)} />
            <div className="flex justify-between border-t pt-1 text-base font-bold"><span>{t("grandTotal")}</span><span className="tnum">{formatMoney(calc.grand, "OMR", lang)}</span></div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={() => onOpenChange(false)}>{t("cancel")}</Button>
            <Button onClick={submit} disabled={saving}>{t("create")}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Customer Picker (search by name / phone / plate) ──────────
function CustomerPicker({ customers, selected, onSelect, onClear }: { customers: any[]; selected: any; onSelect: (c: any) => void; onClear: () => void }) {
  const { t, lang } = useT();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return customers.slice(0, 30);
    return customers.filter((c) => {
      const byName = c.name.toLowerCase().includes(q);
      const byPhone = (c.mobile || "").toLowerCase().includes(q) || (c.whatsapp || "").toLowerCase().includes(q);
      const byPlate = (c.vehicles || []).some((v: any) => (v.plateNumber || "").toLowerCase().includes(q));
      return byName || byPhone || byPlate;
    }).slice(0, 30);
  }, [customers, query]);

  // Selected customer card
  if (selected) {
    return (
      <div className="flex items-start justify-between gap-2 rounded-lg border bg-muted/30 p-2.5">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{selected.name}</p>
          <p className="truncate text-xs text-muted-foreground">{t("mobile")}: {selected.mobile}</p>
          <p className="truncate text-xs text-muted-foreground">{t("vehiclesCount")}: {selected.vehicles?.length ?? 0}</p>
        </div>
        <Button type="button" variant="ghost" size="sm" className="h-7 shrink-0 text-xs" onClick={onClear}>{t("changeCustomer")}</Button>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder={t("searchCustomer")}
          className="ps-9"
          autoComplete="off"
        />
      </div>
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover p-1 shadow-md max-h-64 overflow-y-auto scroll-thin">
          {filtered.length === 0 ? (
            <p className="px-3 py-4 text-center text-xs text-muted-foreground">{query ? t("noResultsFound") : t("emptyHintCustomer")}</p>
          ) : (
            filtered.map((c) => (
              <button
                key={c.id}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => { onSelect(c); setQuery(""); setOpen(false); }}
                className="flex w-full items-center gap-2.5 rounded px-2 py-2 text-start hover:bg-accent"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  {c.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{c.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{c.mobile}</p>
                </div>
                {(c.vehicles?.length ?? 0) > 0 && (
                  <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground tnum">
                    {c.vehicles.map((v: any) => v.plateNumber).join(" · ")}
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ─── Service Picker (searchable list) ──────────────────────────
function ServicePicker({ services, selected, onToggle, onClear }: { services: any[]; selected: string[]; onToggle: (id: string) => void; onClear: () => void }) {
  const { t, lang } = useT();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return services;
    return services.filter((s) => s.name.toLowerCase().includes(q) || (s.code || "").toLowerCase().includes(q));
  }, [services, query]);

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-semibold">{t("services")} <span className="text-muted-foreground">({services.length})</span></p>
        {selected.length > 0 && (
          <button type="button" onClick={onClear} className="text-xs text-muted-foreground hover:text-foreground">{t("remove")} ({selected.length})</button>
        )}
      </div>
      <div className="relative mb-2">
        <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("searchServices")} className="ps-9" autoComplete="off" />
      </div>
      <div className="rounded-lg border max-h-44 overflow-y-auto scroll-thin divide-y">
        {filtered.length === 0 ? (
          <p className="px-3 py-4 text-center text-xs text-muted-foreground">{query ? t("noResultsFound") : t("noData")}</p>
        ) : (
          filtered.map((s) => {
            const isSel = selected.includes(s.id);
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => onToggle(s.id)}
                className={`flex w-full items-center gap-2 px-3 py-2 text-start text-sm transition-colors ${isSel ? "bg-primary/10" : "hover:bg-muted/50"}`}
              >
                <div className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${isSel ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40"}`}>
                  {isSel && <Check className="h-3 w-3" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{s.name}</p>
                  <p className="truncate text-[11px] text-muted-foreground">{s.code} · {s.durationHours}h</p>
                </div>
                <span className="shrink-0 text-xs font-semibold tnum">{formatMoney(s.price, "OMR", lang)}</span>
              </button>
            );
          })
        )}
      </div>
      {selected.length > 0 && (
        <p className="mt-1.5 text-xs text-muted-foreground">{t("selectedServices")}: <span className="font-semibold text-foreground tnum">{selected.length}</span></p>
      )}
    </div>
  );
}

// ─── Part Picker (searchable list) ──────────────────────────────
function PartPicker({ parts, selected, onToggle, onQty, onClear }: { parts: any[]; selected: Record<string, number>; onToggle: (id: string) => void; onQty: (id: string, qty: number) => void; onClear: () => void }) {
  const { t, lang } = useT();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return parts;
    return parts.filter((p) => p.name.toLowerCase().includes(q) || (p.sku || "").toLowerCase().includes(q) || (p.barcode || "").toLowerCase().includes(q));
  }, [parts, query]);

  const selectedCount = Object.values(selected).filter(Boolean).length;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-semibold">{t("parts")} <span className="text-muted-foreground">({parts.length})</span></p>
        {selectedCount > 0 && (
          <button type="button" onClick={onClear} className="text-xs text-muted-foreground hover:text-foreground">{t("remove")} ({selectedCount})</button>
        )}
      </div>
      <div className="relative mb-2">
        <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("searchParts")} className="ps-9" autoComplete="off" />
      </div>
      <div className="rounded-lg border max-h-44 overflow-y-auto scroll-thin divide-y">
        {filtered.length === 0 ? (
          <p className="px-3 py-4 text-center text-xs text-muted-foreground">{query ? t("noResultsFound") : t("noData")}</p>
        ) : (
          filtered.map((p) => {
            const qty = selected[p.id];
            const isSel = !!qty;
            const low = p.quantity <= p.minStock;
            return (
              <div key={p.id} className={`flex items-center gap-2 px-3 py-2 text-sm transition-colors ${isSel ? "bg-primary/10" : "hover:bg-muted/50"}`}>
                <button type="button" onClick={() => onToggle(p.id)} className="flex min-w-0 flex-1 items-center gap-2 text-start">
                  <div className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${isSel ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40"}`}>
                    {isSel && <Check className="h-3 w-3" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{p.name}</p>
                    <p className="truncate text-[11px] text-muted-foreground">{p.sku} · {t("stockQty")}: <span className={low ? "text-amber-600 font-semibold" : ""}>{p.quantity}</span></p>
                  </div>
                </button>
                {isSel && (
                  <input
                    type="number"
                    min={1}
                    value={qty}
                    onChange={(e) => onQty(p.id, Number(e.target.value))}
                    className="h-7 w-14 shrink-0 rounded border bg-background px-1 text-xs tnum"
                    onClick={(e) => e.stopPropagation()}
                  />
                )}
                <span className="shrink-0 text-xs font-semibold tnum">{formatMoney(p.sellingPrice, "OMR", lang)}</span>
              </div>
            );
          })
        )}
      </div>
      {selectedCount > 0 && (
        <p className="mt-1.5 text-xs text-muted-foreground">{t("selectedParts")}: <span className="font-semibold text-foreground tnum">{selectedCount}</span></p>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}
