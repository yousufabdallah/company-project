"use client";

import { useT, formatMoney, formatNumber, formatDate, formatDateTime } from "@/lib/format";
import { useApi, LoadingRows, PageHeader, EmptyState } from "@/components/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { BarChart3, Printer, Wallet, TrendingUp, Users, Car, Package, Wrench, Calendar } from "lucide-react";
import { useMemo, useState } from "react";

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
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-5 mb-4">
          <TabsTrigger value="sales">{t("revenue")}</TabsTrigger>
          <TabsTrigger value="services">{t("servicesReport")}</TabsTrigger>
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

        {/* Services Report */}
        <TabsContent value="services" className="space-y-4">
          <ServicesReport />
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

// ─── Services Report (filterable by date range + printable) ────────
function ServicesReport() {
  const { t, lang } = useT();
  const [period, setPeriod] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [trigger, setTrigger] = useState(0); // bump to refetch

  // Compute from/to based on period shortcut
  const resolvedDates = useMemo(() => {
    if (period === "custom") return { from: from || null, to: to || null };
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    switch (period) {
      case "7days": {
        const d = new Date(startOfDay);
        d.setDate(d.getDate() - 6);
        return { from: d.toISOString().slice(0, 10), to: null };
      }
      case "30days": {
        const d = new Date(startOfDay);
        d.setDate(d.getDate() - 29);
        return { from: d.toISOString().slice(0, 10), to: null };
      }
      case "90days": {
        const d = new Date(startOfDay);
        d.setDate(d.getDate() - 89);
        return { from: d.toISOString().slice(0, 10), to: null };
      }
      case "month":
        return { from: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10), to: null };
      case "year":
        return { from: new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10), to: null };
      default:
        return { from: null, to: null };
    }
  }, [period, from, to, trigger]);

  const apiUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (resolvedDates.from) params.set("from", resolvedDates.from);
    if (resolvedDates.to) params.set("to", resolvedDates.to);
    const q = params.toString();
    return `/api/reports/services${q ? "?" + q : ""}`;
  }, [resolvedDates]);

  const { data, isLoading } = useApi<any>(apiUrl);
  const money = (n: number) => formatMoney(n, "OMR", lang);

  const apply = () => setTrigger((x) => x + 1);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base"><Wrench className="h-4 w-4" />{t("servicesReport")}</CardTitle>
        <p className="text-xs text-muted-foreground">{t("servicesReportDesc")}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Print CSS so the report fills A4 when printed */}
        <style dangerouslySetInnerHTML={{ __html: `
          @page { size: A4; margin: 10mm; }
          @media print {
            html, body { background: #fff !important; margin: 0 !important; padding: 0 !important; font-size: 11px !important; color: #000 !important; }
            body > * { display: none !important; }
            #services-report-print { display: block !important; position: static !important; }
            .no-print { display: none !important; }
            table, tr, td, th { page-break-inside: avoid; }
            thead { display: table-header-group; }
            h1, h2, h3 { color: #000 !important; }
          }
        `}} />

        {/* Filters (no-print) */}
        <div className="no-print grid gap-3 sm:grid-cols-4">
          <div className="space-y-1.5">
            <Label className="text-xs">{t("reportPeriod")}</Label>
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("allTime")}</SelectItem>
                <SelectItem value="7days">{t("last7days")}</SelectItem>
                <SelectItem value="30days">{t("last30days")}</SelectItem>
                <SelectItem value="90days">{t("last90days")}</SelectItem>
                <SelectItem value="month">{t("thisMonthPeriod")}</SelectItem>
                <SelectItem value="year">{t("thisYearPeriod")}</SelectItem>
                <SelectItem value="custom">{t("reportPeriod")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {period === "custom" && (
            <>
              <div className="space-y-1.5">
                <Label className="text-xs">{t("dateFrom")}</Label>
                <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">{t("dateTo")}</Label>
                <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
              </div>
              <div className="flex items-end">
                <Button size="sm" className="w-full" onClick={apply}>{t("apply")}</Button>
              </div>
            </>
          )}
        </div>

        {/* Printable report */}
        <div id="services-report-print" className="rounded-lg border bg-white p-4 sm:p-6 print-area text-slate-900">
          {/* Report header */}
          <div className="flex items-start justify-between gap-4 border-b-2 border-slate-800 pb-3 mb-4">
            <div>
              <h2 className="text-lg font-bold">{data?.tenant?.name || t("appName")}</h2>
              <p className="text-xs text-slate-600">{t("servicesReport")}</p>
              {data?.tenant?.address && <p className="text-[11px] text-slate-600">{data.tenant.address}</p>}
            </div>
            <div className="text-end">
              <p className="text-xs text-slate-600">{t("reportPeriod")}</p>
              <p className="text-sm font-semibold">
                {resolvedDates.from ? formatDate(resolvedDates.from, lang) : t("allTime")}
                {resolvedDates.to ? ` → ${formatDate(resolvedDates.to, lang)}` : resolvedDates.from ? ` → ${formatDate(new Date(), lang)}` : ""}
              </p>
              <p className="text-[10px] text-slate-500">{formatDateTime(new Date(), lang)}</p>
            </div>
          </div>

          {isLoading || !data ? (
            <LoadingRows rows={6} />
          ) : data.services.length === 0 ? (
            <EmptyState title={t("noServicesInPeriod")} icon={Wrench} />
          ) : (
            <>
              {/* Totals */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/30 p-3">
                  <p className="text-[10px] text-muted-foreground">{t("totalServicesRevenue")}</p>
                  <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400 tnum">{money(data.totals.revenue)}</p>
                </div>
                <div className="rounded-lg bg-sky-50 dark:bg-sky-950/30 p-3">
                  <p className="text-[10px] text-muted-foreground">{t("totalServicesCount")}</p>
                  <p className="text-lg font-bold text-sky-600 dark:text-sky-400 tnum">{data.totals.count}</p>
                </div>
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="text-[10px] text-muted-foreground">{t("catalogServices")}</p>
                  <p className="text-lg font-bold tnum">{data.totals.catalogCount}</p>
                  <p className="text-[9px] text-muted-foreground tnum">{money(data.totals.catalogRevenue)}</p>
                </div>
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="text-[10px] text-muted-foreground">{t("customServices")}</p>
                  <p className="text-lg font-bold tnum">{data.totals.customCount}</p>
                  <p className="text-[9px] text-muted-foreground tnum">{money(data.totals.customRevenue)}</p>
                </div>
              </div>

              {/* Bar chart of services by revenue */}
              {data.services.length > 0 && (
                <div className="mb-4">
                  <p className="mb-2 text-xs font-semibold text-slate-700 dark:text-slate-300">{t("serviceRevenue")}</p>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={data.services.slice(0, 10)} layout="vertical" margin={{ left: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 10, fill: "#475569" }} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "#475569" }} width={120} />
                      <Tooltip contentStyle={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 12 }} formatter={(v: any) => money(Number(v))} />
                      <Bar dataKey="revenue" fill="#0ea5e9" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Services table */}
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-900 text-white">
                      <th className="px-3 py-2 text-start font-semibold">#</th>
                      <th className="px-3 py-2 text-start font-semibold">{t("serviceName") || "Service"}</th>
                      <th className="px-3 py-2 text-start font-semibold">{t("category")}</th>
                      <th className="px-3 py-2 text-center font-semibold">{t("serviceCount")}</th>
                      <th className="px-3 py-2 text-end font-semibold">{t("avgServicePrice")}</th>
                      <th className="px-3 py-2 text-end font-semibold">{t("serviceRevenue")}</th>
                      <th className="px-3 py-2 text-end font-semibold hidden print:table-cell">{t("lastTransaction")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.services.map((s: any, idx: number) => (
                      <tr key={idx} className="border-t border-slate-100">
                        <td className="px-3 py-2 text-slate-500 tnum">{idx + 1}</td>
                        <td className="px-3 py-2 font-medium text-slate-900">
                          {s.name}
                          {s.code && <span className="block text-[10px] text-slate-500 font-mono">{s.code}</span>}
                        </td>
                        <td className="px-3 py-2">
                          {s.isCustom ? (
                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-950 dark:text-amber-300">{t("customServices")}</span>
                          ) : (
                            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">{t("catalogServices")}</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-center tnum">{s.count}</td>
                        <td className="px-3 py-2 text-end tnum text-slate-700">{money(s.count > 0 ? s.revenue / s.count : 0)}</td>
                        <td className="px-3 py-2 text-end tnum font-semibold text-emerald-700 dark:text-emerald-400">{money(s.revenue)}</td>
                        <td className="px-3 py-2 text-end text-slate-500 text-[10px] hidden print:table-cell">{s.lastDate ? formatDate(s.lastDate, lang) : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-100 font-bold">
                      <td colSpan={3} className="px-3 py-2 text-end">{t("grandTotal")}</td>
                      <td className="px-3 py-2 text-center tnum">{data.totals.count}</td>
                      <td></td>
                      <td className="px-3 py-2 text-end tnum text-emerald-700 dark:text-emerald-400">{money(data.totals.revenue)}</td>
                      <td className="hidden print:table-cell"></td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Footer */}
              <p className="mt-3 text-center text-[10px] text-slate-500">
                {data.totals.distinctServices} {t("servicesProvided")} · {data.totals.count} {t("totalServicesCount")}
              </p>
            </>
          )}
        </div>

        {/* Print button (no-print) */}
        <div className="no-print flex justify-end">
          <Button size="sm" variant="outline" onClick={() => window.print()}>
            <Printer className="h-4 w-4 me-1" />{t("printReport")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
