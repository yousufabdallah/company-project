"use client";

import { useApp } from "@/lib/store";
import { useT, formatMoney, formatDate } from "@/lib/format";
import { useApi, useApiMutation, StatCard, StatusBadge, LoadingRows, EmptyState } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { ShieldCheck, Building2, DollarSign, Clock, AlertTriangle, LogOut, Search, Wrench, CreditCard, Package, Settings2, Pencil, Plus, LogIn, Ban, UserCog, Mail, Lock, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

const PIE_COLORS = ["#0ea5e9", "#10b981", "#8b5cf6"];
const SUB_STATUSES = ["trial", "active", "past_due", "cancelled"];

export function SuperAdminScreen() {
  const { t, lang } = useT();
  const { data, isLoading } = useApi<any>("/api/super-admin");
  const { data: plansData } = useApi<any>("/api/super-admin/plans");
  const { data: settingsData } = useApi<any>("/api/super-admin/settings");
  const { invalidate, toastSuccess, toastError } = useApiMutation();
  const logout = useApp((s) => s.logout);
  const login = useApp((s) => s.login);
  const user = useApp((s) => s.user);
  const [tab, setTab] = useState("overview");
  const [q, setQ] = useState("");
  const [subDialog, setSubDialog] = useState<any>(null);
  const [planDialog, setPlanDialog] = useState<any>(null);

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

  const enterWorkshop = async (tenant: any) => {
    try {
      const res = await fetch(`/api/super-admin/tenants/${tenant.id}/impersonate`, { method: "POST" });
      if (!res.ok) throw new Error();
      const impersonated = await res.json();
      login(impersonated); // store routes super_admin + workshop → app screen
      toastSuccess(`${t("viewingAs")} ${tenant.name}`);
    } catch {
      toastError("Error");
    }
  };

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/95 backdrop-blur px-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-bold leading-tight">{t("superAdminPanel")}</p>
            <p className="text-[10px] text-muted-foreground leading-tight">{user?.email}</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={async () => { await fetch("/api/auth/logout", { method: "POST" }); logout(); }}>
          <LogOut className="h-4 w-4 me-1" />
          {t("backToWorkshop")}
        </Button>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-6 space-y-5">
        {/* Tabs */}
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-5">
            <TabsTrigger value="overview"><Building2 className="h-3.5 w-3.5 me-1 inline" />{t("overview")}</TabsTrigger>
            <TabsTrigger value="tenants"><CreditCard className="h-3.5 w-3.5 me-1 inline" />{t("tenants")}</TabsTrigger>
            <TabsTrigger value="plans"><Package className="h-3.5 w-3.5 me-1 inline" />{t("plans")}</TabsTrigger>
            <TabsTrigger value="settings"><Settings2 className="h-3.5 w-3.5 me-1 inline" />{t("superSettings")}</TabsTrigger>
            <TabsTrigger value="account"><UserCog className="h-3.5 w-3.5 me-1 inline" />{t("accountTab")}</TabsTrigger>
          </TabsList>

          {/* ─── Overview Tab ─── */}
          <TabsContent value="overview" className="space-y-5 mt-4">
            {isLoading || !data ? (
              <LoadingRows rows={8} />
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                  <StatCard title={t("totalWorkshops")} value={data.kpis.total} icon={Building2} tone="info" subtitle={`${data.kpis.active} ${t("activeWorkshops")}`} />
                  <StatCard title={t("monthlyRevenue")} value={money(data.kpis.mrr)} icon={DollarSign} tone="revenue" subtitle="MRR" />
                  <StatCard title={t("trialWorkshops")} value={data.kpis.trial} icon={Clock} tone="warning" subtitle={`${data.kpis.newThisMonth} ${t("newRegistrations")}`} />
                  <StatCard title={t("expiringSoon")} value={data.kpis.expiringSoon} icon={AlertTriangle} tone="danger" subtitle={`${data.kpis.suspended} ${t("suspended")}`} />
                </div>

                <div className="grid gap-4 lg:grid-cols-3">
                  <Card>
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

                <div className="grid grid-cols-3 gap-3">
                  <Card><CardContent className="p-3 text-center"><p className="text-xs text-muted-foreground">{t("customers")}</p><p className="mt-1 text-xl font-bold tnum">{data.kpis.totalCustomers}</p></CardContent></Card>
                  <Card><CardContent className="p-3 text-center"><p className="text-xs text-muted-foreground">{t("jobCards")}</p><p className="mt-1 text-xl font-bold tnum">{data.kpis.totalJobCards}</p></CardContent></Card>
                  <Card><CardContent className="p-3 text-center"><p className="text-xs text-muted-foreground">{t("invoices")}</p><p className="mt-1 text-xl font-bold tnum">{data.kpis.totalInvoices}</p></CardContent></Card>
                </div>
              </>
            )}
          </TabsContent>

          {/* ─── Tenants & Subscriptions Tab ─── */}
          <TabsContent value="tenants" className="mt-4">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <CardTitle className="text-base">{t("tenants")} ({data?.tenants?.length ?? 0})</CardTitle>
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("search")} className="ps-9 h-9" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-2 sm:p-4">
                {isLoading ? (
                  <LoadingRows />
                ) : (
                  (() => {
                    const tenants = (data?.tenants || []).filter((tn: any) => !q || tn.name.toLowerCase().includes(q.toLowerCase()) || (tn.email || "").toLowerCase().includes(q.toLowerCase()));
                    if (tenants.length === 0) return <EmptyState title={t("noResults")} icon={Building2} />;
                    return (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="text-xs">{t("tenantName")}</TableHead>
                              <TableHead className="text-xs">{t("plan")}</TableHead>
                              <TableHead className="text-xs hidden md:table-cell">{t("subscription")}</TableHead>
                              <TableHead className="text-xs hidden lg:table-cell">{t("expiryDate")}</TableHead>
                              <TableHead className="text-xs hidden sm:table-cell text-center">{t("users")}</TableHead>
                              <TableHead className="text-xs text-end">{t("mrr")}</TableHead>
                              <TableHead className="text-xs">{t("status")}</TableHead>
                              <TableHead className="text-xs text-end">{t("actions")}</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {tenants.map((tn: any) => (
                              <TableRow key={tn.id}>
                                <TableCell>
                                  <p className="text-sm font-medium">{tn.name}</p>
                                  {tn.email && <p className="text-[10px] text-muted-foreground font-mono">{tn.email}</p>}
                                </TableCell>
                                <TableCell>
                                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium">{tn.plan}</span>
                                </TableCell>
                                <TableCell className="hidden md:table-cell"><StatusBadge status={tn.subscriptionStatus || "trial"} /></TableCell>
                                <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">{tn.subscriptionExpiry ? formatDate(tn.subscriptionExpiry, lang) : "—"}</TableCell>
                                <TableCell className="hidden sm:table-cell text-center tnum text-xs">{tn.users}</TableCell>
                                <TableCell className="text-end tnum text-xs font-semibold">{tn.mrr > 0 ? money(tn.mrr) : "—"}</TableCell>
                                <TableCell><StatusBadge status={tn.status} /></TableCell>
                                <TableCell className="text-end">
                                  <div className="flex items-center justify-end gap-1">
                                    <Button size="sm" variant="default" className="h-7 text-xs" onClick={() => enterWorkshop(tn)}>
                                      <LogIn className="h-3.5 w-3.5 me-1" />{t("enterWorkshop")}
                                    </Button>
                                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setSubDialog(tn)}>
                                      <CreditCard className="h-3.5 w-3.5" />
                                    </Button>
                                    {tn.status === "active" ? (
                                      <Button size="sm" variant="ghost" className="h-7 text-xs text-amber-600" onClick={() => setStatus(tn.id, tn.name, "suspended")}>
                                        <Ban className="h-3.5 w-3.5" />
                                      </Button>
                                    ) : (
                                      <Button size="sm" variant="ghost" className="h-7 text-xs text-emerald-600" onClick={() => setStatus(tn.id, tn.name, "active")}>
                                        <ShieldCheck className="h-3.5 w-3.5" />
                                      </Button>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    );
                  })()
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── Plans Tab ─── */}
          <TabsContent value="plans" className="mt-4 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">{t("plans")}</h2>
              <Button size="sm" onClick={() => setPlanDialog("new")}><Plus className="h-4 w-4 me-1" />{t("newPlan")}</Button>
            </div>
            {!plansData ? (
              <LoadingRows rows={4} />
            ) : plansData.items.length === 0 ? (
              <EmptyState title={t("noData")} icon={Package} />
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {plansData.items.map((p: any) => (
                  <Card key={p.id} className={`relative ${!p.active ? "opacity-60" : ""}`}>
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-lg font-bold">{p.name}</h3>
                          {p.description && <p className="text-xs text-muted-foreground mt-0.5">{p.description}</p>}
                        </div>
                        {!p.active && <span className="rounded-full bg-muted px-2 py-0.5 text-[10px]">{t("deactivate")}</span>}
                      </div>
                      <p className="mt-3 text-2xl font-bold tnum">{money(p.price)}<span className="text-xs font-normal text-muted-foreground">/{t("thisMonth")?.slice(0) ? "" : ""}m</span></p>
                      <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[10px]">
                        <div className="rounded bg-muted/60 p-1.5"><p className="font-bold tnum text-sm">{p.maxBranches < 0 ? "∞" : p.maxBranches}</p>{t("maxBranches")}</div>
                        <div className="rounded bg-muted/60 p-1.5"><p className="font-bold tnum text-sm">{p.maxUsers < 0 ? "∞" : p.maxUsers}</p>{t("maxUsersLimit")}</div>
                        <div className="rounded bg-muted/60 p-1.5"><p className="font-bold tnum text-sm">{p.maxJobCards < 0 ? "∞" : p.maxJobCards}</p>{t("maxJobCardsLimit")}</div>
                      </div>
                      <ul className="mt-3 space-y-1">
                        {(() => { try { return JSON.parse(p.features || "[]"); } catch { return []; } })().map((f: string, i: number) => (
                          <li key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                            <span className="mt-1 h-1 w-1 rounded-full bg-primary shrink-0" />{f}
                          </li>
                        ))}
                      </ul>
                      <p className="mt-3 text-[10px] text-muted-foreground">{t("tenants")}: <span className="font-bold tnum">{p._count?.tenants ?? 0}</span></p>
                      <Button variant="outline" size="sm" className="mt-3 w-full" onClick={() => setPlanDialog(p)}>
                        <Pencil className="h-3.5 w-3.5 me-1" />{t("editPlan")}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ─── Platform Settings Tab ─── */}
          <TabsContent value="settings" className="mt-4">
            <PlatformSettingsForm settings={settingsData} onSaved={() => invalidate(["/api/super-admin/settings"])} />
          </TabsContent>

          {/* ─── Account Tab ─── */}
          <TabsContent value="account" className="mt-4">
            <AccountSettingsForm />
          </TabsContent>
        </Tabs>
      </div>

      {/* Subscription dialog */}
      {subDialog && (
        <SubscriptionDialog
          tenant={subDialog}
          plans={plansData?.items || []}
          onClose={() => setSubDialog(null)}
          onSaved={() => { invalidate(["/api/super-admin"]); setSubDialog(null); }}
        />
      )}

      {/* Plan create/edit dialog */}
      {planDialog && (
        <PlanDialog
          plan={planDialog === "new" ? null : planDialog}
          onClose={() => setPlanDialog(null)}
          onSaved={() => { invalidate(["/api/super-admin/plans", "/api/super-admin"]); setPlanDialog(null); }}
        />
      )}
    </div>
  );
}

// ─── Subscription dialog ─────────────────────────────────────
function SubscriptionDialog({ tenant, plans, onClose, onSaved }: { tenant: any; plans: any[]; onClose: () => void; onSaved: () => void }) {
  const { t } = useT();
  const { invalidate, toastSuccess, toastError } = useApiMutation();
  const [planId, setPlanId] = useState(tenant.planId || "");
  const [status, setStatus] = useState(tenant.subscriptionStatus || "trial");
  const [expiry, setExpiry] = useState(tenant.subscriptionExpiry ? new Date(tenant.subscriptionExpiry).toISOString().slice(0, 10) : "");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/super-admin/tenants/${tenant.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: planId || null, subscriptionStatus: status, subscriptionExpiry: expiry || null }),
      });
      if (!res.ok) throw new Error();
      toastSuccess(t("subscriptionSaved"));
      onSaved();
    } catch {
      toastError("Error");
    } finally {
      setSaving(false);
    }
  };

  const quickRenew = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    setExpiry(d.toISOString().slice(0, 10));
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><CreditCard className="h-5 w-5" />{t("manageSubscription")}</DialogTitle>
          <DialogDescription>{tenant.name}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">{t("plan")}</Label>
            <Select value={planId || "none"} onValueChange={(v) => setPlanId(v === "none" ? "" : v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— {t("none")} —</SelectItem>
                {plans.map((p: any) => (
                  <SelectItem key={p.id} value={p.id}>{p.name} · {formatMoney(p.price, "OMR")}/m</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{t("subscription")}</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {SUB_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>{t("status_" + s)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{t("expiryDate")}</Label>
            <Input type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)} />
            <div className="flex gap-1">
              {[30, 90, 365].map((d) => (
                <Button key={d} type="button" size="sm" variant="outline" className="flex-1 h-7 text-xs" onClick={() => quickRenew(d)}>+{d}d</Button>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>{t("cancel")}</Button>
            <Button onClick={save} disabled={saving}>{t("save")}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Plan create/edit dialog ─────────────────────────────────
function PlanDialog({ plan, onClose, onSaved }: { plan: any; onClose: () => void; onSaved: () => void }) {
  const { t } = useT();
  const { invalidate, toastSuccess, toastError } = useApiMutation();
  const [form, setForm] = useState({
    name: plan?.name || "",
    description: plan?.description || "",
    price: String(plan?.price ?? 0),
    maxBranches: String(plan?.maxBranches ?? 1),
    maxUsers: String(plan?.maxUsers ?? 3),
    maxJobCards: String(plan?.maxJobCards ?? 500),
    features: (() => { try { return JSON.parse(plan?.features || "[]").join(", "); } catch { return ""; } })(),
    active: plan?.active ?? true,
  });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!form.name) return toastError(t("required"));
    setSaving(true);
    try {
      const payload = {
        ...(plan ? { id: plan.id } : {}),
        name: form.name,
        description: form.description || null,
        price: Number(form.price) || 0,
        maxBranches: Number(form.maxBranches),
        maxUsers: Number(form.maxUsers),
        maxJobCards: Number(form.maxJobCards),
        features: form.features.split(",").map((f: string) => f.trim()).filter(Boolean),
        active: form.active,
      };
      const res = await fetch("/api/super-admin/plans", {
        method: plan ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Error");
      }
      toastSuccess(t("planSaved"));
      invalidate(["/api/super-admin/plans", "/api/super-admin"]);
      onSaved();
    } catch (e: any) {
      toastError(e.message || "Error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto scroll-thin">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Package className="h-5 w-5" />{plan ? t("editPlan") : t("newPlan")}</DialogTitle>
          <DialogDescription className="sr-only">{t("plans")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">{t("name")} *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t("planPrice")}</Label>
              <Input type="number" step="0.001" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{t("description")}</Label>
            <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">{t("maxBranches")}</Label>
              <Input type="number" value={form.maxBranches} onChange={(e) => setForm({ ...form, maxBranches: e.target.value })} placeholder="-1 = ∞" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t("maxUsersLimit")}</Label>
              <Input type="number" value={form.maxUsers} onChange={(e) => setForm({ ...form, maxUsers: e.target.value })} placeholder="-1 = ∞" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t("maxJobCardsLimit")}</Label>
              <Input type="number" value={form.maxJobCards} onChange={(e) => setForm({ ...form, maxJobCards: e.target.value })} placeholder="-1 = ∞" />
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground">-1 = {t("unlimited")}</p>
          <div className="space-y-1.5">
            <Label className="text-xs">{t("features")} <span className="text-muted-foreground">({t("featuresHint")})</span></Label>
            <Input value={form.features} onChange={(e) => setForm({ ...form, features: e.target.value })} placeholder="1 Branch, 3 Users, Basic Reports" />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <Label className="text-xs">{t("status_active")}</Label>
            <Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>{t("cancel")}</Button>
            <Button onClick={save} disabled={saving}>{t("save")}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Platform settings form ──────────────────────────────────
function PlatformSettingsForm({ settings, onSaved }: { settings: any; onSaved: () => void }) {
  const { t } = useT();
  const { toastSuccess, toastError } = useApiMutation();
  const [form, setForm] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings && !form) setForm(settings);
  }, [settings, form]);

  if (!form) return <LoadingRows rows={5} />;

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/super-admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, maintenanceMode: String(!!form.maintenanceMode && form.maintenanceMode !== "false") }),
      });
      if (!res.ok) throw new Error();
      toastSuccess(t("settingsSaved"));
      onSaved();
    } catch {
      toastError("Error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-base"><Settings2 className="h-4 w-4" />{t("superSettings")}</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs">{t("platformName")}</Label>
            <Input value={form.platformName || ""} onChange={(e) => setForm({ ...form, platformName: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{t("supportEmail")}</Label>
            <Input type="email" value={form.supportEmail || ""} onChange={(e) => setForm({ ...form, supportEmail: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{t("trialDays")}</Label>
            <Input type="number" value={form.trialDays || "14"} onChange={(e) => setForm({ ...form, trialDays: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{t("defaultCurrency")}</Label>
            <Select value={form.defaultCurrency || "OMR"} onValueChange={(v) => setForm({ ...form, defaultCurrency: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["OMR", "AED", "SAR", "USD"].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex items-center justify-between rounded-lg border p-3">
          <div>
            <Label className="text-xs">{t("maintenanceMode")}</Label>
            <p className="text-[10px] text-muted-foreground">—</p>
          </div>
          <Switch
            checked={form.maintenanceMode === true || form.maintenanceMode === "true"}
            onCheckedChange={(v) => setForm({ ...form, maintenanceMode: v })}
          />
        </div>
        <div className="flex justify-end">
          <Button onClick={save} disabled={saving}>{t("save")}</Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Account Settings Form (super admin email + password) ───────────
function AccountSettingsForm() {
  const { t } = useT();
  const { toastSuccess, toastError } = useApiMutation();
  const [profile, setProfile] = useState<any>(null);
  const [newEmail, setNewEmail] = useState("");
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [savingEmail, setSavingEmail] = useState(false);
  const [savingPw, setSavingPw] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/super-admin/account");
        if (res.ok) {
          const data = await res.json();
          setProfile(data);
          setNewEmail(data.email || "");
        }
      } catch { /* ignore */ }
    })();
  }, []);

  const saveEmail = async () => {
    if (!newEmail.trim()) return toastError(t("required"));
    setSavingEmail(true);
    try {
      const res = await fetch("/api/super-admin/account", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: newEmail.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        toastError(data.error === "email_in_use" ? t("emailInUse") : "Error");
        return;
      }
      toastSuccess(t("emailUpdated"));
      setProfile({ ...profile, email: data.email });
      setCurrentPw(""); setNewPw("");
    } catch { toastError("Error"); }
    finally { setSavingEmail(false); }
  };

  const savePassword = async () => {
    if (!currentPw || !newPw) return toastError(t("required"));
    if (newPw.length < 6) return toastError(t("newPasswordHint"));
    setSavingPw(true);
    try {
      const res = await fetch("/api/super-admin/account", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
      });
      const data = await res.json();
      if (!res.ok) {
        toastError(data.error === "wrong_password" ? t("wrongCurrentPassword") : data.error === "current_password_required" ? t("currentPassword") : "Error");
        return;
      }
      toastSuccess(t("passwordUpdated"));
      setCurrentPw(""); setNewPw("");
    } catch { toastError("Error"); }
    finally { setSavingPw(false); }
  };

  if (!profile) return <LoadingRows rows={5} />;

  return (
    <div className="space-y-4 max-w-lg">
      {/* Profile info */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-base"><UserCog className="h-4 w-4" />{t("accountSettings")}</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 rounded-lg bg-muted/30 p-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-bold">{profile.name}</p>
              <p className="text-xs text-muted-foreground font-mono">{profile.email}</p>
              <p className="text-[10px] text-muted-foreground capitalize">{profile.role.replace("_", " ")}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Update Email */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">{t("updateEmail")}</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">{t("userEmail")}</Label>
            <div className="relative">
              <Mail className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className="ps-9" />
            </div>
          </div>
          <Button size="sm" onClick={saveEmail} disabled={savingEmail || newEmail === profile.email}>
            {savingEmail && <Loader2 className="h-4 w-4 animate-spin me-1" />}
            {t("save")}
          </Button>
        </CardContent>
      </Card>

      {/* Update Password */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">{t("updatePassword")}</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">{t("currentPassword")} *</Label>
            <div className="relative">
              <Lock className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input type="password" value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} placeholder="••••••••" className="ps-9" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{t("newPassword")} *</Label>
            <div className="relative">
              <Lock className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} placeholder="••••••••" className="ps-9" />
            </div>
            <p className="text-[10px] text-muted-foreground">{t("newPasswordHint")}</p>
          </div>
          <Button size="sm" onClick={savePassword} disabled={savingPw || !currentPw || !newPw}>
            {savingPw && <Loader2 className="h-4 w-4 animate-spin me-1" />}
            {t("save")}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
