"use client";

import { useT } from "@/lib/format";
import { useApi, LoadingRows, PageHeader, useApiMutation } from "@/components/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEffect, useState, useRef } from "react";
import { Settings2, Save, Globe, Image as ImageIcon, Upload, X, Stamp } from "lucide-react";
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
        {/* Branding: logo + stamp */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-base"><ImageIcon className="h-4 w-4" />{t("branding")}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <BrandingUploader
              type="logo"
              label={t("workshopLogo")}
              hint={t("logoHint")}
              uploadLabel={t("uploadLogo")}
              removeLabel={t("removeLogo")}
              value={form.logo}
              onChange={(url) => { update("logo", url); }}
              onUploaded={() => { invalidate(["/api/settings", "/api/dashboard"]); toastSuccess(t("logoUploaded")); }}
            />
            <BrandingUploader
              type="stamp"
              label={t("workshopStamp")}
              hint={t("stampHint")}
              uploadLabel={t("uploadStamp")}
              removeLabel={t("removeStamp")}
              value={form.stamp}
              onChange={(url) => { update("stamp", url); }}
              onUploaded={() => { invalidate(["/api/settings", "/api/dashboard"]); toastSuccess(t("stampUploaded")); }}
            />
          </CardContent>
        </Card>

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

// ─── Branding uploader (logo / stamp) ──────────────────────────
function BrandingUploader({
  type,
  label,
  hint,
  uploadLabel,
  removeLabel,
  value,
  onChange,
  onUploaded,
}: {
  type: "logo" | "stamp";
  label: string;
  hint: string;
  uploadLabel: string;
  removeLabel: string;
  value?: string | null;
  onChange: (url: string | null) => void;
  onUploaded: () => void;
}) {
  const { t } = useT();
  const { toastError } = useApiMutation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const onFile = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("type", type);
      const res = await fetch("/api/settings/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        toastError(data.error || "Error");
        return;
      }
      onChange(data.url);
      onUploaded();
    } catch {
      toastError("Error");
    } finally {
      setUploading(false);
    }
  };

  const remove = async () => {
    onChange(null);
    // Persist removal via settings PUT is handled by the Save button, but also clear immediately
    try {
      await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [type === "logo" ? "logo" : "stamp"]: null }),
      });
    } catch {
      // ignore
    }
  };

  const isLogo = type === "logo";

  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <div className="rounded-lg border p-3">
        {value ? (
          <div className="flex items-center gap-3">
            <div className={`flex shrink-0 items-center justify-center rounded bg-muted/50 ${isLogo ? "h-16 w-16" : "h-20 w-20"}`}>
              <img src={value} alt={label} className={isLogo ? "max-h-14 max-w-14 object-contain" : "max-h-18 max-w-18 object-contain opacity-90"} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs text-muted-foreground font-mono">{value}</p>
              <div className="mt-1.5 flex gap-1.5">
                <Button type="button" size="sm" variant="outline" className="h-7 text-xs" disabled={uploading} onClick={() => inputRef.current?.click()}>
                  <Upload className="h-3 w-3 me-1" />{uploading ? t("uploading") : t("uploadLogo")}
                </Button>
                <Button type="button" size="sm" variant="ghost" className="h-7 text-xs text-destructive hover:text-destructive" onClick={remove}>
                  <X className="h-3 w-3 me-1" />{removeLabel}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="flex w-full flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed py-6 text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors"
          >
            {isLogo ? <ImageIcon className="h-6 w-6" /> : <Stamp className="h-6 w-6" />}
            <span className="text-xs">{uploading ? t("uploading") : uploadLabel}</span>
            <span className="text-[10px] text-muted-foreground/80">{isLogo ? "PNG / JPG / SVG" : "PNG"}</span>
          </button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml,image/gif"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onFile(f);
            e.target.value = "";
          }}
        />
      </div>
      <p className="text-[10px] text-muted-foreground">{hint}</p>
    </div>
  );
}
