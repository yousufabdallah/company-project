"use client";

import { useT, formatMoney, formatDate } from "@/lib/format";
import { useApi, StatusBadge, EmptyState, LoadingRows, PageHeader, useApiMutation } from "@/components/shared";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useState } from "react";
import { ShoppingCart, Plus, Trash2, Package } from "lucide-react";

export function PurchasesView() {
  const { t, lang } = useT();
  const { data, isLoading } = useApi<any>("/api/purchases");
  const [creating, setCreating] = useState(false);
  const money = (n: number) => formatMoney(n, "OMR", lang);

  return (
    <div>
      <PageHeader title={t("purchases")} subtitle={`${data?.items?.length ?? 0} ${t("purchases").toLowerCase()}`}>
        <Button size="sm" onClick={() => setCreating(true)}><Plus className="h-4 w-4 me-1" />{t("addNew")}</Button>
      </PageHeader>

      <Card>
        <CardContent className="p-3 sm:p-4">
          {isLoading ? <LoadingRows /> : (data?.items || []).length === 0 ? <EmptyState title={t("noData")} icon={ShoppingCart} /> : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("invoiceNumber")}</TableHead>
                    <TableHead>{t("supplier")}</TableHead>
                    <TableHead className="hidden md:table-cell">{t("warehouse")}</TableHead>
                    <TableHead className="hidden sm:table-cell">{t("date")}</TableHead>
                    <TableHead>{t("status")}</TableHead>
                    <TableHead className="text-end">{t("total")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(data?.items || []).map((p: any) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-mono text-xs font-bold tnum">{p.code}</TableCell>
                      <TableCell className="text-sm font-medium">{p.supplier?.name}</TableCell>
                      <TableCell className="hidden md:table-cell text-xs text-muted-foreground">{p.warehouse?.name || "—"}</TableCell>
                      <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">{formatDate(p.date, lang)}</TableCell>
                      <TableCell><StatusBadge status={p.status === "paid" ? "paid" : p.status === "received" ? "approved" : "pending"} label={t("status_" + p.status) || p.status} /></TableCell>
                      <TableCell className="text-end font-semibold tnum">{money(p.total)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <PurchaseCreateDialog open={creating} onOpenChange={setCreating} />
    </div>
  );
}

function PurchaseCreateDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { t, lang } = useT();
  const { data: sup } = useApi<any>("/api/suppliers");
  const { data: wh } = useApi<any>("/api/dashboard");
  const { data: parts } = useApi<any>("/api/parts");
  const { invalidate, toastSuccess, toastError } = useApiMutation();
  const [supplierId, setSupplierId] = useState("");
  const [items, setItems] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const money = (n: number) => formatMoney(n, "OMR", lang);

  const addPart = (pid: string) => {
    const p = (parts?.items || []).find((x: any) => x.id === pid);
    if (p) setItems([...items, { partId: p.id, name: p.name, quantity: 1, unitCost: p.costPrice }]);
  };
  const total = items.reduce((s, i) => s + i.quantity * i.unitCost, 0);

  const submit = async () => {
    if (!supplierId || items.length === 0) return toastError(t("required"));
    setSaving(true);
    try {
      await fetch("/api/purchases", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ supplierId, items, status: "received" }) });
      invalidate(["/api/purchases", "/api/parts", "/api/dashboard"]);
      toastSuccess();
      setSupplierId(""); setItems([]);
      onOpenChange(false);
    } catch {
      toastError("Error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[92vh] overflow-y-auto scroll-thin">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><ShoppingCart className="h-5 w-5" />{t("addNew")} · {t("purchases")}</DialogTitle>
          <DialogDescription>{t("supplier")} → {t("parts")} → {t("inventory")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5"><Label className="text-xs">{t("supplier")} *</Label>
            <Select value={supplierId} onValueChange={setSupplierId}>
              <SelectTrigger><SelectValue placeholder={t("supplier")} /></SelectTrigger>
              <SelectContent>{(sup?.items || []).map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5"><Label className="text-xs">{t("parts")}</Label>
            <Select onValueChange={addPart}>
              <SelectTrigger><SelectValue placeholder={t("addNew")} /></SelectTrigger>
              <SelectContent>{(parts?.items || []).map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name} · {p.sku}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader><TableRow><TableHead className="text-xs">{t("name")}</TableHead><TableHead className="text-xs text-end">{t("quantity")}</TableHead><TableHead className="text-xs text-end">{t("costPrice")}</TableHead><TableHead className="text-xs text-end">{t("total")}</TableHead><TableHead /></TableRow></TableHeader>
              <TableBody>
                {items.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center text-xs text-muted-foreground py-6">{t("noData")}</TableCell></TableRow>
                ) : items.map((it, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-xs font-medium">{it.name}</TableCell>
                    <TableCell className="text-end"><Input type="number" min={1} value={it.quantity} onChange={(e) => setItems(items.map((x, idx) => idx === i ? { ...x, quantity: Math.max(1, Number(e.target.value)) } : x))} className="h-7 w-16 tnum" /></TableCell>
                    <TableCell className="text-end"><Input type="number" step="0.001" value={it.unitCost} onChange={(e) => setItems(items.map((x, idx) => idx === i ? { ...x, unitCost: Number(e.target.value) } : x))} className="h-7 w-20 tnum" /></TableCell>
                    <TableCell className="text-end tnum font-medium">{money(it.quantity * it.unitCost)}</TableCell>
                    <TableCell><Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setItems(items.filter((_, idx) => idx !== i))}><Trash2 className="h-3.5 w-3.5" /></Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
            <span className="text-sm font-medium">{t("grandTotal")}</span>
            <span className="text-lg font-bold tnum">{money(total)}</span>
          </div>

          <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => onOpenChange(false)}>{t("cancel")}</Button><Button onClick={submit} disabled={saving}><Package className="h-4 w-4 me-1" />{t("create")}</Button></div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
