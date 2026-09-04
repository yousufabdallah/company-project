"use client";

import { useState, useMemo } from "react";
import { useT } from "@/lib/format";
import { useApiMutation } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useApi } from "@/components/shared";
import { Loader2, Search } from "lucide-react";

function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">
        {label} {required && <span className="text-red-500">*</span>}
      </Label>
      {children}
    </div>
  );
}

// ─── Reusable Customer Search Picker ──────────────────────────
function CustomerSearchPicker({ customers, selectedId, onSelect }: {
  customers: any[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const { t } = useT();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);

  const selected = customers.find((c: any) => c.id === selectedId) || null;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return customers.slice(0, 30);
    return customers.filter((c: any) =>
      c.name.toLowerCase().includes(q) ||
      (c.mobile || "").includes(q) ||
      (c.whatsapp || "").includes(q) ||
      (c.vehicles || []).some((v: any) => (v.plateNumber || "").toLowerCase().includes(q))
    ).slice(0, 30);
  }, [customers, search]);

  if (selected) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-lg border bg-muted/30 p-2.5">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{selected.name}</p>
          <p className="truncate text-xs text-muted-foreground">{selected.mobile}</p>
        </div>
        <Button type="button" variant="ghost" size="sm" className="h-7 shrink-0 text-xs" onClick={() => onSelect("")}>{t("changeCustomer") || t("edit")}</Button>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => { setSearch(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder={t("searchCustomer")}
          className="ps-9"
          autoComplete="off"
        />
      </div>
      {open && filtered.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover p-1 shadow-md max-h-64 overflow-y-auto scroll-thin">
          {filtered.map((c: any) => (
            <button
              key={c.id}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => { onSelect(c.id); setSearch(""); setOpen(false); }}
              className="flex w-full items-center gap-2.5 rounded px-2 py-2 text-start hover:bg-accent"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                {c.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{c.name}</p>
                <p className="truncate text-xs text-muted-foreground">{c.mobile}</p>
              </div>
              {(c.vehicles?.length ?? 0) > 0 && (
                <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground tnum">
                  {c.vehicles.map((v: any) => v.plateNumber).join(" · ")}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
      {open && filtered.length === 0 && search.trim() && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover p-3 text-center text-xs text-muted-foreground shadow-md">
          {t("noResultsFound")}
        </div>
      )}
    </div>
  );
}

async function submit(url: string, body: any) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("Failed");
  return res.json();
}

export function QuickCustomerForm({ onDone }: { onDone: () => void }) {
  const { t } = useT();
  const { invalidate, toastSuccess, toastError } = useApiMutation();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", mobile: "", whatsapp: "", email: "", address: "", type: "individual", notes: "" });

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (!form.name || !form.mobile) return toastError(t("required"));
        setSaving(true);
        try {
          await submit("/api/customers", form);
          invalidate(["/api/customers"]);
          toastSuccess();
          onDone();
        } catch {
          toastError("Error");
        } finally {
          setSaving(false);
        }
      }}
      className="space-y-3"
    >
      <div className="grid grid-cols-2 gap-3">
        <Field label={t("customerName")} required>
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        </Field>
        <Field label={t("mobile")} required>
          <Input value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} required />
        </Field>
        <Field label={t("whatsapp")}>
          <Input value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} />
        </Field>
        <Field label={t("email")}>
          <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </Field>
        <Field label={t("customerType")}>
          <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="individual">{t("individual")}</SelectItem>
              <SelectItem value="corporate">{t("corporate")}</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label={t("address")}>
          <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
        </Field>
      </div>
      <Field label={t("notes")}>
        <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
      </Field>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onDone}>{t("cancel")}</Button>
        <Button type="submit" disabled={saving}>{saving && <Loader2 className="h-4 w-4 animate-spin me-1" />}{t("save")}</Button>
      </div>
    </form>
  );
}

