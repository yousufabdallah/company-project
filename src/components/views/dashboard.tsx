"use client";

import { useT } from "@/lib/format";
import { useApi, StatCard, StatusBadge, EmptyState, LoadingRows } from "@/components/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useApp } from "@/lib/store";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { TrendingUp, Wallet, Wrench, Car, CheckCircle2, AlertTriangle, Package, Clock, CalendarClock, Users, Plus, Receipt } from "lucide-react";
import { formatDate } from "@/lib/format";

const PIE_COLORS = ["#0ea5e9", "#f59e0b", "#10b981", "#8b5cf6", "#ef4444", "#14b8a6", "#f43f5e", "#6366f1", "#84cc16", "#ec4899"];

export function DashboardView() {
  const { t, lang } = useT();
  const { data, isLoading } = useApi<any>("/api/dashboard");
  const setView = useApp((s) => s.setView);
  const setQuickCreate = useApp((s) => s.setQuickCreate);

  if (isLoading || !data) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <LoadingRows key={i} rows={1} />
          ))}
        </div>
        <LoadingRows rows={6} />
      </div>
    );
  }

  const cur = data.currency;
  const money = (n: number) => new Intl.NumberFormat(lang === "ar" ? "ar-OM" : "en-US", { minimumFractionDigits: 3, maximumFractionDigits: 3 }).format(n) + " " + cur;
  const k = data.kpis;
  const c = data.charts;

  return (
    <div className="space-y-5">
      {/* Welcome */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">{t("welcomeBack")}, Khalid 👋</h1>
          <p className="text-sm text-muted-foreground">{new Date().toLocaleDateString(lang === "ar" ? "ar-OM" : "en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => setView("jobCards")}><Wrench className="h-4 w-4 me-1" />{t("jobCards")}</Button>
          <Button size="sm" variant="outline" onClick={() => setView("invoices")}><Receipt className="h-4 w-4 me-1" />{t("invoices")}</Button>
          <Button size="sm" onClick={() => setQuickCreate("jobCard")}><Plus className="h-4 w-4 me-1" />{t("jobCards")}</Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard title={t("todaysRevenue")} value={money(k.todayRevenue)} icon={Wallet} tone="revenue" subtitle={t("monthlyRevenue") + ": " + money(k.monthRevenue)} />
        <StatCard title={t("openJobCards")} value={k.openJobs} icon={Wrench} tone="info" subtitle={t("completedJobCards") + ": " + k.completedJobs} />
        <StatCard title={t("vehiclesInWorkshop")} value={k.vehiclesInShop} icon={Car} subtitle={t("waitingParts") + ": " + k.waitingParts} />
        <StatCard title={t("outstandingPayments")} value={money(k.outstandingPayments)} icon={AlertTriangle} tone="warning" subtitle={t("pendingApprovals") + ": " + k.pendingApprovals} />
      </div>

      {/* Charts row 1 */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base"><TrendingUp className="h-4 w-4 text-emerald-500" />{t("revenueTrend")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={c.revenueTrend}>
                <defs>
                  <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" width={50} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} fill="url(#rev)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t("jobCardStatusBreakdown")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={c.statusBreakdown.filter((s: any) => s.count > 0)} dataKey="count" nameKey="status" cx="50%" cy="50%" innerRadius={45} outerRadius={80} paddingAngle={2}>
                  {c.statusBreakdown.map((_: any, i: number) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} formatter={(v: any, n: any) => [v, t("status_" + n)]} />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-1 flex flex-wrap gap-1.5 justify-center">
              {c.statusBreakdown.filter((s: any) => s.count > 0).map((s: any, i: number) => (
                <span key={s.status} className="inline-flex items-center gap-1 text-[10px]">
                  <span className="h-2 w-2 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                  {t("status_" + s.status)} ({s.count})
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts row 2 */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">{t("topServices")}</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={c.topServices} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" width={110} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="count" fill="#0ea5e9" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">{t("technicianPerformance")}</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={c.technicianPerformance}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="assigned" fill="#94a3b8" radius={[3, 3, 0, 0]} />
                <Bar dataKey="done" fill="#10b981" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">{t("customerGrowth")}</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={c.customerGrowth}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                <Line type="monotone" dataKey="count" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Lists row */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Today's appointments */}
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-2 text-base"><CalendarClock className="h-4 w-4" />{t("todaysAppointments")}</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setView("appointments")}>{t("viewAll")}</Button>
          </CardHeader>
          <CardContent className="space-y-2 max-h-72 overflow-y-auto scroll-thin">
            {data.lists.todaysAppointments.length === 0 ? (
              <EmptyState title={t("noAppointments")} icon={CalendarClock} />
            ) : (
              data.lists.todaysAppointments.map((a: any) => (
                <div key={a.id} className="flex items-center gap-3 rounded-lg border p-2.5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-bold tnum">{a.time}</div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{a.customer?.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{a.vehicle?.plateNumber} · {a.service?.name ?? "—"}</p>
                  </div>
                  <StatusBadge status={a.status} />
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Recent job cards */}
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-2 text-base"><Wrench className="h-4 w-4" />{t("recentJobCards")}</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setView("jobCards")}>{t("viewAll")}</Button>
          </CardHeader>
          <CardContent className="space-y-2 max-h-72 overflow-y-auto scroll-thin">
            {data.lists.recentJobCards.length === 0 ? (
              <EmptyState title={t("noData")} icon={Wrench} />
            ) : (
              data.lists.recentJobCards.map((j: any) => (
                <div key={j.id} className="rounded-lg border p-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium tnum">{j.code}</p>
                    <StatusBadge status={j.status} />
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">{j.customer?.name} · {j.vehicle?.plateNumber}</p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">{j.complaint}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Alerts */}
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-2 text-base"><AlertTriangle className="h-4 w-4 text-amber-500" />{t("alerts")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-72 overflow-y-auto scroll-thin">
            {data.lists.lowStockParts.length === 0 ? (
              <EmptyState title={t("noData")} icon={CheckCircle2} />
            ) : (
              data.lists.lowStockParts.map((p: any) => (
                <div key={p.id} className="flex items-center gap-3 rounded-lg border border-amber-200/60 dark:border-amber-900/40 p-2.5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                    <Package className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{p.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{p.sku} · {t("location")}: {p.location ?? "—"}</p>
                  </div>
                  <div className="text-end">
                    <p className="text-sm font-bold text-amber-600 tnum">{p.quantity}</p>
                    <p className="text-[10px] text-muted-foreground">/ {p.minStock} {t("minStock")}</p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Financial summary */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base"><Wallet className="h-4 w-4" />{t("groupFinance")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-xs text-muted-foreground">{t("revenue")}</p>
              <p className="mt-1 text-base font-bold text-emerald-600 tnum">{money(data.financial.revenue)}</p>
            </div>
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-xs text-muted-foreground">{t("expensesTotal")}</p>
              <p className="mt-1 text-base font-bold text-red-500 tnum">{money(data.financial.expenses)}</p>
            </div>
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-xs text-muted-foreground">{t("netProfit")}</p>
              <p className="mt-1 text-base font-bold tnum">{money(data.financial.netProfit)}</p>
            </div>
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-xs text-muted-foreground">{t("stockValue")}</p>
              <p className="mt-1 text-base font-bold tnum">{money(data.financial.stockValue)}</p>
            </div>
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-xs text-muted-foreground">{t("status_paid")}</p>
              <p className="mt-1 text-base font-bold text-emerald-600 tnum">{data.financial.paidInvoices}</p>
            </div>
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-xs text-muted-foreground">{t("status_unpaid")}</p>
              <p className="mt-1 text-base font-bold text-red-500 tnum">{data.financial.unpaidInvoices}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
