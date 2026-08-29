"use client";

import { useT, formatDate, formatDateTime } from "@/lib/format";
import { useApi, useApiMutation, EmptyState, LoadingRows, PageHeader } from "@/components/shared";
import { useApp } from "@/lib/store";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UsersRound, Plus, Pencil, Trash2, ShieldCheck, Loader2, Mail, Phone, UserCheck, UserX } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const ROLES = ["owner", "manager", "advisor", "technician", "accountant", "inventory"];

const ROLE_META: Record<string, { icon: any; color: string }> = {
  owner: { icon: ShieldCheck, color: "bg-primary text-primary-foreground" },
  manager: { icon: UsersRound, color: "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300" },
  advisor: { icon: UserCheck, color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" },
  technician: { icon: UserCheck, color: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300" },
  accountant: { icon: UserCheck, color: "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300" },
  inventory: { icon: UserCheck, color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" },
};

export function UsersView() {
  const { t, lang } = useT();
  const { data, isLoading } = useApi<any>("/api/users");
  const { invalidate, toastSuccess, toastError } = useApiMutation();
  const user = useApp((s) => s.user);
  const [editing, setEditing] = useState<any>(null);
  const [creating, setCreating] = useState(false);

  const canManage = user?.role === "owner" || user?.role === "manager";

  if (isLoading || !data) {
    return <div><PageHeader title={t("users")} subtitle={t("usersDesc")} /><LoadingRows rows={6} /></div>;
  }

  const users = data.items || [];
  const byRole = data.byRole || {};

  return (
    <div>
      <PageHeader title={t("users")} subtitle={`${users.length} ${t("employeesCount")}`}>
        {canManage && <Button size="sm" onClick={() => setCreating(true)}><Plus className="h-4 w-4 me-1" />{t("addEmployee")}</Button>}
      </PageHeader>

      {/* Role overview cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6 mb-5">
        {ROLES.map((role) => {
          const Icon = ROLE_META[role]?.icon || UserCheck;
          const count = byRole[role] || 0;
          const cls = ROLE_META[role]?.color || "bg-muted text-muted-foreground";
          return (
            <Card key={role} className="hover:shadow-sm transition-shadow">
              <CardContent className="p-3 text-center">
                <div className={`mx-auto flex h-8 w-8 items-center justify-center rounded-full ${cls}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <p className="mt-1.5 text-lg font-bold tnum">{count}</p>
                <p className="text-[10px] text-muted-foreground truncate">{t("role" + role.charAt(0).toUpperCase() + role.slice(1))}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Users table */}
      <Card>
        <CardContent className="p-3 sm:p-4">
          {users.length === 0 ? (
            <EmptyState title={t("noData")} icon={UsersRound} />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">{t("fullName")}</TableHead>
                    <TableHead className="text-xs hidden md:table-cell">{t("userEmail")}</TableHead>
                    <TableHead className="text-xs hidden sm:table-cell">{t("userPhone")}</TableHead>
                    <TableHead className="text-xs">{t("userRole")}</TableHead>
                    <TableHead className="text-xs hidden lg:table-cell">{t("createdAt")}</TableHead>
                    <TableHead className="text-xs">{t("status")}</TableHead>
                    <TableHead className="text-xs text-end">{t("actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u: any) => {
                    const roleIcon = ROLE_META[u.role]?.icon || UserCheck;
                    const roleCls = ROLE_META[u.role]?.color || "bg-muted";
                    const isSelf = u.id === user?.id || u.email === user?.email;
                    return (
                      <TableRow key={u.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                              {u.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{u.name} {isSelf && <span className="text-[10px] text-muted-foreground">(you)</span>}</p>
                              <p className="text-[10px] text-muted-foreground md:hidden">{u.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-xs text-muted-foreground font-mono">{u.email}</TableCell>
                        <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">{u.phone || "—"}</TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${roleCls}`}>
                            {t("role" + u.role.charAt(0).toUpperCase() + u.role.slice(1))}
                          </span>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">{formatDate(u.createdAt, lang)}</TableCell>
                        <TableCell>
                          {u.active ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                              <UserCheck className="h-3 w-3" />{t("userActive")}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-medium text-red-700 dark:bg-red-950 dark:text-red-300">
                              <UserX className="h-3 w-3" />{t("userInactive")}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-end">
                          {canManage && !isSelf && (
                            <div className="flex items-center justify-end gap-1">
                              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditing(u)}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={async () => {
                                if (!confirm(t("confirmDelete"))) return;
                                try {
                                  const res = await fetch(`/api/users/${u.id}`, { method: "DELETE" });
                                  if (!res.ok) {
                                    const err = await res.json();
                                    toastError(err.error === "cannot_delete_self" ? t("cannotDeleteSelf") : err.error === "last_owner" ? t("cannotDeleteLastOwner") : "Error");
                                    return;
                                  }
                                  invalidate(["/api/users"]);
                                  toastSuccess(t("userDeleted"));
                                } catch { toastError("Error"); }
                              }}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          )}
                          {canManage && isSelf && (
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditing(u)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create / Edit dialog */}
      {(creating || editing) && (
        <UserDialog
          user={editing}
          onClose={() => { setCreating(false); setEditing(null); }}
          onSaved={() => { invalidate(["/api/users"]); setCreating(false); setEditing(null); }}
        />
      )}
    </div>
  );
}

// ─── User Create/Edit Dialog ──────────────────────────────────
function UserDialog({ user, onClose, onSaved }: { user: any; onClose: () => void; onSaved: () => void }) {
  const { t } = useT();
  const { toastSuccess, toastError } = useApiMutation();
  const [form, setForm] = useState({
    name: user?.name || "",
    email: user?.email || "",
    phone: user?.phone || "",
    role: user?.role || "advisor",
    password: "",
    active: user?.active ?? true,
  });
  const [saving, setSaving] = useState(false);
  const isEdit = !!user;

  const submit = async () => {
    if (!form.name.trim()) return toastError(t("required"));
    if (!form.email.trim()) return toastError(t("required"));
    if (!isEdit && (!form.password || form.password.length < 6)) return toastError(t("userPasswordHint"));

    setSaving(true);
    try {
      const url = isEdit ? `/api/users/${user.id}` : "/api/users";
      const method = isEdit ? "PATCH" : "POST";
      const body: any = { name: form.name, email: form.email, phone: form.phone, role: form.role, active: form.active };
      if (form.password) body.password = form.password;

      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) {
        if (data.error === "email_in_use") toastError(t("emailInUse"));
        else if (data.error === "password_short") toastError(t("userPasswordHint"));
        else if (data.error === "last_owner") toastError(t("cannotDeleteLastOwner"));
        else toastError("Error");
        return;
      }
      toastSuccess(t("userSaved"));
      onSaved();
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
          <DialogTitle className="flex items-center gap-2">
            <UsersRound className="h-5 w-5" />
            {isEdit ? t("editUser") : t("addEmployee")}
          </DialogTitle>
          <DialogDescription className="sr-only">{t("users")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {/* Name */}
          <div className="space-y-1.5">
            <Label className="text-xs">{t("fullName")} *</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={t("fullName")} autoFocus />
          </div>

          {/* Email + Phone */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">{t("userEmail")} *</Label>
              <div className="relative">
                <Mail className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="user@example.com" className="ps-9" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t("userPhone")}</Label>
              <div className="relative">
                <Phone className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+968 ..." className="ps-9" />
              </div>
            </div>
          </div>

          {/* Role selector */}
          <div className="space-y-1.5">
            <Label className="text-xs">{t("userRole")} *</Label>
            <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => (
                  <SelectItem key={r} value={r}>
                    <div className="flex flex-col">
                      <span>{t("role" + r.charAt(0).toUpperCase() + r.slice(1))}</span>
                      <span className="text-[10px] text-muted-foreground">{t("role" + r.charAt(0).toUpperCase() + r.slice(1) + "Desc")}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <Label className="text-xs">{t("userPassword")} {!isEdit && "*"}</Label>
            <Input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder={isEdit ? "••••••••" : "Min 6 characters"}
            />
            <p className="text-[10px] text-muted-foreground">{t("userPasswordHint")}</p>
          </div>

          {/* Active toggle */}
          <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-3">
            <div>
              <Label className="text-sm font-semibold">{t("userActive")}</Label>
              <p className="text-[11px] text-muted-foreground">{t("userActiveDesc")}</p>
            </div>
            <Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>{t("cancel")}</Button>
            <Button onClick={submit} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin me-1" />}
              {t("save")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
