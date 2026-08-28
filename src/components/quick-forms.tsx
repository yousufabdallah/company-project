"use client";

import { useState } from "react";
import { useT } from "@/lib/format";
import { useApiMutation } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useApi } from "@/components/shared";
import { Loader2 } from "lucide-react";

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
        <Select value={form.customerId} onValueChange={(v) => setForm({ ...form, customerId: v })}>
          <SelectTrigger><SelectValue placeholder={t("customer")} /></SelectTrigger>
          <SelectContent>
            {(cust?.items || []).map((c: any) => (
              <SelectItem key={c.id} value={c.id}>{c.name} · {c.mobile}</SelectItem>
            ))}
          </SelectContent>
        </Select>
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
  const { data: svc } = useApi<any>("/api/services");
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
        <Select value={form.customerId} onValueChange={(v) => setForm({ ...form, customerId: v, vehicleId: "" })}>
          <SelectTrigger><SelectValue placeholder={t("customer")} /></SelectTrigger>
          <SelectContent>
            {(cust?.items || []).map((c: any) => (
              <SelectItem key={c.id} value={c.id}>{c.name} · {c.mobile}</SelectItem>
            ))}
          </SelectContent>
        </Select>
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
          await submit("/api/payments", { ...form, amount: Number(form.amount) });
          invalidate(["/api/payments", "/api/invoices", "/api/customers", "/api/dashboard"]);
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
        <Select value={form.customerId} onValueChange={(v) => setForm({ ...form, customerId: v })}>
          <SelectTrigger><SelectValue placeholder={t("customer")} /></SelectTrigger>
          <SelectContent>
            {(cust?.items || []).map((c: any) => (
              <SelectItem key={c.id} value={c.id}>{c.name} · {c.mobile}</SelectItem>
            ))}
          </SelectContent>
        </Select>
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
