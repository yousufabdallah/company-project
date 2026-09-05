"use client";

import { useT, formatMoney, formatDate } from "@/lib/format";
import { useApi, useApiMutation, StatusBadge, EmptyState, LoadingRows, PageHeader } from "@/components/shared";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useApp } from "@/lib/store";
import { usePermissions } from "@/lib/use-permissions";
import { useState } from "react";
import { Search, Plus, Phone, Mail, Car, Wrench, Receipt, Wallet, Users, Pencil, Trash2, Loader2 } from "lucide-react";

export function CustomersView() {
  const { t, lang } = useT();
  const { data, isLoading } = useApi<any>("/api/customers");
  const setQuickCreate = useApp((s) => s.setQuickCreate);
  const { canCreate, canEdit, canDelete } = usePermissions();
  const { invalidate, toastSuccess, toastError } = useApiMutation();
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [editing, setEditing] = useState<any>(null);

  const deleteCustomer = async (c: any) => {
    if (!confirm(t("confirmDeleteCustomer"))) return;
    try {
      const res = await fetch(`/api/customers/${c.id}`, { method: "DELETE" });
      if (!res.ok) {
        toastError("Error");
        return;
      }
      invalidate(["/api/customers", "/api/dashboard"]);
      toastSuccess();
      if (selected === c.id) setSelected(null);
    } catch {
      toastError("Error");
    }
  };

  const cur = data?.items?.[0]?.currency ?? "OMR";
  const money = (n: number) => formatMoney(n, "OMR", lang);
  const items = (data?.items || []).filter((c: any) =>
    !q || c.name.toLowerCase().includes(q.toLowerCase()) || c.mobile.includes(q) || c.code.toLowerCase().includes(q.toLowerCase())
  );

  const { data: detail } = useApi<any>(selected ? `/api/customers/${selected}` : null);

  return (
    <div>
      <PageHeader title={t("customers")} subtitle={`${items.length} ${t("customers").toLowerCase()}`}>
        {canCreate("customers") && <Button size="sm" onClick={() => setQuickCreate("customer")}><Plus className="h-4 w-4 me-1" />{t("addNew")}</Button>}
      </PageHeader>

      <Card>
        <CardContent className="p-3 sm:p-4">
          <div className="relative mb-3 max-w-sm">
            <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("search")} className="ps-9" />
          </div>

          {isLoading ? (
            <LoadingRows />
          ) : items.length === 0 ? (
            <EmptyState title={t("noResults")} icon={Users} />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("customerCode")}</TableHead>
                    <TableHead>{t("customerName")}</TableHead>
                    <TableHead className="hidden md:table-cell">{t("mobile")}</TableHead>
                    <TableHead className="hidden sm:table-cell">{t("customerType")}</TableHead>
                    <TableHead className="hidden lg:table-cell">{t("vehicles")}</TableHead>
                    <TableHead className="text-end">{t("outstandingBalance")}</TableHead>
                    {(canEdit("customers") || canDelete("customers")) && <TableHead className="text-end">{t("actions")}</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((c: any) => (
                    <TableRow key={c.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelected(c.id)}>
                      <TableCell className="font-mono text-xs tnum">{c.code}</TableCell>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell className="hidden md:table-cell">{c.mobile}</TableCell>
                      <TableCell className="hidden sm:table-cell"><StatusBadge status={c.type === "corporate" ? "approved" : "normal"} label={t(c.type)} /></TableCell>
                      <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">{c.vehicles?.length ?? 0}</TableCell>
                      <TableCell className={`text-end font-semibold tnum ${c.balance > 0 ? "text-red-600" : "text-emerald-600"}`}>{money(c.balance)}</TableCell>
                      {(canEdit("customers") || canDelete("customers")) && (
                        <TableCell className="text-end" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            {canEdit("customers") && (
                              <Button size="icon" variant="ghost" className="h-7 w-7" title={t("edit")} onClick={() => setEditing(c)}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            {canDelete("customers") && (
                              <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" title={t("delete")} onClick={() => deleteCustomer(c)}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail dialog */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto scroll-thin">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />{detail?.name}
              <span className="flex-1" />
              {detail && canEdit("customers") && (
                <Button size="icon" variant="ghost" className="h-7 w-7" title={t("edit")} onClick={() => setEditing(detail)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              )}
              {detail && canDelete("customers") && (
                <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" title={t("delete")} onClick={() => deleteCustomer(detail)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <InfoChip icon={Phone} label={t("mobile")} value={detail.mobile} />
                <InfoChip icon={Mail} label={t("email")} value={detail.email || "—"} />
                <InfoChip icon={Receipt} label={t("customerCode")} value={detail.code} />
                <InfoChip icon={Wallet} label={t("outstandingBalance")} value={money(detail.balance)} tone={detail.balance > 0 ? "danger" : "ok"} />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <Stat icon={Car} label={t("vehicles")} value={detail.vehicles?.length ?? 0} />
                <Stat icon={Wrench} label={t("jobCards")} value={detail.jobCards?.length ?? 0} />
                <Stat icon={Wallet} label={t("totalSpent")} value={money(detail.totalSpent ?? 0)} />
              </div>

              <Tabs defaultValue="vehicles">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="vehicles"><Car className="h-3.5 w-3.5 me-1" />{t("vehicles")}</TabsTrigger>
                  <TabsTrigger value="jobs"><Wrench className="h-3.5 w-3.5 me-1" />{t("jobCards")}</TabsTrigger>
                  <TabsTrigger value="invoices">{t("invoices")}</TabsTrigger>
                  <TabsTrigger value="payments">{t("payments")}</TabsTrigger>
                </TabsList>
                <TabsContent value="vehicles" className="mt-3">
                  <SimpleList rows={detail.vehicles} cols={[["plateNumber", t("plateNumber")], ["make", t("make")], ["model", t("model")], ["year", t("year")]]} empty={t("noData")} />
                </TabsContent>
                <TabsContent value="jobs" className="mt-3">
                  <SimpleList rows={detail.jobCards} cols={[["code", t("jobCardNumber")], ["complaint", t("complaint")], ["status", t("status")]]} statusCol="status" empty={t("noData")} />
                </TabsContent>
                <TabsContent value="invoices" className="mt-3">
                  <SimpleList rows={detail.invoices} cols={[["code", t("invoiceNumber")], ["grandTotal", t("total")], ["status", t("status")]]} moneyCol="grandTotal" money={money} statusCol="status" empty={t("noData")} />
                </TabsContent>
                <TabsContent value="payments" className="mt-3">
                  <SimpleList rows={detail.payments} cols={[["method", t("paymentMethod")], ["reference", t("reference")], ["amount", t("amount")], ["date", t("date")]]} moneyCol="amount" money={money} dateCol="date" empty={t("noData")} />
                </TabsContent>
              </Tabs>

              {detail.notes && (
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="text-xs font-medium text-muted-foreground mb-1">{t("notes")}</p>
                  <p className="text-sm">{detail.notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      {editing && <EditCustomerDialog customer={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

// ─── Edit Customer Dialog ──────────────────────────────────────
function EditCustomerDialog({ customer, onClose }: { customer: any; onClose: () => void }) {
  const { t } = useT();
  const { invalidate, toastSuccess, toastError } = useApiMutation();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: customer.name || "",
    mobile: customer.mobile || "",
    whatsapp: customer.whatsapp || "",
    email: customer.email || "",
    address: customer.address || "",
    type: customer.type || "individual",
    notes: customer.notes || "",
  });

  const save = async () => {
    if (!form.name.trim() || !form.mobile.trim()) return toastError(t("required"));
    setSaving(true);
    try {
      const res = await fetch(`/api/customers/${customer.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toastError(err.error === "name_and_mobile_required" ? t("required") : "Error");
        return;
      }
      invalidate(["/api/customers", "/api/dashboard"]);
      toastSuccess();
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
          <DialogTitle className="flex items-center gap-2"><Pencil className="h-5 w-5" />{t("edit")}: {customer.name}</DialogTitle>
          <DialogDescription className="sr-only">{customer.code}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">{t("customerName")} *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t("mobile")} *</Label>
              <Input value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t("whatsapp")}</Label>
              <Input value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t("email")}</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t("customerType")}</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="individual">{t("individual")}</SelectItem>
                  <SelectItem value="corporate">{t("corporate")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t("address")}</Label>
              <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">{t("notes")}</Label>
            <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
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

function InfoChip({ icon: Icon, label, value, tone }: { icon: any; label: string; value: string; tone?: "danger" | "ok" }) {
  return (
    <div className="rounded-lg border p-2.5">
      <p className="flex items-center gap-1 text-[10px] text-muted-foreground"><Icon className="h-3 w-3" />{label}</p>
      <p className={`mt-0.5 text-sm font-semibold truncate ${tone === "danger" ? "text-red-600" : tone === "ok" ? "text-emerald-600" : ""}`}>{value}</p>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: any; label: string; value: any }) {
  return (
    <div className="rounded-lg bg-muted/50 p-3 text-center">
      <Icon className="mx-auto h-5 w-5 text-muted-foreground" />
      <p className="mt-1 text-lg font-bold tnum">{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}

function SimpleList({ rows, cols, moneyCol, money, statusCol, dateCol, empty }: { rows: any[]; cols: [string, string][]; moneyCol?: string; money?: (n: number) => string; statusCol?: string; dateCol?: string; empty: string }) {
  if (!rows || rows.length === 0) return <EmptyState title={empty} />;
  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            {cols.map(([_, label]) => <TableHead key={label} className="text-xs">{label}</TableHead>)}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r, i) => (
            <TableRow key={r.id || i}>
              {cols.map(([key, _]) => (
                <TableCell key={key} className="text-xs">
                  {statusCol === key ? <StatusBadge status={r[key]} /> : moneyCol === key ? <span className="tnum font-medium">{money?.(Number(r[key])) ?? r[key]}</span> : dateCol === key ? formatDate(r[key], undefined) : <span className="truncate">{String(r[key] ?? "—")}</span>}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
