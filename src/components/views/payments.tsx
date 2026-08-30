"use client";

import { useT, formatMoney, formatDate, formatDateTime } from "@/lib/format";
import { useApi, EmptyState, LoadingRows, PageHeader } from "@/components/shared";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useApp } from "@/lib/store";
import { useState } from "react";
import { Wallet, Search, Printer } from "lucide-react";

export function PaymentsView() {
  const { t, lang } = useT();
  const { data, isLoading } = useApi<any>("/api/payments");
  const setQuickCreate = useApp((s) => s.setQuickCreate);
  const [q, setQ] = useState("");
  const [methodFilter, setMethodFilter] = useState("all");
  const money = (n: number) => formatMoney(n, "OMR", lang);

  const items = (data?.items || []).filter((p: any) => {
    if (methodFilter !== "all" && p.method !== methodFilter) return false;
    if (q && !p.customer?.name.toLowerCase().includes(q.toLowerCase()) && !(p.reference || "").toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  const total = items.reduce((s: number, p: any) => s + p.amount, 0);

  return (
    <div>
      <PageHeader title={t("payments")} subtitle={`${items.length} · ${money(total)}`}>
        <Button size="sm" onClick={() => setQuickCreate("payment")}><Wallet className="h-4 w-4 me-1" />{t("receivePayment")}</Button>
      </PageHeader>

      <Card>
        <CardContent className="p-3 sm:p-4">
          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("search")} className="ps-9" />
            </div>
            <Select value={methodFilter} onValueChange={setMethodFilter}>
              <SelectTrigger className="w-full sm:w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("all")}</SelectItem>
                <SelectItem value="cash">{t("cash")}</SelectItem>
                <SelectItem value="card">{t("card")}</SelectItem>
                <SelectItem value="bank">{t("bankTransfer")}</SelectItem>
                <SelectItem value="other">{t("other")}</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" variant="outline" onClick={() => window.print()} className="no-print"><Printer className="h-4 w-4 me-1" />{t("print")}</Button>
          </div>

          {isLoading ? <LoadingRows /> : items.length === 0 ? <EmptyState title={t("noResults")} icon={Wallet} /> : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("date")}</TableHead>
                    <TableHead>{t("customer")}</TableHead>
                    <TableHead className="hidden md:table-cell">{t("invoiceNumber")}</TableHead>
                    <TableHead className="hidden sm:table-cell">{t("paymentMethod")}</TableHead>
                    <TableHead className="hidden lg:table-cell">{t("reference")}</TableHead>
                    <TableHead className="text-end">{t("amount")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((p: any) => (
                    <TableRow key={p.id}>
                      <TableCell className="text-xs text-muted-foreground">{formatDateTime(p.date, lang)}</TableCell>
                      <TableCell className="text-sm font-medium">{p.customer?.name}</TableCell>
                      <TableCell className="hidden md:table-cell text-xs font-mono tnum">{p.invoice?.code || "—"}</TableCell>
                      <TableCell className="hidden sm:table-cell text-xs capitalize">{t(p.method) || p.method}</TableCell>
                      <TableCell className="hidden lg:table-cell text-xs font-mono">{p.reference || "—"}</TableCell>
                      <TableCell className="text-end font-semibold text-emerald-600 tnum">{money(p.amount)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
