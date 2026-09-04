"use client";

import { useState } from "react";
import { Clock, Loader2, Pencil, Plus, Search, Settings2, ShieldCheck, Trash2 } from "lucide-react";
import { useT, formatMoney } from "@/lib/format";
import { usePermissions } from "@/lib/use-permissions";
import { useApi, EmptyState, LoadingRows, PageHeader, StatusBadge, useApiMutation } from "@/components/shared";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type ServiceRecord = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  durationHours: number;
  laborCost: number;
  price: number;
  warrantyMonths: number;
  active: boolean;
};

type ServiceForm = {
  code: string;
  name: string;
  description: string;
  durationHours: string;
  laborCost: string;
  price: string;
  warrantyMonths: string;
  active: boolean;
};

const EMPTY_FORM: ServiceForm = {
  code: "",
  name: "",
  description: "",
  durationHours: "1",
  laborCost: "0",
  price: "0",
  warrantyMonths: "0",
  active: true,
};

export function ServicesView() {
  const { t, lang } = useT();
  const { data, isLoading } = useApi<{ items: ServiceRecord[] }>("/api/services");
  const { canCreate, canEdit, canDelete } = usePermissions();
  const { invalidate, toastSuccess, toastError } = useApiMutation();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<ServiceRecord | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const money = (value: number) => formatMoney(value, "OMR", lang);

  const allServices = data?.items || [];
  const query = q.trim().toLowerCase();
  const services = allServices.filter((service) => {
    if (status === "active" && !service.active) return false;
    if (status === "inactive" && service.active) return false;
    if (!query) return true;
    return [service.code, service.name, service.description || ""].some((value) => value.toLowerCase().includes(query));
  });

  const invalidateServices = () => {
    invalidate(["/api/services", "/api/services?active=1"]);
  };

  const deleteService = async (service: ServiceRecord) => {
    if (!confirm(t("confirmDeleteService"))) return;
    setDeletingId(service.id);
    try {
      const response = await fetch(`/api/services/${service.id}`, { method: "DELETE" });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        toastError(result.error === "service_in_use" ? t("serviceInUse") : t("requestFailed"));
        return;
      }
      invalidateServices();
      toastSuccess();
    } catch {
      toastError(t("requestFailed"));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div>
      <PageHeader title={t("services")} subtitle={`${allServices.length} ${t("services").toLowerCase()}`}>
        {canCreate("services") && (
          <Button size="sm" onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4 me-1" />{t("addNew")}
          </Button>
        )}
      </PageHeader>

      <Card>
        <CardContent className="p-3 sm:p-4">
          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative flex-1 sm:max-w-sm">
              <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={q} onChange={(event) => setQ(event.target.value)} placeholder={t("searchServices")} className="ps-9" />
            </div>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-full sm:w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("all")}</SelectItem>
                <SelectItem value="active">{t("status_active")}</SelectItem>
                <SelectItem value="inactive">{t("status_inactive")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <LoadingRows />
          ) : services.length === 0 ? (
            <EmptyState title={query || status !== "all" ? t("noResults") : t("noData")} icon={Settings2} />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("serviceCode")}</TableHead>
                    <TableHead>{t("name")}</TableHead>
                    <TableHead className="hidden md:table-cell">{t("description")}</TableHead>
                    <TableHead className="hidden sm:table-cell text-end"><Clock className="inline h-3.5 w-3.5" /> {t("durationHours")}</TableHead>
                    <TableHead className="hidden xl:table-cell text-end"><ShieldCheck className="inline h-3.5 w-3.5" /> {t("warrantyMonths")}</TableHead>
                    <TableHead className="hidden lg:table-cell text-end">{t("labor")}</TableHead>
                    <TableHead className="text-end">{t("sellingPrice")}</TableHead>
                    <TableHead>{t("status")}</TableHead>
                    {(canEdit("services") || canDelete("services")) && <TableHead className="text-end">{t("actions")}</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {services.map((service) => (
                    <TableRow key={service.id}>
                      <TableCell className="font-mono text-xs tnum">{service.code}</TableCell>
                      <TableCell className="text-sm font-medium">{service.name}</TableCell>
                      <TableCell className="hidden max-w-xs truncate text-xs text-muted-foreground md:table-cell">{service.description || "—"}</TableCell>
                      <TableCell className="hidden text-end text-muted-foreground tnum sm:table-cell">{service.durationHours}h</TableCell>
                      <TableCell className="hidden text-end text-muted-foreground tnum xl:table-cell">{service.warrantyMonths ? `${service.warrantyMonths}m` : "—"}</TableCell>
                      <TableCell className="hidden text-end text-muted-foreground tnum lg:table-cell">{money(service.laborCost)}</TableCell>
                      <TableCell className="text-end font-semibold tnum">{money(service.price)}</TableCell>
                      <TableCell><StatusBadge status={service.active ? "active" : "inactive"} /></TableCell>
                      {(canEdit("services") || canDelete("services")) && (
                        <TableCell className="text-end">
                          <div className="flex items-center justify-end gap-1">
                            {canEdit("services") && (
                              <Button size="icon" variant="ghost" className="h-7 w-7" title={t("edit")} onClick={() => setEditing(service)}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            {canDelete("services") && (
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-destructive hover:text-destructive"
                                title={t("delete")}
                                disabled={deletingId === service.id}
                                onClick={() => deleteService(service)}
                              >
                                {deletingId === service.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                              </Button>
                            )}
                          </div>
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

      <ServiceDialog open={creating} onOpenChange={setCreating} onSaved={invalidateServices} />
      {editing && (
        <ServiceDialog
          key={editing.id}
          open
          service={editing}
          onOpenChange={(open) => !open && setEditing(null)}
          onSaved={invalidateServices}
        />
      )}
    </div>
  );
}

function ServiceDialog({
  open,
  onOpenChange,
  onSaved,
  service,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
  service?: ServiceRecord;
}) {
  const { t } = useT();
  const { toastSuccess, toastError } = useApiMutation();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<ServiceForm>(() => service ? {
    code: service.code,
    name: service.name,
    description: service.description || "",
    durationHours: String(service.durationHours),
    laborCost: String(service.laborCost),
    price: String(service.price),
    warrantyMonths: String(service.warrantyMonths),
    active: service.active,
  } : { ...EMPTY_FORM });

  const submit = async () => {
    const durationHours = Number(form.durationHours);
    const laborCost = Number(form.laborCost);
    const price = Number(form.price);
    const warrantyMonths = Number(form.warrantyMonths);
    if (
      !form.code.trim() ||
      !form.name.trim() ||
      !Number.isFinite(durationHours) || durationHours <= 0 ||
      !Number.isFinite(laborCost) || laborCost < 0 ||
      !Number.isFinite(price) || price < 0 ||
      !Number.isInteger(warrantyMonths) || warrantyMonths < 0
    ) {
      toastError(t("invalidServiceData"));
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(service ? `/api/services/${service.id}` : "/api/services", {
        method: service ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, durationHours, laborCost, price, warrantyMonths }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        toastError(result.error === "service_code_in_use" ? t("serviceCodeInUse") : result.error === "invalid_service_data" ? t("invalidServiceData") : t("requestFailed"));
        return;
      }

      onSaved();
      toastSuccess();
      if (!service) setForm({ ...EMPTY_FORM });
      onOpenChange(false);
    } catch {
      toastError(t("requestFailed"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !saving && onOpenChange(nextOpen)}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg scroll-thin">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {service ? <Pencil className="h-5 w-5" /> : <Settings2 className="h-5 w-5" />}
            {service ? `${t("edit")}: ${service.name}` : `${t("addNew")} · ${t("services")}`}
          </DialogTitle>
          <DialogDescription className="sr-only">{service?.code || t("newRecord")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">{t("serviceCode")} *</Label>
              <Input value={form.code} maxLength={50} onChange={(event) => setForm({ ...form, code: event.target.value })} placeholder="OIL-CHG" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t("name")} *</Label>
              <Input value={form.name} maxLength={200} onChange={(event) => setForm({ ...form, name: event.target.value })} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">{t("description")}</Label>
            <Textarea value={form.description} maxLength={2000} onChange={(event) => setForm({ ...form, description: event.target.value })} rows={2} />
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="space-y-1.5">
              <Label className="text-xs">{t("durationHours")}</Label>
              <Input type="number" min="0.01" step="0.25" value={form.durationHours} onChange={(event) => setForm({ ...form, durationHours: event.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t("labor")}</Label>
              <Input type="number" min="0" step="0.001" value={form.laborCost} onChange={(event) => setForm({ ...form, laborCost: event.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t("sellingPrice")}</Label>
              <Input type="number" min="0" step="0.001" value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t("warrantyMonths")}</Label>
              <Input type="number" min="0" step="1" value={form.warrantyMonths} onChange={(event) => setForm({ ...form, warrantyMonths: event.target.value })} />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <Label htmlFor="service-active" className="text-sm">{t("status_active")}</Label>
              <p className="text-xs text-muted-foreground">{t("activeServiceHint")}</p>
            </div>
            <Switch id="service-active" checked={form.active} onCheckedChange={(active) => setForm({ ...form, active })} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>{t("cancel")}</Button>
            <Button onClick={submit} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin me-1" />}
              {service ? t("save") : t("create")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
