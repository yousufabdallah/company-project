"use client";

import { useT } from "@/lib/format";
import { useApi, StatusBadge, EmptyState, LoadingRows, PageHeader, useApiMutation, RowActions } from "@/components/shared";
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
import { CalendarClock, Plus, Pencil, Loader2 } from "lucide-react";
import { useState } from "react";

export function AppointmentsView() {
  const { t, lang } = useT();
  const { data, isLoading } = useApi<any>("/api/appointments");
  const setQuickCreate = useApp((s) => s.setQuickCreate);
  const { canCreate, canEdit, canDelete } = usePermissions();
  const { invalidate, toastSuccess, toastError } = useApiMutation();
  const [statusFilter, setStatusFilter] = useState("all");
  const [editing, setEditing] = useState<any>(null);

  const deleteAppointment = async (a: any) => {
    if (!confirm(t("confirmDeleteRecord"))) return;
    try {
      const res = await fetch(`/api/appointments?id=${a.id}`, { method: "DELETE" });
      if (!res.ok) { toastError(t("requestFailed")); return; }
      invalidate(["/api/appointments", "/api/dashboard"]);
      toastSuccess();
    } catch {
      toastError(t("requestFailed"));
    }
  };

  const items = (data?.items || []).filter((a: any) => statusFilter === "all" || a.status === statusFilter);
  const byDate = new Map<string, any[]>();
  for (const a of items) {
    const key = new Date(a.date).toLocaleDateString(lang === "ar" ? "ar-OM" : "en-US", { weekday: "short", day: "numeric", month: "short" });
    if (!byDate.has(key)) byDate.set(key, []);
    byDate.get(key)!.push(a);
  }

  const setStatus = async (id: string, status: string) => {
    try {
      await fetch("/api/appointments", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status }) });
      invalidate(["/api/appointments", "/api/dashboard"]);
      toastSuccess();
    } catch {
      toastError("Error");
    }
  };

  return (
    <div>
      <PageHeader title={t("appointments")} subtitle={`${items.length} ${t("appointments").toLowerCase()}`}>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("all")}</SelectItem>
            <SelectItem value="scheduled">{t("status_scheduled")}</SelectItem>
            <SelectItem value="confirmed">{t("status_confirmed")}</SelectItem>
            <SelectItem value="arrived">{t("status_arrived")}</SelectItem>
            <SelectItem value="completed">{t("status_completed")}</SelectItem>
            <SelectItem value="no_show">{t("status_no_show")}</SelectItem>
            <SelectItem value="cancelled">{t("status_cancelled")}</SelectItem>
          </SelectContent>
        </Select>
        {canCreate("appointments") && <Button size="sm" onClick={() => setQuickCreate("appointment")}><Plus className="h-4 w-4 me-1" />{t("addNew")}</Button>}
      </PageHeader>

      {isLoading ? (
        <LoadingRows />
      ) : items.length === 0 ? (
        <Card><CardContent className="p-6"><EmptyState title={t("noAppointments")} icon={CalendarClock} /></CardContent></Card>
      ) : (
        <div className="space-y-4">
          {[...byDate.entries()].map(([date, appts]) => (
            <Card key={date}>
              <CardContent className="p-3 sm:p-4">
                <h3 className="mb-2 text-sm font-semibold text-muted-foreground">{date}</h3>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-20">{t("time")}</TableHead>
                        <TableHead>{t("customer")} / {t("vehicle")}</TableHead>
                        <TableHead className="hidden md:table-cell">{t("services")}</TableHead>
                        <TableHead className="hidden lg:table-cell">{t("technician")}</TableHead>
                        <TableHead>{t("status")}</TableHead>
                        <TableHead className="text-end">{t("actions")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {appts.map((a: any) => (
                        <TableRow key={a.id}>
                          <TableCell className="font-mono font-bold tnum">{a.time}</TableCell>
                          <TableCell>
                            <p className="text-sm font-medium">{a.customer?.name}</p>
                            <p className="text-xs text-muted-foreground">{a.vehicle?.plateNumber} · {a.vehicle?.make} {a.vehicle?.model}</p>
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-xs">{a.service?.name || "—"}</TableCell>
                          <TableCell className="hidden lg:table-cell text-xs">{a.technician?.name || "—"}</TableCell>
                          <TableCell><StatusBadge status={a.status} /></TableCell>
                          <TableCell className="text-end">
                            <div className="flex items-center justify-end gap-1">
                              <Select value={a.status} onValueChange={(v) => setStatus(a.id, v)}>
                                <SelectTrigger className="h-7 w-28 text-xs"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="scheduled">{t("status_scheduled")}</SelectItem>
                                  <SelectItem value="confirmed">{t("status_confirmed")}</SelectItem>
                                  <SelectItem value="arrived">{t("status_arrived")}</SelectItem>
                                  <SelectItem value="completed">{t("status_completed")}</SelectItem>
                                  <SelectItem value="no_show">{t("status_no_show")}</SelectItem>
                                  <SelectItem value="cancelled">{t("status_cancelled")}</SelectItem>
                                </SelectContent>
                              </Select>
                              {(canEdit("appointments") || canDelete("appointments")) && (
                                <RowActions canEdit={canEdit("appointments")} canDelete={canDelete("appointments")} onEdit={() => setEditing(a)} onDelete={() => deleteAppointment(a)} />
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {editing && <EditAppointmentDialog appointment={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

function EditAppointmentDialog({ appointment, onClose }: { appointment: any; onClose: () => void }) {
  const { t } = useT();
  const { data: cust } = useApi<any>("/api/customers");
  const { data: svc } = useApi<any>("/api/services?active=1");
  const { data: users } = useApi<any>("/api/users");
  const { invalidate, toastSuccess, toastError } = useApiMutation();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    customerId: appointment.customerId || "",
    vehicleId: appointment.vehicleId || "",
    serviceId: appointment.serviceId || "",
    technicianId: appointment.technicianId || "",
    date: appointment.date ? new Date(appointment.date).toISOString().slice(0, 10) : "",
    time: appointment.time || "09:00",
    notes: appointment.notes || "",
    status: appointment.status || "scheduled",
  });
  const vehicles = (cust?.items || []).find((c: any) => c.id === form.customerId)?.vehicles || [];
  const techs = (users?.items || []).filter((u: any) => u.role === "technician" && u.active);

  const save = async () => {
    if (!form.customerId || !form.date || !form.time) return toastError(t("required"));
    setSaving(true);
    try {
      const res = await fetch("/api/appointments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: appointment.id, ...form, vehicleId: form.vehicleId || null, serviceId: form.serviceId || null, technicianId: form.technicianId || null }),
      });
      if (!res.ok) { toastError(t("requestFailed")); return; }
      invalidate(["/api/appointments", "/api/dashboard"]);
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
          <DialogTitle className="flex items-center gap-2"><Pencil className="h-5 w-5" />{t("edit")}: {t("appointments")}</DialogTitle>
          <DialogDescription className="sr-only">{appointment.customer?.name}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5"><Label className="text-xs">{t("customer")} *</Label>
            <Select value={form.customerId} onValueChange={(v) => setForm({ ...form, customerId: v, vehicleId: "" })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{(cust?.items || []).map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name} · {c.mobile}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label className="text-xs">{t("vehicle")}</Label>
              <Select value={form.vehicleId || "none"} onValueChange={(v) => setForm({ ...form, vehicleId: v === "none" ? "" : v })} disabled={!form.customerId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">—</SelectItem>
                  {vehicles.map((v: any) => <SelectItem key={v.id} value={v.id}>{v.plateNumber} · {v.make} {v.model}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label className="text-xs">{t("services")}</Label>
              <Select value={form.serviceId || "none"} onValueChange={(v) => setForm({ ...form, serviceId: v === "none" ? "" : v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">—</SelectItem>
                  {(svc?.items || []).map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label className="text-xs">{t("date")} *</Label><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
            <div className="space-y-1.5"><Label className="text-xs">{t("time")} *</Label><Input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} /></div>
            <div className="space-y-1.5"><Label className="text-xs">{t("technician")}</Label>
              <Select value={form.technicianId || "none"} onValueChange={(v) => setForm({ ...form, technicianId: v === "none" ? "" : v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">—</SelectItem>
                  {techs.map((u: any) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label className="text-xs">{t("status")}</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="scheduled">{t("status_scheduled")}</SelectItem>
                  <SelectItem value="confirmed">{t("status_confirmed")}</SelectItem>
                  <SelectItem value="arrived">{t("status_arrived")}</SelectItem>
                  <SelectItem value="completed">{t("status_completed")}</SelectItem>
                  <SelectItem value="no_show">{t("status_no_show")}</SelectItem>
                  <SelectItem value="cancelled">{t("status_cancelled")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5"><Label className="text-xs">{t("notes")}</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} /></div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>{t("cancel")}</Button>
            <Button onClick={save} disabled={saving}>{saving && <Loader2 className="h-4 w-4 animate-spin me-1" />}{t("save")}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