export function QuickVehicleForm({ onDone }: { onDone: () => void }) {
  const { t } = useT();
  const { invalidate, toastSuccess, toastError } = useApiMutation();
  const { data: cust } = useApi<any>("/api/customers");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ customerId: "", plateNumber: "", vin: "", make: "", model: "", year: "", color: "", fuelType: "Petrol", mileage: "0" });

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (!form.customerId || !form.plateNumber || !form.make || !form.model) return toastError(t("required"));
        setSaving(true);
        try {
          await submit("/api/vehicles", { ...form, year: Number(form.year), mileage: Number(form.mileage) });
          invalidate(["/api/vehicles", "/api/customers"]);
          toastSuccess();
          onDone();
        } catch {
          toastError("Error");
        } finally {
          setSaving(false);
        }
      }}
      className="space-y-3"
    >
      <Field label={t("customer")} required>
        <CustomerSearchPicker
          customers={cust?.items || []}
          selectedId={form.customerId}
          onSelect={(v) => setForm({ ...form, customerId: v })}
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t("plateNumber")} required>
          <Input value={form.plateNumber} onChange={(e) => setForm({ ...form, plateNumber: e.target.value })} required />
        </Field>
        <Field label={t("vin")}>
          <Input value={form.vin} onChange={(e) => setForm({ ...form, vin: e.target.value })} />
        </Field>
        <Field label={t("make")} required>
          <Input value={form.make} onChange={(e) => setForm({ ...form, make: e.target.value })} required />
        </Field>
        <Field label={t("model")} required>
          <Input value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} required />
        </Field>
        <Field label={t("year")}>
          <Input type="number" value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} />
        </Field>
        <Field label={t("color")}>
          <Input value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} />
        </Field>
        <Field label={t("fuelType")}>
          <Select value={form.fuelType} onValueChange={(v) => setForm({ ...form, fuelType: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Petrol">Petrol</SelectItem>
              <SelectItem value="Diesel">Diesel</SelectItem>
              <SelectItem value="Hybrid">Hybrid</SelectItem>
              <SelectItem value="Electric">Electric</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label={t("mileage")}>
          <Input type="number" value={form.mileage} onChange={(e) => setForm({ ...form, mileage: e.target.value })} />
        </Field>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onDone}>{t("cancel")}</Button>
        <Button type="submit" disabled={saving}>{saving && <Loader2 className="h-4 w-4 animate-spin me-1" />}{t("save")}</Button>
      </div>
    </form>
  );
}

export function QuickAppointmentForm({ onDone }: { onDone: () => void }) {
  const { t } = useT();
  const { invalidate, toastSuccess, toastError } = useApiMutation();
  const { data: cust } = useApi<any>("/api/customers");
  const { data: svc } = useApi<any>("/api/services?active=1");
  const [saving, setSaving] = useState(false);
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({ customerId: "", vehicleId: "", serviceId: "", date: today, time: "09:00", technicianId: "", notes: "" });

  const vehicles = (cust?.items || []).find((c: any) => c.id === form.customerId)?.vehicles || [];

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (!form.customerId) return toastError(t("required"));
        setSaving(true);
        try {
          await submit("/api/appointments", form);
          invalidate(["/api/appointments", "/api/dashboard"]);
          toastSuccess();
          onDone();
        } catch {
          toastError("Error");
        } finally {
          setSaving(false);
        }
      }}
      className="space-y-3"
    >
      <Field label={t("customer")} required>
        <CustomerSearchPicker
          customers={cust?.items || []}
          selectedId={form.customerId}
          onSelect={(v) => setForm({ ...form, customerId: v, vehicleId: "" })}
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t("vehicle")}>
          <Select value={form.vehicleId} onValueChange={(v) => setForm({ ...form, vehicleId: v })} disabled={!form.customerId}>
            <SelectTrigger><SelectValue placeholder={t("vehicle")} /></SelectTrigger>
            <SelectContent>
              {vehicles.map((v: any) => (
                <SelectItem key={v.id} value={v.id}>{v.plateNumber} · {v.make} {v.model}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label={t("services")}>
          <Select value={form.serviceId} onValueChange={(v) => setForm({ ...form, serviceId: v })}>
            <SelectTrigger><SelectValue placeholder={t("services")} /></SelectTrigger>
            <SelectContent>
              {(svc?.items || []).map((s: any) => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label={t("date")} required>
          <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
        </Field>
        <Field label={t("time")} required>
          <Input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} required />
        </Field>
      </div>
      <Field label={t("notes")}>
        <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
      </Field>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onDone}>{t("cancel")}</Button>
        <Button type="submit" disabled={saving}>{saving && <Loader2 className="h-4 w-4 animate-spin me-1" />}{t("save")}</Button>
      </div>
    </form>
  );
}

export function QuickPaymentForm({ onDone }: { onDone: () => void }) {
  const { t } = useT();
  const { invalidate, toastSuccess, toastError } = useApiMutation();
  const { data: cust } = useApi<any>("/api/customers");
  const [saving, setSaving] = useState(false);
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({ customerId: "", invoiceId: "", amount: "", method: "cash", date: today, reference: "", note: "" });

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (!form.customerId || !form.amount) return toastError(t("required"));
        setSaving(true);
        try {
          const res = await fetch("/api/payments", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...form, amount: Number(form.amount) }),
          });
          const data = await res.json();
          if (!res.ok) {
            toastError(data.error || "Error");
            return;
          }
          invalidate(["/api/payments", "/api/invoices", "/api/customers", "/api/dashboard", "/api/accounts"]);
          if (data.changeDue && data.changeDue > 0) {
            toastSuccess(`${t("change")}: ${data.changeDue} OMR`);
          } else {
            toastSuccess();
          }
          onDone();
        } catch {
          toastError("Error");
        } finally {
          setSaving(false);
        }
      }}
      className="space-y-3"
    >
      <Field label={t("customer")} required>
        <CustomerSearchPicker
          customers={cust?.items || []}
          selectedId={form.customerId}
          onSelect={(v) => setForm({ ...form, customerId: v })}
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t("amount")} required>
          <Input type="number" step="0.001" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
        </Field>
        <Field label={t("paymentMethod")}>
          <Select value={form.method} onValueChange={(v) => setForm({ ...form, method: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="cash">{t("cash")}</SelectItem>
              <SelectItem value="card">{t("card")}</SelectItem>
              <SelectItem value="bank">{t("bankTransfer")}</SelectItem>
              <SelectItem value="other">{t("other")}</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label={t("date")} required>
          <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
        </Field>
        <Field label={t("reference")}>
          <Input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} />
        </Field>
      </div>
      <Field label={t("notes")}>
        <Textarea value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} rows={2} />
      </Field>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onDone}>{t("cancel")}</Button>
        <Button type="submit" disabled={saving}>{saving && <Loader2 className="h-4 w-4 animate-spin me-1" />}{t("save")}</Button>
      </div>
    </form>
  );
}

