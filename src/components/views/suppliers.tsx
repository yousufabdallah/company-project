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
import { Truck, Plus, Phone, Mail, MapPin } from "lucide-react";

export function SuppliersView() {
  const { t, lang } = useT();
  const { data, isLoading } = useApi<any>("/api/suppliers");
  const [creating, setCreating] = useState(false);
  const money = (n: number) => formatMoney(n, "OMR", lang);

  return (
    <div>
      <PageHeader title={t("suppliers")} subtitle={`${data?.items?.length ?? 0} ${t("suppliers").toLowerCase()}`}>
        <Button size="sm" onClick={() => setCreating(true)}><Plus className="h-4 w-4 me-1" />{t("addNew")}</Button>
      </PageHeader>

      <Card>
        <CardContent className="p-3 sm:p-4">
          {isLoading ? <LoadingRows /> : (data?.items || []).length === 0 ? <EmptyState title={t("noData")} icon={Truck} /> : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("supplierName")}</TableHead>
                    <TableHead className="hidden md:table-cell">{t("company")}</TableHead>
                    <TableHead className="hidden sm:table-cell">{t("phone")}</TableHead>
                    <TableHead className="hidden lg:table-cell">{t("paymentTerms")}</TableHead>
                    <TableHead className="text-end">{t("outstandingBalance")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(data?.items || []).map((s: any) => (
                    <TableRow key={s.id}>
                      <TableCell>
                        <p className="text-sm font-medium">{s.name}</p>
                        <p className="text-xs text-muted-foreground">{s.email || "—"}</p>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-xs text-muted-foreground">{s.company || "—"}</TableCell>
                      <TableCell className="hidden sm:table-cell text-xs">{s.phone || "—"}</TableCell>
                      <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">{s.paymentTerms || "—"}</TableCell>
                      <TableCell className={`text-end tnum font-medium ${s.balance > 0 ? "text-red-600" : "text-muted-foreground"}`}>{money(s.balance)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <SupplierCreateDialog open={creating} onOpenChange={setCreating} />
    </div>
  );
}

function SupplierCreateDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { t } = useT();
  const { invalidate, toastSuccess, toastError } = useApiMutation();
  const [form, setForm] = useState({ name: "", company: "", phone: "", whatsapp: "", email: "", address: "", taxNumber: "", paymentTerms: "" });
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!form.name) return toastError(t("required"));
    setSaving(true);
    try {
      await fetch("/api/suppliers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      invalidate(["/api/suppliers"]);
      toastSuccess();
      setForm({ name: "", company: "", phone: "", whatsapp: "", email: "", address: "", taxNumber: "", paymentTerms: "" });
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
          <DialogTitle className="flex items-center gap-2"><Truck className="h-5 w-5" />{t("addNew")} · {t("suppliers")}</DialogTitle>
          <DialogDescription className="sr-only">{t("newRecord")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label className="text-xs">{t("supplierName")} *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="space-y-1.5"><Label className="text-xs">{t("company")}</Label><Input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} /></div>
            <div className="space-y-1.5"><Label className="text-xs">{t("phone")}</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            <div className="space-y-1.5"><Label className="text-xs">{t("whatsapp")}</Label><Input value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} /></div>
            <div className="space-y-1.5"><Label className="text-xs">{t("email")}</Label><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div className="space-y-1.5"><Label className="text-xs">{t("taxNumber")}</Label><Input value={form.taxNumber} onChange={(e) => setForm({ ...form, taxNumber: e.target.value })} /></div>
          </div>
          <div className="space-y-1.5"><Label className="text-xs">{t("address")}</Label><Textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} rows={2} /></div>
          <div className="space-y-1.5"><Label className="text-xs">{t("paymentTerms")}</Label><Input value={form.paymentTerms} onChange={(e) => setForm({ ...form, paymentTerms: e.target.value })} placeholder="Net 30" /></div>
          <div className="flex justify-end gap-2 pt-2"><Button variant="outline" onClick={() => onOpenChange(false)}>{t("cancel")}</Button><Button onClick={submit} disabled={saving}>{t("create")}</Button></div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
