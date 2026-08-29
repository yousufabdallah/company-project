"use client";

import { useT } from "@/lib/format";
import { useApi, LoadingRows, PageHeader, useApiMutation } from "@/components/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEffect, useState } from "react";
import { Settings2, Save, Globe } from "lucide-react";
import { useApp } from "@/lib/store";

export function SettingsView() {
  const { t } = useT();
  const { data, isLoading } = useApi<any>("/api/settings");
  const { invalidate, toastSuccess, toastError } = useApiMutation();
  const lang = useApp((s) => s.lang);
  const setLang = useApp((s) => s.setLang);
  const [form, setForm] = useState<any>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (data) setForm(data);
  }, [data]);

  if (isLoading || !form) return <div><PageHeader title={t("settings")} /><LoadingRows rows={6} /></div>;

  const update = (k: string, v: any) => setForm({ ...form, [k]: v });

  const save = async () => {
    try {
      await fetch("/api/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      invalidate(["/api/settings", "/api/dashboard"]);
      toastSuccess();
    } catch {
      toastError("Error");
    }
  };

  return (
    <div>
      <PageHeader title={t("settings")} subtitle={t("workshopInfo")}>
        <Button size="sm" onClick={save}><Save className="h-4 w-4 me-1" />{t("save")}</Button>
      </PageHeader>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Workshop info */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-base"><Settings2 className="h-4 w-4" />{t("workshopInfo")}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={t("workshopName")}><Input value={form.name || ""} onChange={(e) => update("name", e.target.value)} /></Field>
              <Field label={t("phone")}><Input value={form.phone || ""} onChange={(e) => update("phone", e.target.value)} /></Field>
              <Field label={t("whatsapp")}><Input value={form.whatsapp || ""} onChange={(e) => update("whatsapp", e.target.value)} /></Field>
              <Field label={t("email")}><Input value={form.email || ""} onChange={(e) => update("email", e.target.value)} /></Field>
              <Field label={t("crNumber")}><Input value={form.crNumber || ""} onChange={(e) => update("crNumber", e.target.value)} /></Field>
              <Field label={t("taxNumber")}><Input value={form.taxNumber || ""} onChange={(e) => update("taxNumber", e.target.value)} /></Field>
            </div>
            <Field label={t("address")}><Textarea value={form.address || ""} onChange={(e) => update("address", e.target.value)} rows={2} /></Field>
            <Field label={t("workingHours")}><Input value={form.workingHours || ""} onChange={(e) => update("workingHours", e.target.value)} /></Field>
          </CardContent>
        </Card>

        {/* Localization & finance */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-base"><Globe className="h-4 w-4" />{t("language")}</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Field label={t("language")}>
                <Select value={lang} onValueChange={(v) => setLang(v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">{t("english")}</SelectItem>
                    <SelectItem value="ar">{t("arabic")}</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label={t("currency")}>
                <Select value={form.currency || "OMR"} onValueChange={(v) => update("currency", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["OMR", "AED", "SAR", "USD"].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label={t("taxPercent")}><Input type="number" step="0.01" value={form.taxPercent ?? 0} onChange={(e) => update("taxPercent", Number(e.target.value))} /></Field>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">{t("invoicePrefix")}</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Field label={t("invoicePrefix")}><Input value={form.invoicePrefix || ""} onChange={(e) => update("invoicePrefix", e.target.value)} /></Field>
              <Field label={t("jobCardPrefix")}><Input value={form.jobCardPrefix || ""} onChange={(e) => update("jobCardPrefix", e.target.value)} /></Field>
              <Field label={t("estimates")}><Input value={form.estimatePrefix || ""} onChange={(e) => update("estimatePrefix", e.target.value)} /></Field>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="mt-4">
        <CardHeader className="pb-2"><CardTitle className="text-base">{t("invoiceFooter")} & {t("termsConditions")}</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Field label={t("invoiceFooter")}><Textarea value={form.invoiceFooter || ""} onChange={(e) => update("invoiceFooter", e.target.value)} rows={2} /></Field>
          <Field label={t("termsConditions")}><Textarea value={form.terms || ""} onChange={(e) => update("terms", e.target.value)} rows={4} /></Field>
        </CardContent>
      </Card>

      <div className="mt-4 flex justify-end">
        <Button onClick={save}><Save className="h-4 w-4 me-1" />{t("save")}</Button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}