export function QuickPartForm({ onDone }: { onDone: () => void }) {
  const { t } = useT();
  const { invalidate, toastSuccess, toastError } = useApiMutation();
  const { data: sup } = useApi<any>("/api/suppliers");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ sku: "", name: "", nameAr: "", brand: "", supplierId: "", costPrice: "0", sellingPrice: "0", quantity: "0", minStock: "5", location: "" });

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (!form.sku || !form.name) return toastError(t("required"));
        setSaving(true);
        try {
          await submit("/api/parts", {
            ...form,
            costPrice: Number(form.costPrice),
            sellingPrice: Number(form.sellingPrice),
            quantity: Number(form.quantity),
            minStock: Number(form.minStock),
          });
          invalidate(["/api/parts", "/api/dashboard"]);
          toastSuccess();
          onDone();
        } catch {
          toastError("Error");
        } finally {
          setSaving(false);
        }
      }}
      className="space-y-3"
    >
      <div className="grid grid-cols-2 gap-3">
        <Field label={t("sku")} required>
          <Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} required />
        </Field>
        <Field label={t("barcode")}>
          <Input value={""} disabled placeholder="auto" />
        </Field>
        <Field label={t("name")} required>
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        </Field>
        <Field label={t("brand")}>
          <Input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} />
        </Field>
        <Field label={t("supplier")}>
          <Select value={form.supplierId} onValueChange={(v) => setForm({ ...form, supplierId: v })}>
            <SelectTrigger><SelectValue placeholder={t("supplier")} /></SelectTrigger>
            <SelectContent>
              {(sup?.items || []).map((s: any) => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label={t("location")}>
          <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
        </Field>
        <Field label={t("costPrice")}>
          <Input type="number" step="0.001" value={form.costPrice} onChange={(e) => setForm({ ...form, costPrice: e.target.value })} />
        </Field>
        <Field label={t("sellingPrice")}>
          <Input type="number" step="0.001" value={form.sellingPrice} onChange={(e) => setForm({ ...form, sellingPrice: e.target.value })} />
        </Field>
        <Field label={t("stockQty")}>
          <Input type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
        </Field>
        <Field label={t("minStock")}>
          <Input type="number" value={form.minStock} onChange={(e) => setForm({ ...form, minStock: e.target.value })} />
        </Field>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onDone}>{t("cancel")}</Button>
        <Button type="submit" disabled={saving}>{saving && <Loader2 className="h-4 w-4 animate-spin me-1" />}{t("save")}</Button>
      </div>
    </form>
  );
}
