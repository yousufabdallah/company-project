"use client";

import { useT, formatMoney, formatNumber } from "@/lib/format";
import { useApi, useApiMutation, EmptyState, LoadingRows, PageHeader } from "@/components/shared";
import { usePermissions } from "@/lib/use-permissions";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useApp } from "@/lib/store";
import { useState } from "react";
import { Package, Search, Plus, AlertTriangle, PackageSearch, Pencil, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

export function InventoryView() {
  const { t, lang } = useT();
  const { data, isLoading } = useApi<any>("/api/parts");
  const setQuickCreate = useApp((s) => s.setQuickCreate);
  const { canCreate, canEdit, canDelete } = usePermissions();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");
  const [editing, setEditing] = useState<any>(null);
  const money = (n: number) => formatMoney(n, "OMR", lang);

  const all = data?.items || [];
  const items = all.filter((p: any) => {
    if (filter === "low" && p.quantity > p.minStock) return false;
    if (filter === "out" && p.quantity > 0) return false;
    if (q && !p.name.toLowerCase().includes(q.toLowerCase()) && !p.sku.toLowerCase().includes(q.toLowerCase()) && !(p.barcode || "").includes(q)) return false;
    return true;
  });

  const stockValue = all.reduce((s: number, p: any) => s + p.costPrice * p.quantity, 0);
  const lowCount = all.filter((p: any) => p.quantity <= p.minStock).length;

  return (
    <div>
      <PageHeader title={t("inventory")} subtitle={`${all.length} ${t("inventory").toLowerCase()} · ${t("stockValue")}: ${money(stockValue)}`}>
        {canCreate("inventory") && <Button size="sm" onClick={() => setQuickCreate("part")}><Plus className="h-4 w-4 me-1" />{t("addNew")}</Button>}
      </PageHeader>

      {lowCount > 0 && (
        <div className="mb-3 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
          <AlertTriangle className="h-4 w-4" />
          <span>{lowCount} {t("lowStockParts").toLowerCase()} — {t("waitingParts")}.</span>
        </div>
      )}

      <Card>
        <CardContent className="p-3 sm:p-4">
          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`${t("sku")}, ${t("barcode")}, ${t("name")}...`} className="ps-9" />
            </div>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-full sm:w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("all")}</SelectItem>
                <SelectItem value="low">{t("lowStock")}</SelectItem>
                <SelectItem value="out">{t("outOfStock")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? <LoadingRows /> : items.length === 0 ? <EmptyState title={t("noResults")} icon={PackageSearch} /> : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("sku")}</TableHead>
                    <TableHead>{t("name")}</TableHead>
                    <TableHead className="hidden md:table-cell">{t("brand")}</TableHead>
                    <TableHead className="hidden lg:table-cell">{t("supplier")}</TableHead>
                    <TableHead className="hidden sm:table-cell">{t("location")}</TableHead>
                    <TableHead className="text-end">{t("stockQty")}</TableHead>
                    <TableHead className="text-end hidden lg:table-cell">{t("costPrice")}</TableHead>
                    <TableHead className="text-end">{t("sellingPrice")}</TableHead>
                    {(canEdit("inventory") || canDelete("inventory")) && <TableHead className="text-end">{t("actions")}</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((p: any) => {
                    const low = p.quantity <= p.minStock;
                    const out = p.quantity === 0;
                    return (
                      <TableRow key={p.id} className="hover:bg-muted/50">
                        <TableCell className="font-mono text-xs tnum">{p.sku}</TableCell>
                        <TableCell>
                          <p className="text-sm font-medium">{p.name}</p>
                          {p.nameAr && <p className="text-xs text-muted-foreground" dir="rtl">{p.nameAr}</p>}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-xs text-muted-foreground">{p.brand || "—"}</TableCell>
                        <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">{p.supplier?.name || "—"}</TableCell>
                        <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">{p.location || "—"}</TableCell>
                        <TableCell className="text-end">
                          <span className={`tnum font-bold ${out ? "text-red-600" : low ? "text-amber-600" : "text-foreground"}`}>{formatNumber(p.quantity, lang)}</span>
                          <span className="block text-[10px] text-muted-foreground">/ {p.minStock}</span>
                        </TableCell>
                        <TableCell className="text-end hidden lg:table-cell tnum text-muted-foreground">{money(p.costPrice)}</TableCell>
                        <TableCell className="text-end tnum font-medium">{money(p.sellingPrice)}</TableCell>
                        {(canEdit("inventory") || canDelete("inventory")) && (
                          <TableCell className="text-end">
                            <div className="flex items-center justify-end gap-1">
                              {canEdit("inventory") && (
                                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditing(p)}>
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                              )}
                              {canDelete("inventory") && (
                                <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={async () => {
                                  if (!confirm(t("confirmDelete"))) return;
                                  try {
                                    const res = await fetch(`/api/parts?id=${p.id}`, { method: "DELETE" });
                                    if (!res.ok) {
                                      const err = await res.json();
                                      toastError(err.error === "part_in_use" ? `${t("inventory")} used in ${err.count} job cards` : "Error");
                                      return;
                                    }
                                    toastSuccess(t("saved"));
                                    window.location.reload();
                                  } catch { toastError("Error"); }
                                }}>
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              )}
                            </div>
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

      {/* Edit dialog */}
      {editing && (
        <EditPartDialog part={editing} onClose={() => setEditing(null)} />
      )}
    </div>
  );
}

// ─── Edit Part Dialog ──────────────────────────────────────────
function EditPartDialog({ part, onClose }: { part: any; onClose: () => void }) {
  const { t, lang } = useT();
  const { invalidate, toastSuccess, toastError } = useApiMutation();
  const { data: supData } = useApi<any>("/api/suppliers");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: part.name || "",
    nameAr: part.nameAr || "",
    sku: part.sku || "",
    barcode: part.barcode || "",
    brand: part.brand || "",
    supplierId: part.supplierId || "",
    costPrice: String(part.costPrice ?? 0),
    sellingPrice: String(part.sellingPrice ?? 0),
    quantity: String(part.quantity ?? 0),
    minStock: String(part.minStock ?? 5),
    location: part.location || "",
    warrantyMonths: String(part.warrantyMonths ?? 0),
  });

  const save = async () => {
    if (!form.name.trim()) return toastError(t("required"));
    setSaving(true);
    try {
      const res = await fetch("/api/parts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: part.id,
          name: form.name,
          nameAr: form.nameAr || null,
          sku: form.sku,
          barcode: form.barcode || null,
          brand: form.brand || null,
          supplierId: form.supplierId || null,
          costPrice: Number(form.costPrice) || 0,
          sellingPrice: Number(form.sellingPrice) || 0,
          quantity: Number(form.quantity) || 0,
          minStock: Number(form.minStock) || 5,
          location: form.location || null,
          warrantyMonths: Number(form.warrantyMonths) || 0,
        }),
      });
      if (!res.ok) {
        toastError("Error");
        return;
      }
      invalidate(["/api/parts", "/api/dashboard"]);
      toastSuccess(t("saved"));
      onClose();
    } catch {
      toastError("Error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto scroll-thin">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Pencil className="h-5 w-5" />{t("editPlan") || "Edit"}: {part.name}</DialogTitle>
          <DialogDescription className="sr-only">{t("inventory")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">{t("name")} *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t("sku")} *</Label>
              <Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">الاسم العربي</Label>
              <Input value={form.nameAr} onChange={(e) => setForm({ ...form, nameAr: e.target.value })} dir="rtl" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t("barcode")}</Label>
              <Input value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t("brand")}</Label>
              <Input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t("location")}</Label>
              <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
            </div>
          </div>

          {/* Supplier */}
          <div className="space-y-1.5">
            <Label className="text-xs">{t("supplier")}</Label>
            <Select value={form.supplierId || "none"} onValueChange={(v) => setForm({ ...form, supplierId: v === "none" ? "" : v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— {t("none")} —</SelectItem>
                {(supData?.items || []).map((s: any) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Prices + Stock */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="space-y-1.5">
              <Label className="text-xs">{t("costPrice")}</Label>
              <Input type="number" step="0.001" value={form.costPrice} onChange={(e) => setForm({ ...form, costPrice: e.target.value })} className="tnum" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t("sellingPrice")}</Label>
              <Input type="number" step="0.001" value={form.sellingPrice} onChange={(e) => setForm({ ...form, sellingPrice: e.target.value })} className="tnum" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t("stockQty")}</Label>
              <Input type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} className="tnum" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t("minStock")}</Label>
              <Input type="number" value={form.minStock} onChange={(e) => setForm({ ...form, minStock: e.target.value })} className="tnum" />
            </div>
          </div>

          {/* Stock change note */}
          {Number(form.quantity) !== part.quantity && (
            <div className="flex items-center gap-2 rounded-lg border border-sky-200 bg-sky-50 p-2 text-xs text-sky-700 dark:border-sky-900 dark:bg-sky-950/30 dark:text-sky-300">
              <Package className="h-3.5 w-3.5 shrink-0" />
              <span>Stock will change from {part.quantity} to {form.quantity} ({Number(form.quantity) - part.quantity > 0 ? "+" : ""}{Number(form.quantity) - part.quantity}). A stock movement will be recorded.</span>
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs">{t("warranties")}</Label>
            <Input type="number" value={form.warrantyMonths} onChange={(e) => setForm({ ...form, warrantyMonths: e.target.value })} className="tnum" />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>{t("cancel")}</Button>
            <Button onClick={save} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin me-1" />}
              {t("save")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
