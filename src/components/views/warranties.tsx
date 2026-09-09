"use client";

import { useT, formatDate } from "@/lib/format";
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
import { useState } from "react";
import { ShieldCheck, AlertCircle, Plus, Pencil, Loader2 } from "lucide-react";

const TYPES = ["service", "part", "repair"];

export function WarrantiesView() {
  const { t, lang } = useT();
  const { data, isLoading } = useApi<any>("/api/warranties");
  const { canCreate, canEdit, canDelete } = usePermissions();
  const { invalidate, toastSuccess, toastError } = useApiMutation();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const now = new Date();

  const deleteWarranty = async (w: any) => {
    if (!confirm(t("confirmDeleteRecord"))) return;
    try {
      const res = await fetch(`/api/warranties?id=${w.id}`, { method: "DELETE" });
      if (!res.ok) { toastError(t("requestFailed")); return; }
      invalidate(["/api/warranties"]);
      toastSuccess();
    } catch {
      toastError(t("requestFailed"));
    }
  };

  return (
    <div>
      <PageHeader title={t("warranties")} subtitle={`${data?.items?.length ?? 0} ${t("warranties").toLowerCase()}`}>
        {canCreate("warranties") && <Button size="sm" onClick={() => setCreating(true)}><Plus className="h-4 w-4 me-1" />{t("addNew")}</Button>}
      </PageHeader>
      <Card>
        <CardContent className="p-3 sm:p-4">
          {isLoading ? <LoadingRows /> : (data?.items || []).length === 0 ? <EmptyState title={t("noData")} icon={ShieldCheck} /> : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("vehicle")}</TableHead>
                    <TableHead>{t("customer")}</TableHead>
                    <TableHead className="hidden md:table-cell">{t("jobCardNumber")}</TableHead>
                    <TableHead className="text-center">{t("periodMonths")}</TableHead>
                    <TableHead className="hidden sm:table-cell">{t("date")}</TableHead>
                    <TableHead className="text-center">{t("status")}</TableHead>
                    {(canEdit("warranties") || canDelete("warranties")) && <TableHead className="text-end">{t("actions")}</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(data?.items || []).map((w: any) => {
                    const expired = new Date(w.expiryDate) < now;
                    return (
                      <TableRow key={w.id}>
                        <TableCell className="text-sm font-medium">{w.jobCard?.vehicle?.plateNumber}</TableCell>
                        <TableCell className="text-xs">{w.jobCard?.customer?.name}</TableCell>
                        <TableCell className="hidden md:table-cell font-mono text-xs tnum">{w.jobCard?.code}</TableCell>
                        <TableCell className="text-center tnum">{w.periodMonths}m</TableCell>
                        <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">{formatDate(w.startDate, lang)} → {formatDate(w.expiryDate, lang)}</TableCell>
                        <TableCell className="text-center">
                          {expired ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800 dark:bg-red-950 dark:text-red-300"><AlertCircle className="h-3 w-3" />{t("status_cancelled")}</span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"><ShieldCheck className="h-3 w-3" />{t("status_active") || "Active"}</span>
                          )}
                        </TableCell>
                        {(canEdit("warranties") || canDelete("warranties")) && (
                          <TableCell className="text-end">
                            <RowActions canEdit={canEdit("warranties")} canDelete={canDelete("warranties")} onEdit={() => setEditing(w)} onDelete={() => deleteWarranty(w)} />
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <WarrantyDialog open={creating} onOpenChange={setCreating} />
      {editing && <WarrantyDialog open warranty={editing} onOpenChange={(o) => !o && setEditing(null)} />}
    </div>
  );
}

function WarrantyDialog({ open, onOpenChange, warranty }: { open: boolean; onOpenChange: (o: boolean) => void; warranty?: any }) {
  const { t } = useT();
  const { data: jobs } = useApi<any>("/api/job-cards");
  const { invalidate, toastSuccess, toastError } = useApiMutation();
  const isEdit = !!warranty;
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({
    jobCardId: warranty?.jobCardId || "",
    type: warranty?.type || "service",
    periodMonths: String(warranty?.periodMonths ?? 3),
    startDate: warranty?.startDate ? new Date(warranty.startDate).toISOString().slice(0, 10) : today,
    expiryDate: warranty?.expiryDate ? new Date(warranty.expiryDate).toISOString().slice(0, 10) : "",
    terms: warranty?.terms || "",
  });
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!form.jobCardId || !form.periodMonths) return toastError(t("required"));
    setSaving(true);
    try {
      const payload = { ...form, periodMonths: Number(form.periodMonths), expiryDate: form.expiryDate || undefined };
      const res = await fetch("/api/warranties", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isEdit ? { id: warranty.id, ...payload } : payload),
      });
      if (!res.ok) { toastError(t("requestFailed")); return; }
      invalidate(["/api/warranties"]);
      toastSuccess();
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
            {isEdit ? <Pencil className="h-5 w-5" /> : <ShieldCheck className="h-5 w-5" />}
            {isEdit ? `${t("edit")}: ${t("warranties")}` : `${t("addNew")} · ${t("warranties")}`}
          </DialogTitle>
          <DialogDescription className="sr-only">{t("warranties")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5"><Label className="text-xs">{t("jobCards")} *</Label>
            <Select value={form.jobCardId} onValueChange={(v) => setForm({ ...form, jobCardId: v })}>
              <SelectTrigger><SelectValue placeholder={t("jobCards")} /></SelectTrigger>
              <SelectContent>
                {(jobs?.items || []).map((j: any) => (
                  <SelectItem key={j.id} value={j.id}>{j.code} · {j.customer?.name} · {j.vehicle?.plateNumber}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label className="text-xs">{t("warrantyType")}</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TYPES.map((ty) => <SelectItem key={ty} value={ty}>{t("type_" + ty)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label className="text-xs">{t("periodMonths")} *</Label><Input type="number" min={1} value={form.periodMonths} onChange={(e) => setForm({ ...form, periodMonths: e.target.value })} /></div>
            <div className="space-y-1.5"><Label className="text-xs">{t("startDate")}</Label><Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} /></div>
            <div className="space-y-1.5"><Label className="text-xs">{t("expiryDate")}</Label><Input type="date" value={form.expiryDate} onChange={(e) => setForm({ ...form, expiryDate: e.target.value })} /></div>
          </div>
          <div className="space-y-1.5"><Label className="text-xs">{t("termsConditions")}</Label><Textarea value={form.terms} onChange={(e) => setForm({ ...form, terms: e.target.value })} rows={2} /></div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>{t("cancel")}</Button>
            <Button onClick={submit} disabled={saving}>{saving && <Loader2 className="h-4 w-4 animate-spin me-1" />}{isEdit ? t("save") : t("create")}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
