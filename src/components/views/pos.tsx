"use client";

import { useT, formatMoney, formatDateTime } from "@/lib/format";
import { useApi, useApiMutation, EmptyState, LoadingRows } from "@/components/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useMemo, useState, useEffect } from "react";
import { ScanLine, Search, Plus, Minus, Trash2, ShoppingCart, CheckCircle2, Printer, X, Package, Receipt as ReceiptIcon, Banknote } from "lucide-react";

interface CartItem {
  partId: string;
  name: string;
  sku: string;
  unitPrice: number;
  quantity: number;
  available: number;
}

export function PosView() {
  const { t, lang } = useT();
  const { data: partsData, isLoading } = useApi<any>("/api/parts");
  const { data: custData } = useApi<any>("/api/customers");
  const { data: posData } = useApi<any>("/api/pos");
  const { data: settings } = useApi<any>("/api/settings");
  const { invalidate, toastSuccess, toastError } = useApiMutation();
  const taxPercent = settings?.taxPercent ?? 0;
  const currency = settings?.currency ?? "OMR";

  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerId, setCustomerId] = useState<string>("");
  const [discount, setDiscount] = useState<string>("");
  const [method, setMethod] = useState("cash");
  const [paidAmount, setPaidAmount] = useState<string>("");
  const [completing, setCompleting] = useState(false);
  const [receipt, setReceipt] = useState<any>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  const parts = (partsData?.items || []).filter((p: any) => p.quantity > 0);
  const categories = useMemo(() => {
    const set = new Map<string, string>();
    (partsData?.items || []).forEach((p: any) => {
      if (p.category?.name) set.set(p.category.id, p.category.name);
    });
    return [...set.entries()].map(([id, name]) => ({ id, name }));
  }, [partsData]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return parts.filter((p: any) => {
      if (categoryFilter !== "all" && p.categoryId !== categoryFilter) return false;
      if (!q) return true;
      return p.name.toLowerCase().includes(q) || (p.sku || "").toLowerCase().includes(q) || (p.barcode || "").toLowerCase().includes(q) || (p.nameAr || "").toLowerCase().includes(q);
    });
  }, [parts, query, categoryFilter]);

  const money = (n: number) => formatMoney(n, currency, lang);

  // Cart calculations
  const subtotal = cart.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
  const discountNum = Number(discount) || 0;
  const tax = Math.round(((subtotal - discountNum) * taxPercent) / 100 * 1000) / 1000;
  const grand = Math.round((subtotal - discountNum + tax) * 1000) / 1000;
  const paid = paidAmount ? Number(paidAmount) : grand;
  const change = Math.max(0, paid - grand);

  const addToCart = (p: any) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.partId === p.id);
      if (existing) {
        if (existing.quantity >= p.quantity) {
          toastError(t("insufficientStock").replace("{name}", p.name));
          return prev;
        }
        return prev.map((i) => (i.partId === p.id ? { ...i, quantity: i.quantity + 1 } : i));
      }
      return [...prev, { partId: p.id, name: p.name, sku: p.sku, unitPrice: p.sellingPrice, quantity: 1, available: p.quantity }];
    });
  };

  const updateQty = (partId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((i) => {
          if (i.partId !== partId) return i;
          const newQty = i.quantity + delta;
          if (newQty > i.available) {
            toastError(t("insufficientStock").replace("{name}", i.name));
            return i;
          }
          return { ...i, quantity: newQty };
        })
        .filter((i) => i.quantity > 0)
    );
  };

  const setQty = (partId: string, qty: number) => {
    setCart((prev) =>
      prev.map((i) => {
        if (i.partId !== partId) return i;
        const clamped = Math.max(1, Math.min(qty, i.available));
        return { ...i, quantity: clamped };
      })
    );
  };

  const removeFromCart = (partId: string) => setCart((prev) => prev.filter((i) => i.partId !== partId));

  // Barcode scan: Enter on the search input adds the first match
  const onScanKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && filtered.length === 1) {
      addToCart(filtered[0]);
      setQuery("");
    }
  };

  const completeSale = async () => {
    if (cart.length === 0) return toastError(t("cartEmpty"));
    setCompleting(true);
    try {
      const res = await fetch("/api/pos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cart.map((i) => ({ partId: i.partId, name: i.name, quantity: i.quantity, unitPrice: i.unitPrice, total: i.unitPrice * i.quantity })),
          customerId: customerId || null,
          discount: discountNum,
          method,
          paidAmount: paid,
          notes: "",
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        toastError(err.error || "Error");
        return;
      }
      const data = await res.json();
      setReceipt({ ...data.invoice, payment: data.payment, tenant: settings, customer: (custData?.items || []).find((c: any) => c.id === customerId) });
      setCart([]);
      setCustomerId("");
      setDiscount("");
      setPaidAmount("");
      setMethod("cash");
      setCheckoutOpen(false);
      invalidate(["/api/pos", "/api/parts", "/api/dashboard", "/api/invoices", "/api/payments"]);
      toastSuccess(t("saleCompleted"));
    } catch {
      toastError("Error");
    } finally {
      setCompleting(false);
    }
  };

  const newSale = () => {
    setReceipt(null);
    setCart([]);
    setDiscount("");
    setPaidAmount("");
    setCustomerId("");
  };

  // Receipt view
  if (receipt) {
    return <ReceiptView receipt={receipt} money={money} onClose={newSale} />;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold tracking-tight sm:text-2xl">
            <ScanLine className="h-6 w-6" />
            {t("posTitle")}
          </h1>
          <p className="text-sm text-muted-foreground">{t("posSubtitle")}</p>
        </div>
        {/* Today summary */}
        <div className="flex gap-2">
          <div className="rounded-lg border bg-muted/30 px-3 py-1.5">
            <p className="text-[10px] text-muted-foreground">{t("todaySales")}</p>
            <p className="text-sm font-bold tnum">{money(posData?.todayTotal ?? 0)}</p>
          </div>
          <div className="rounded-lg border bg-muted/30 px-3 py-1.5">
            <p className="text-[10px] text-muted-foreground">{t("items")}</p>
            <p className="text-sm font-bold tnum">{posData?.todayCount ?? 0}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
        {/* Left: Product grid */}
        <div className="space-y-3">
          <Card>
            <CardContent className="p-3">
              <div className="flex flex-col gap-2 sm:flex-row">
                <div className="relative flex-1">
                  <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={onScanKey}
                    placeholder={t("scanOrSearch")}
                    className="ps-9 h-10"
                    autoFocus
                  />
                </div>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-full sm:w-48 h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("allCategories")}</SelectItem>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Product grid */}
          <Card>
            <CardContent className="p-3">
              {isLoading ? (
                <LoadingRows rows={6} />
              ) : filtered.length === 0 ? (
                <EmptyState title={t("noResults")} icon={Package} />
              ) : (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 max-h-[calc(100vh-280px)] overflow-y-auto scroll-thin pe-1">
                  {filtered.map((p: any) => {
                    const inCart = cart.find((i) => i.partId === p.id);
                    const low = p.quantity <= p.minStock;
                    return (
                      <button
                        key={p.id}
                        onClick={() => addToCart(p)}
                        className="group relative flex flex-col rounded-lg border bg-card p-3 text-start transition-all hover:border-primary hover:shadow-md"
                      >
                        {/* Product icon */}
                        <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-md bg-muted text-muted-foreground">
                          <Package className="h-6 w-6" />
                        </div>
                        {/* Stock badge */}
                        {low ? (
                          <span className="absolute end-2 top-2 rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-semibold text-amber-800 dark:bg-amber-950 dark:text-amber-300 tnum">
                            {p.quantity}
                          </span>
                        ) : (
                          <span className="absolute end-2 top-2 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 tnum">
                            {p.quantity}
                          </span>
                        )}
                        {/* In-cart indicator */}
                        {inCart && (
                          <span className="absolute start-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          </span>
                        )}
                        <p className="line-clamp-2 text-xs font-medium leading-tight">{p.name}</p>
                        {p.nameAr && <p className="mt-0.5 line-clamp-1 text-[10px] text-muted-foreground" dir="rtl">{p.nameAr}</p>}
                        <p className="mt-1 text-[10px] text-muted-foreground font-mono">{p.sku}</p>
                        <p className="mt-1 text-sm font-bold tnum">{money(p.sellingPrice)}</p>
                      </button>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: Cart */}
        <Card className="flex flex-col lg:sticky lg:top-20 lg:max-h-[calc(100vh-110px)]">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between text-base">
              <span className="flex items-center gap-2">
                <ShoppingCart className="h-4 w-4" />
                {t("cart")}
              </span>
              <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground tnum">{cart.length}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col p-3 pt-0 min-h-0">
            {cart.length === 0 ? (
              <div className="flex flex-1 items-center justify-center py-8">
                <EmptyState title={t("cartEmpty")} hint={t("cartEmptyHint")} icon={ShoppingCart} />
              </div>
            ) : (
              <ScrollArea className="flex-1 -mx-1 px-1 max-h-[40vh] lg:max-h-none">
                <div className="space-y-1.5">
                  {cart.map((item) => (
                    <div key={item.partId} className="flex items-center gap-2 rounded-lg border p-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium">{item.name}</p>
                        <p className="truncate text-[10px] text-muted-foreground font-mono">{item.sku} · {money(item.unitPrice)}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => updateQty(item.partId, -1)}>
                          <Minus className="h-3 w-3" />
                        </Button>
                        <input
                          type="number"
                          min={1}
                          max={item.available}
                          value={item.quantity}
                          onChange={(e) => setQty(item.partId, Number(e.target.value))}
                          className="h-7 w-10 rounded border bg-background text-center text-xs tnum"
                        />
                        <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => updateQty(item.partId, 1)}>
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                      <span className="w-16 text-end text-xs font-bold tnum">{money(item.unitPrice * item.quantity)}</span>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => removeFromCart(item.partId)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}

            {/* Totals */}
            {cart.length > 0 && (
              <div className="mt-2 space-y-1.5 border-t pt-3">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">{t("subtotalPos")}</span>
                  <span className="tnum font-medium">{money(subtotal)}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground">{t("discount")}</span>
                  <Input
                    type="number"
                    step="0.001"
                    value={discount}
                    onChange={(e) => setDiscount(e.target.value)}
                    className="h-7 w-24 text-end tnum"
                    placeholder="0"
                  />
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">{t("tax")} ({taxPercent}%)</span>
                  <span className="tnum font-medium">{money(tax)}</span>
                </div>
                <div className="flex justify-between border-t pt-1.5 text-base font-bold">
                  <span>{t("grandTotal")}</span>
                  <span className="tnum text-primary">{money(grand)}</span>
                </div>

                <Button className="mt-2 w-full h-10" size="lg" onClick={() => setCheckoutOpen(true)}>
                  <Banknote className="h-4 w-4 me-2" />
                  {t("checkout")}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Checkout dialog */}
      <Dialog open={checkoutOpen} onOpenChange={setCheckoutOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Banknote className="h-5 w-5" />
              {t("checkout")}
            </DialogTitle>
            <DialogDescription>{cart.length} {t("items")} · {money(grand)}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">{t("selectCustomerOptional")}</Label>
              <Select value={customerId} onValueChange={setCustomerId}>
                <SelectTrigger><SelectValue placeholder={t("walkInCustomer")} /></SelectTrigger>
                <SelectContent>
                  {(custData?.items || []).map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>{c.name} · {c.mobile}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">{t("paymentMethodPos")}</Label>
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">{t("cash")}</SelectItem>
                  <SelectItem value="card">{t("card")}</SelectItem>
                  <SelectItem value="bank">{t("bankTransfer")}</SelectItem>
                  <SelectItem value="other">{t("other")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">{t("cashReceived")}</Label>
              <Input
                type="number"
                step="0.001"
                value={paidAmount}
                onChange={(e) => setPaidAmount(e.target.value)}
                placeholder={grand.toFixed(3)}
                className="tnum"
              />
              <div className="flex gap-1">
                {[grand, Math.ceil(grand / 5) * 5, Math.ceil(grand / 10) * 10, Math.ceil(grand / 50) * 50].map((amt, i) => (
                  <Button key={i} type="button" size="sm" variant="outline" className="flex-1 h-7 text-xs tnum" onClick={() => setPaidAmount(String(amt))}>
                    {money(amt)}
                  </Button>
                ))}
              </div>
            </div>

            <div className="rounded-lg bg-muted/50 p-3 space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">{t("grandTotal")}</span><span className="tnum font-bold">{money(grand)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">{t("cashReceived")}</span><span className="tnum">{money(paid)}</span></div>
              <div className="flex justify-between border-t pt-1 text-base font-bold">
                <span className={change > 0 ? "text-emerald-600" : ""}>{change > 0 ? t("change") : t("exactAmount")}</span>
                <span className={`tnum ${change > 0 ? "text-emerald-600" : ""}`}>{money(change)}</span>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCheckoutOpen(false)}>{t("cancel")}</Button>
              <Button onClick={completeSale} disabled={completing} className="flex-1">
                <CheckCircle2 className="h-4 w-4 me-1" />
                {completing ? t("loading") : t("completeSale")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Recent sales strip */}
      {posData?.recent?.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <ReceiptIcon className="h-4 w-4" />
              {t("lastSale")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 overflow-x-auto scroll-thin pb-1">
              {posData.recent.slice(0, 8).map((sale: any) => (
                <div key={sale.id} className="min-w-[140px] rounded-lg border p-2">
                  <p className="font-mono text-xs font-bold tnum">{sale.code}</p>
                  <p className="text-[10px] text-muted-foreground">{formatDateTime(sale.createdAt, lang)}</p>
                  <p className="mt-1 text-sm font-bold tnum">{money(sale.grandTotal)}</p>
                  <p className="text-[10px] text-muted-foreground">{sale.items?.length ?? 0} {t("items")}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Receipt view ────────────────────────────────────────────
function ReceiptView({ receipt, money, onClose }: { receipt: any; money: (n: number) => string; onClose: () => void }) {
  const { t, lang } = useT();
  const tn = receipt.tenant || {};
  const payment = receipt.payment || {};
  const change = Math.max(0, (payment.amount ?? 0) - receipt.grandTotal);

  return (
    <div className="mx-auto max-w-md space-y-4">
      <div className="flex items-center justify-between no-print">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-sm font-bold">{t("saleCompleted")}</p>
            <p className="text-xs text-muted-foreground">{receipt.code}</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={onClose}>
          <X className="h-4 w-4 me-1" />
          {t("newSale")}
        </Button>
      </div>

      {/* Printable receipt */}
      <Card className="print-area">
        <CardContent className="p-5">
          {/* Workshop header */}
          <div className="text-center border-b pb-3">
            <h2 className="text-lg font-bold">{tn.name || t("appName")}</h2>
            <p className="text-[11px] text-muted-foreground">{tn.address}</p>
            <p className="text-[11px] text-muted-foreground">{tn.phone} · {tn.email}</p>
            {tn.taxNumber && <p className="text-[11px] text-muted-foreground">{t("taxNumber")}: {tn.taxNumber}</p>}
          </div>

          {/* Sale info */}
          <div className="flex justify-between py-2 text-xs">
            <div>
              <p className="font-mono font-bold">{receipt.code}</p>
              <p className="text-muted-foreground">{formatDateTime(receipt.createdAt, lang)}</p>
            </div>
            <div className="text-end">
              <p className="font-semibold uppercase">{t("posInvoiceType")}</p>
              <p className="text-muted-foreground">{receipt.customer?.name || t("walkInCustomer")}</p>
            </div>
          </div>

          {/* Items */}
          <table className="w-full text-xs border-t pt-2 mt-2">
            <thead>
              <tr className="border-b text-muted-foreground">
                <th className="py-1 text-start font-medium">{t("item")}</th>
                <th className="py-1 text-center font-medium">{t("quantity")}</th>
                <th className="py-1 text-end font-medium">{t("total")}</th>
              </tr>
            </thead>
            <tbody>
              {receipt.items?.map((it: any) => (
                <tr key={it.id} className="border-b border-dashed">
                  <td className="py-1.5">
                    <p className="font-medium">{it.name}</p>
                    <p className="text-[10px] text-muted-foreground tnum">{money(it.unitPrice)} × {it.quantity}</p>
                  </td>
                  <td className="py-1.5 text-center tnum">{it.quantity}</td>
                  <td className="py-1.5 text-end tnum font-medium">{money(it.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div className="mt-2 space-y-0.5 text-xs">
            <div className="flex justify-between"><span className="text-muted-foreground">{t("subtotalPos")}</span><span className="tnum">{money(receipt.partsTotal)}</span></div>
            {receipt.discount > 0 && <div className="flex justify-between"><span className="text-muted-foreground">{t("discount")}</span><span className="tnum">- {money(receipt.discount)}</span></div>}
            <div className="flex justify-between"><span className="text-muted-foreground">{t("tax")}</span><span className="tnum">{money(receipt.tax)}</span></div>
            <div className="flex justify-between border-t pt-1 text-sm font-bold">
              <span>{t("grandTotal")}</span>
              <span className="tnum">{money(receipt.grandTotal)}</span>
            </div>
            <div className="flex justify-between"><span className="text-muted-foreground">{t("cashReceived")} ({t(payment.method) || payment.method})</span><span className="tnum">{money(payment.amount)}</span></div>
            {change > 0 && <div className="flex justify-between text-emerald-600 font-bold"><span>{t("change")}</span><span className="tnum">{money(change)}</span></div>}
          </div>

          {/* Footer */}
          <div className="mt-4 border-t pt-3 text-center">
            <p className="text-xs font-medium">{t("thankYou")}</p>
            {tn.invoiceFooter && <p className="mt-1 text-[10px] text-muted-foreground">{tn.invoiceFooter}</p>}
            <p className="mt-2 text-[10px] text-muted-foreground">{t("soldBy")}: Khalid Al-Rashidi</p>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-2 no-print">
        <Button variant="outline" className="flex-1" onClick={() => window.print()}>
          <Printer className="h-4 w-4 me-2" />
          {t("printReceipt")}
        </Button>
        <Button className="flex-1" onClick={onClose}>
          <Plus className="h-4 w-4 me-2" />
          {t("newSale")}
        </Button>
      </div>
    </div>
  );
}
