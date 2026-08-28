"use client";

import { useT, formatMoney } from "@/lib/format";
import { useApi, EmptyState, LoadingRows, PageHeader, useApiMutation } from "@/components/shared";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useState } from "react";
import { Settings2, Plus, Clock, ShieldCheck } from "lucide-react";

export function ServicesView() {
  const { t, lang } = useT();
  const { data, isLoading } = useApi<any>("/api/services");
  const [creating, setCreating] = useState(false);
  const money = (n: number) => formatMoney(n, "OMR", lang);

  return (
    <div>
      <PageHeader title={t("services")} subtitle={`${data?.items?.length ?? 0} ${t("services").toLowerCase()}`}>
        <Button size="sm" onClick={() => setCreating(true)}><Plus className="h-4 w-4 me-1" />{t("addNew")}</Button>
      </PageHeader>

      <Card>
        <CardContent className="p-3 sm:p-4">
          {isLoading ? <LoadingRows /> : (data?.items || []).length === 0 ? <EmptyState title={t("noData")} icon={Settings2} /> : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("category")}</TableHead>
                    <TableHead>{t("name")}</TableHead>
                    <TableHead className="hidden md:table-cell">{t("description")}</TableHead>
                    <TableHead className="text-end hidden sm:table-cell"><Clock className="h-3.5 w-3.5 inline" /> {t("estimatedCompletion")}</TableHead>
                    <TableHead className="text-end hidden lg:table-cell"><ShieldCheck className="h-3.5 w-3.5 inline" /> {t("warranties")}</TableHead>
                    <TableHead className="text-end">{t("labor")}</TableHead>
                    <TableHead className="text-end">{t("sellingPrice")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(data?.items || []).map((s: any) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-mono text-xs tnum">{s.code}</TableCell>
                      <TableCell className="text-sm font-medium">{s.name}</TableCell>
                      <TableCell className="hidden md:table-cell text-xs text-muted-foreground max-w-xs truncate">{s.description || "—"}</TableCell>
                      <TableCell className="hidden sm:table-cell text-end tnum text-muted-foreground">{s.durationHours}h</TableCell>
                      <TableCell className="hidden lg:table-cell text-end tnum text-muted-foreground">{s.warrantyMonths ? `${s.warrantyMonths}m` : "—"}</TableCell>
                      <TableCell className="text-end tnum text-muted-foreground">{money(s.laborCost)}</TableCell>
                      <TableCell className="text-end tnum font-semibold">{money(s.price)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <ServiceCreateDialog open={creating} onOpenChange={setCreating} />
    </div>
  );
}

function ServiceCreateDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { t } = useT();
  const { invalidate, toastSuccess, toastError } = useApiMutation();
  const [form, setForm] = useState({ code: "", name: "", description: "", durationHours: "1", laborCost: "0", price: "0", warrantyMonths: "0" });
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!form.code || !form.name) return toastError(t("required"));
    setSaving(true);
    try {
      await fetch("/api/services", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, durationHours: Number(form.durationHours), laborCost: Number(form.laborCost), price: Number(form.price), warrantyMonths: Number(form.warrantyMonths) }) });
      invalidate(["/api/services"]);
      toastSuccess();
      setForm({ code: "", name: "", description: "", durationHours: "1", laborCost: "0", price: "0", warrantyMonths: "0" });
      onOpenChange(false);
    } catch {
      toastError("Error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Settings2 className="h-5 w-5" />{t("addNew")} · {t("services")}</DialogTitle>
          <DialogDescription className="sr-only">{t("newRecord")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label className="text-xs">{t("category")} *</Label><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="OIL-CHG" /></div>
            <div className="space-y-1.5"><Label className="text-xs">{t("name")} *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          </div>
          <div className="space-y-1.5"><Label className="text-xs">{t("description")}</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} /></div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="space-y-1.5"><Label className="text-xs">{t("estimatedCompletion")}</Label><Input type="number" step="0.5" value={form.durationHours} onChange={(e) => setForm({ ...form, durationHours: e.target.value })} /></div>
            <div className="space-y-1.5"><Label className="text-xs">{t("labor")}</Label><Input type="number" step="0.001" value={form.laborCost} onChange={(e) => setForm({ ...form, laborCost: e.target.value })} /></div>
            <div className="space-y-1.5"><Label className="text-xs">{t("sellingPrice")}</Label><Input type="number" step="0.001" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></div>
            <div className="space-y-1.5"><Label className="text-xs">{t("warranties")} (m)</Label><Input type="number" value={form.warrantyMonths} onChange={(e) => setForm({ ...form, warrantyMonths: e.target.value })} /></div>
          </div>
          <div className="flex justify-end gap-2 pt-2"><Button variant="outline" onClick={() => onOpenChange(false)}>{t("cancel")}</Button><Button onClick={submit} disabled={saving}>{t("create")}</Button></div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
