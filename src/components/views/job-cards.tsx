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
import { Wrench, Plus, Search, Printer, Trash2, ArrowRight, Clock } from "lucide-react";

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

  const vehicles = (cust?.items || []).find((c: any) => c.id === customerId)?.vehicles || [];

  const calc = useMemo(() => {
    const svcs = (svc?.items || []).filter((s: any) => selectedServices.includes(s.id));
    const laborTotal = svcs.reduce((sum: number, s: any) => sum + s.price, 0);
    const partItems = Object.entries(selectedParts).map(([pid, qty]) => {
      const p = (parts?.items || []).find((x: any) => x.id === pid);
      return p ? { ...p, qty } : null;
    }).filter(Boolean);
    const partsTotal = partItems.reduce((sum: number, p: any) => sum + p.sellingPrice * p.qty, 0);
    const subtotal = laborTotal + partsTotal;
    const tax = Math.round((subtotal * taxPercent) / 100 * 1000) / 1000;
    const grand = Math.round((subtotal + tax) * 1000) / 1000;
    return { svcs, partItems, laborTotal, partsTotal, tax, grand };
  }, [selectedServices, selectedParts, svc, parts, taxPercent]);

  const reset = () => {
    setCustomerId(""); setVehicleId(""); setComplaint(""); setDiagnosis(""); setTechnicianId(""); setPriority("normal"); setEstimatedCompletion(""); setSelectedServices([]); setSelectedParts({});
  };

  const submit = async () => {
    if (!customerId || !vehicleId || !complaint) return toastError(t("required"));
    setSaving(true);
    try {
      const services = calc.svcs.map((s: any) => ({ serviceId: s.id, name: s.name, hours: s.durationHours, laborPrice: s.price, discount: 0, total: s.price }));
      const jobParts = calc.partItems.map((p: any) => ({ partId: p.id, quantity: p.qty, unitPrice: p.sellingPrice, discount: 0, total: p.sellingPrice * p.qty }));
      await fetch("/api/job-cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId, vehicleId, complaint, diagnosis, technicianId, priority, estimatedCompletion, services, parts: jobParts, status: "draft" }),
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
              <Select value={customerId} onValueChange={(v) => { setCustomerId(v); setVehicleId(""); }}>
                <SelectTrigger><SelectValue placeholder={t("customer")} /></SelectTrigger>
                <SelectContent>
                  {(cust?.items || []).map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name} · {c.mobile}</SelectItem>)}
                </SelectContent>
              </Select>
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

          {/* Services selection */}
          <div>
            <p className="mb-2 text-sm font-semibold">{t("services")}</p>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 max-h-40 overflow-y-auto scroll-thin rounded-lg border p-2">
              {(svc?.items || []).map((s: any) => (
                <label key={s.id} className="flex cursor-pointer items-center gap-2 rounded p-1.5 text-sm hover:bg-muted/50">
                  <input
                    type="checkbox"
                    checked={selectedServices.includes(s.id)}
                    onChange={(e) => setSelectedServices(e.target.checked ? [...selectedServices, s.id] : selectedServices.filter((x) => x !== s.id))}
                    className="h-4 w-4 accent-primary"
                  />
                  <span className="flex-1 truncate">{s.name}</span>
                  <span className="text-xs text-muted-foreground tnum">{formatMoney(s.price, "OMR", lang)}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Parts selection */}
          <div>
            <p className="mb-2 text-sm font-semibold">{t("parts")}</p>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 max-h-40 overflow-y-auto scroll-thin rounded-lg border p-2">
              {(parts?.items || []).map((p: any) => (
                <div key={p.id} className="flex items-center gap-2 rounded p-1.5 text-sm">
                  <input
                    type="checkbox"
                    checked={!!selectedParts[p.id]}
                    onChange={(e) => setSelectedParts(e.target.checked ? { ...selectedParts, [p.id]: 1 } : ({ ...selectedParts, [p.id]: undefined }))}
                    className="h-4 w-4 accent-primary shrink-0"
                  />
                  <span className="flex-1 truncate">{p.name}</span>
                  {selectedParts[p.id] && (
                    <input
                      type="number"
                      min={1}
                      value={selectedParts[p.id]}
                      onChange={(e) => setSelectedParts({ ...selectedParts, [p.id]: Math.max(1, Number(e.target.value)) })}
                      className="h-7 w-14 rounded border bg-background px-1 text-xs tnum"
                    />
                  )}
                  <span className="text-xs text-muted-foreground tnum">{formatMoney(p.sellingPrice, "OMR", lang)}</span>
                </div>
              ))}
            </div>
          </div>

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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}
