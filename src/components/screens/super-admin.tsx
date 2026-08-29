"use client";

import { useApp } from "@/lib/store";
import { useT, formatMoney, formatDate } from "@/lib/format";
import { useApi, useApiMutation, StatCard, StatusBadge, LoadingRows, EmptyState } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { ShieldCheck, Building2, CheckCircle2, Clock, DollarSign, UserPlus, AlertTriangle, LogOut, Search, Wrench } from "lucide-react";
import { useState } from "react";

const PIE_COLORS = ["#0ea5e9", "#10b981", "#8b5cf6"];
const PLAN_LABELS: Record<string, string> = { Basic: "Basic", Professional: "Professional", Enterprise: "Enterprise" };

export function SuperAdminScreen() {
  const { t, lang } = useT();
  const { data, isLoading } = useApi<any>("/api/super-admin");
  const { invalidate, toastSuccess, toastError } = useApiMutation();
  const logout = useApp((s) => s.logout);
  const user = useApp((s) => s.user);
  const [q, setQ] = useState("");

  const money = (n: number) => formatMoney(n, "OMR", lang);

  const setStatus = async (id: string, name: string, status: string) => {
    try {
      await fetch(`/api/super-admin/tenants/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      invalidate(["/api/super-admin"]);
      toastSuccess(`${name}: ${status === "active" ? t("activate") : t("suspend")}`);
    } catch {
      toastError("Error");
    }
  };

  if (isLoading || !data) {
    return (
      <div className="min-h-screen bg-muted/30">
        <SuperAdminHeader />
        <div className="mx-auto max-w-6xl px-4 py-6">
          <LoadingRows rows={8} />
        </div>
      </div>
    );
  }

  const k = data.kpis;
  const tenants = (data.tenants || []).filter((t: any) => !q || t.name.toLowerCase().includes(q.toLowerCase()) || (t.email || "").toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="min-h-screen bg-muted/30">
      <SuperAdminHeader />
      <div className="mx-auto max-w-6xl px-4 py-6 space-y-5">
        {/* Welcome */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-xl font-bold sm:text-2xl">
              <ShieldCheck className="h-6 w-6 text-primary" />
              {t("superAdminPanel")}
            </h1>
            <p className="text-sm text-muted-foreground">{t("superAdminSubtitle")} · {user?.name}</p>
          </div>
          <Button variant="outline" size="sm" onClick={logout}>
            <LogOut className="h-4 w-4 me-1" />
            {t("backToWorkshop")}
          </Button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard title={t("totalWorkshops")} value={k.total} icon={Building2} tone="info" subtitle={`${k.active} ${t("activeWorkshops")}`} />
          <StatCard title={t("monthlyRevenue")} value={money(k.mrr)} icon={DollarSign} tone="revenue" subtitle="MRR" />
          <StatCard title={t("trialWorkshops")} value={k.trial} icon={Clock} tone="warning" subtitle={`${k.newThisMonth} ${t("newRegistrations")}`} />
          <StatCard title={t("expiringSoon")} value={k.expiringSoon} icon={AlertTriangle} tone="danger" subtitle={`${k.suspended} ${t("suspended")}`} />
        </div>

        {/* Charts */}
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-1">
            <CardHeader className="pb-2"><CardTitle className="text-base">{t("revenueByPlan")}</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={data.charts.revenueByPlan} dataKey="revenue" nameKey="plan" cx="50%" cy="50%" outerRadius={70} label={(e: any) => e.plan}>
                    {data.charts.revenueByPlan.map((_: any, i: number) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} formatter={(v: any) => money(Number(v))} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader className="pb-2"><CardTitle className="text-base">{t("workshopsGrowth")}</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={data.charts.growth}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                  <Line type="monotone" dataKey="count" stroke="#0ea5e9" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Platform stats */}
        <div className="grid grid-cols-3 gap-3">
          <Card><CardContent className="p-3 text-center"><p className="text-xs text-muted-foreground">{t("customers")}</p><p className="mt-1 text-xl font-bold tnum">{k.totalCustomers}</p></CardContent></Card>
          <Card><CardContent className="p-3 text-center"><p className="text-xs text-muted-foreground">{t("jobCards")}</p><p className="mt-1 text-xl font-bold tnum">{k.totalJobCards}</p></CardContent></Card>
          <Card><CardContent className="p-3 text-center"><p className="text-xs text-muted-foreground">{t("invoices")}</p><p className="mt-1 text-xl font-bold tnum">{k.totalInvoices}</p></CardContent></Card>
        </div>

        {/* Tenants table */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="text-base">{t("tenants")} ({tenants.length})</CardTitle>
              <div className="relative w-full sm:w-64">
                <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("search")} className="ps-9 h-9" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-2 sm:p-4">
            {tenants.length === 0 ? (
              <EmptyState title={t("noResults")} icon={Building2} />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">{t("tenantName")}</TableHead>
                      <TableHead className="text-xs hidden md:table-cell">{t("ownerEmail")}</TableHead>
                      <TableHead className="text-xs">{t("plan")}</TableHead>
                      <TableHead className="text-xs hidden sm:table-cell">{t("createdAt")}</TableHead>
                      <TableHead className="text-xs hidden lg:table-cell text-center">{t("users")}</TableHead>
                      <TableHead className="text-xs hidden lg:table-cell text-center">{t("customers")}</TableHead>
                      <TableHead className="text-xs text-end">{t("mrr")}</TableHead>
                      <TableHead className="text-xs">{t("status")}</TableHead>
                      <TableHead className="text-xs text-end">{t("actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tenants.map((tenant: any) => (
                      <TableRow key={tenant.id}>
                        <TableCell>
                          <p className="text-sm font-medium">{tenant.name}</p>
                          {tenant.phone && <p className="text-[10px] text-muted-foreground">{tenant.phone}</p>}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-xs text-muted-foreground font-mono">{tenant.email || "—"}</TableCell>
                        <TableCell>
                          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium">{PLAN_LABELS[tenant.plan] || tenant.plan}</span>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">{formatDate(tenant.createdAt, lang)}</TableCell>
                        <TableCell className="hidden lg:table-cell text-center tnum text-xs">{tenant.users}</TableCell>
                        <TableCell className="hidden lg:table-cell text-center tnum text-xs">{tenant.customers}</TableCell>
                        <TableCell className="text-end tnum text-xs font-semibold">{tenant.mrr > 0 ? money(tenant.mrr) : "—"}</TableCell>
                        <TableCell><StatusBadge status={tenant.status} /></TableCell>
                        <TableCell className="text-end">
                          {tenant.status === "active" ? (
                            <Button size="sm" variant="ghost" className="h-7 text-xs text-amber-600 hover:text-amber-700" onClick={() => setStatus(tenant.id, tenant.name, "suspended")}>
                              {t("suspend")}
                            </Button>
                          ) : (
                            <Button size="sm" variant="ghost" className="h-7 text-xs text-emerald-600 hover:text-emerald-700" onClick={() => setStatus(tenant.id, tenant.name, "active")}>
                              {t("activate")}
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function SuperAdminHeader() {
  const { t } = useT();
  const logout = useApp((s) => s.logout);
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/95 backdrop-blur px-4">
      <div className="flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-bold leading-tight">{t("superAdminPanel")}</p>
          <p className="text-[10px] text-muted-foreground leading-tight">{t("appName")}</p>
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        <Button variant="ghost" size="sm" onClick={logout}>
          <LogOut className="h-4 w-4 me-1" />
          {t("backToWorkshop")}
        </Button>
      </div>
    </header>
  );
}
