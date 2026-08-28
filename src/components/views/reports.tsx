"use client";

import { useT, formatMoney, formatNumber } from "@/lib/format";
import { useApi, LoadingRows, PageHeader, EmptyState } from "@/components/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { BarChart3, Printer, Wallet, TrendingUp, Users, Car, Package } from "lucide-react";

const PIE_COLORS = ["#0ea5e9", "#f59e0b", "#10b981", "#8b5cf6", "#ef4444", "#14b8a6", "#f43f5e", "#6366f1"];

export function ReportsView() {
  const { t, lang } = useT();
  const { data, isLoading } = useApi<any>("/api/reports");
  const money = (n: number) => formatMoney(n, "OMR", lang);

  if (isLoading || !data) {
    return <div><PageHeader title={t("reports")} /><LoadingRows rows={8} /></div>;
  }
  const s = data.summary;

  return (
    <div>
      <PageHeader title={t("reports")} subtitle={t("reports")}>
        <Button size="sm" variant="outline" onClick={() => window.print()} className="no-print"><Printer className="h-4 w-4 me-1" />{t("print")}</Button>
      </PageHeader>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 mb-4">
        <Card><CardContent className="p-4"><div className="flex items-center gap-2 text-muted-foreground text-xs"><Wallet className="h-3.5 w-3.5" />{t("revenue")}</div><p className="mt-1 text-xl font-bold text-emerald-600 tnum">{money(s.revenue)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-2 text-muted-foreground text-xs"><TrendingDown2 />{t("expensesTotal")}</div><p className="mt-1 text-xl font-bold text-red-500 tnum">{money(s.expenses)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-2 text-muted-foreground text-xs"><TrendingUp className="h-3.5 w-3.5" />{t("netProfit")}</div><p className={`mt-1 text-xl font-bold tnum ${s.netProfit >= 0 ? "text-emerald-600" : "text-red-500"}`}>{money(s.netProfit)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-2 text-muted-foreground text-xs"><Package className="h-3.5 w-3.5" />{t("stockValue")}</div><p className="mt-1 text-xl font-bold tnum">{money(s.stockValue)}</p></CardContent></Card>
      </div>

      <Tabs defaultValue="sales">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 mb-4">
          <TabsTrigger value="sales">{t("revenue")}</TabsTrigger>
          <TabsTrigger value="customers">{t("customers")}</TabsTrigger>
          <TabsTrigger value="inventory">{t("inventory")}</TabsTrigger>
          <TabsTrigger value="financial">{t("groupFinance")}</TabsTrigger>
        </TabsList>

        {/* Sales */}
        <TabsContent value="sales" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-base"><TrendingUp className="h-4 w-4" />{t("salesByTechnician")}</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={data.salesByTechnician}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" width={50} />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                    <Bar dataKey="total" fill="#0ea5e9" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-base"><Car className="h-4 w-4" />{t("mostServicedVehicles")}</CardTitle></CardHeader>
              <CardContent>
                <div className="overflow-x-auto rounded-lg border">
                  <Table>
                    <TableHeader><TableRow><TableHead className="text-xs">{t("vehicle")}</TableHead><TableHead className="text-xs text-end">{t("jobCards")}</TableHead><TableHead className="text-xs text-end">{t("totalSpent")}</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {data.mostServicedVehicles.map((v: any) => (
                        <TableRow key={v.id}><TableCell className="text-xs font-medium">{v.label}</TableCell><TableCell className="text-xs text-end tnum">{v.count}</TableCell><TableCell className="text-xs text-end tnum font-medium">{money(v.spent)}</TableCell></TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Customers */}
        <TabsContent value="customers" className="space-y-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-base"><Users className="h-4 w-4" />{t("topCustomers")}</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-lg border">
                <Table>
                  <TableHeader><TableRow><TableHead className="text-xs">{t("customerName")}</TableHead><TableHead className="text-xs text-end">{t("totalSpent")}</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {data.topCustomers.map((c: any) => (
                      <TableRow key={c.id}><TableCell className="text-sm font-medium">{c.name}</TableCell><TableCell className="text-sm text-end tnum font-semibold text-emerald-600">{money(c.total)}</TableCell></TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Inventory */}
        <TabsContent value="inventory" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">{t("fastMovingParts")}</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={data.fastMovingParts} layout="vertical" margin={{ left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" width={110} />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                    <Bar dataKey="moved" fill="#10b981" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">{t("slowMovingParts")}</CardTitle></CardHeader>
              <CardContent>
                {data.slowMovingParts.length === 0 ? <EmptyState title={t("noData")} /> : (
                  <div className="space-y-1.5 max-h-56 overflow-y-auto scroll-thin">
                    {data.slowMovingParts.map((p: any, i: number) => (
                      <div key={i} className="flex items-center justify-between rounded border p-2 text-xs"><span className="truncate">{p.name}</span><span className="text-muted-foreground">0</span></div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          {data.lowStock.length > 0 && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base text-amber-600">{t("lowStockParts")} ({data.lowStock.length})</CardTitle></CardHeader>
              <CardContent>
                <div className="overflow-x-auto rounded-lg border">
                  <Table>
                    <TableHeader><TableRow><TableHead className="text-xs">{t("name")}</TableHead><TableHead className="text-xs">{t("sku")}</TableHead><TableHead className="text-xs text-end">{t("stockQty")}</TableHead><TableHead className="text-xs text-end">{t("minStock")}</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {data.lowStock.map((p: any) => (
                        <TableRow key={p.id}><TableCell className="text-xs font-medium">{p.name}</TableCell><TableCell className="text-xs font-mono">{p.sku}</TableCell><TableCell className="text-xs text-end tnum text-red-600 font-bold">{p.quantity}</TableCell><TableCell className="text-xs text-end tnum text-muted-foreground">{p.minStock}</TableCell></TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Financial */}
        <TabsContent value="financial" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">{t("expensesTotal")} — {t("expenseCategory")}</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie data={data.expensesByCategory} dataKey="total" nameKey="category" cx="50%" cy="50%" outerRadius={80} label={(e: any) => t(e.category)}>
                      {data.expensesByCategory.map((_: any, i: number) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} formatter={(v: any) => money(Number(v))} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">{t("groupFinance")}</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Stat label={t("revenue")} value={money(s.revenue)} tone="ok" />
                  <Stat label={t("expensesTotal")} value={money(s.expenses)} tone="danger" />
                  <Stat label={t("grossProfit")} value={money(s.grossProfit)} tone={s.grossProfit >= 0 ? "ok" : "danger"} />
                  <Stat label={t("netProfit")} value={money(s.netProfit)} tone={s.netProfit >= 0 ? "ok" : "danger"} />
                  <Stat label={t("stockValue")} value={money(s.stockValue)} />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function TrendingDown2() {
  return <span className="inline-block h-3.5 w-3.5 rounded-sm bg-red-500/20" />;
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "ok" | "danger" }) {
  return (
    <div className="flex items-center justify-between rounded-lg border p-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={`text-sm font-bold tnum ${tone === "ok" ? "text-emerald-600" : tone === "danger" ? "text-red-500" : ""}`}>{value}</span>
    </div>
  );
}
