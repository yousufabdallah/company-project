"use client";

import { useT, formatMoney, formatNumber } from "@/lib/format";
import { useApi, EmptyState, LoadingRows, PageHeader } from "@/components/shared";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useApp } from "@/lib/store";
import { useState } from "react";
import { Package, Search, Plus, AlertTriangle, PackageSearch } from "lucide-react";

export function InventoryView() {
  const { t, lang } = useT();
  const { data, isLoading } = useApi<any>("/api/parts");
  const setQuickCreate = useApp((s) => s.setQuickCreate);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");
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
        <Button size="sm" onClick={() => setQuickCreate("part")}><Plus className="h-4 w-4 me-1" />{t("addNew")}</Button>
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
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((p: any) => {
                    const low = p.quantity <= p.minStock;
                    const out = p.quantity === 0;
                    return (
                      <TableRow key={p.id}>
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
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
