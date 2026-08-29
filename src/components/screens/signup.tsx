"use client";

import { useApp } from "@/lib/store";
import { useT } from "@/lib/format";
import { useApi } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Wrench, ArrowLeft, ArrowRight, Mail, Lock, User, Building2, Check, Loader2, Zap, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export function SignupScreen() {
  const { t, lang } = useT();
  const setScreen = useApp((s) => s.setScreen);
  const login = useApp((s) => s.login);
  const { data: plansData } = useApi<any>("/api/plans");
  const [workshopName, setWorkshopName] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [planId, setPlanId] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const Arrow = lang === "ar" ? ArrowLeft : ArrowRight;

  const plans = (plansData?.items || []) as any[];
  const currency = plansData?.currency || "OMR";
  const planPrice = (p: number) => (p % 1 === 0 ? String(p) : p.toFixed(3));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};
    if (!workshopName.trim()) newErrors.workshopName = t("enterWorkshopName");
    if (!name.trim()) newErrors.name = t("enterName");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) newErrors.email = t("validEmail");
    if (password.length < 6) newErrors.password = t("enterPassword");
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workshopName, name, email, password, planId }),
      });
      const data = await res.json();
      if (!res.ok) {
        const errKey = data.error || "error";
        if (data.field) {
          setErrors({ [data.field]: t(errKey) === errKey ? errKey : t(errKey) });
        } else {
          toast.error(t(errKey) === errKey ? errKey : t(errKey));
        }
        return;
      }
      login(data);
      toast.success(t("signupSuccess"));
    } catch {
      toast.error("Error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      {/* Top bar */}
      <header className="border-b bg-background">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
          <button onClick={() => setScreen("landing")} className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Wrench className="h-5 w-5" />
            </div>
            <span className="text-sm font-bold">{t("appName")}</span>
          </button>
          <Button variant="ghost" size="sm" onClick={() => setScreen("login")}>
            <ArrowLeft className="h-4 w-4 me-1" />
            {t("backToLogin")}
          </Button>
        </div>
      </header>

      <div className="flex flex-1 items-center justify-center px-4 py-10">
        <Card className="w-full max-w-lg">
          <CardHeader className="space-y-2">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Building2 className="h-6 w-6" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">{t("signupTitle")}</h1>
            <p className="text-sm text-muted-foreground">{t("signupSubtitle")}</p>
            <div className="inline-flex items-center gap-1.5 rounded-full border bg-background px-2.5 py-0.5 text-[11px] font-medium text-amber-700 dark:text-amber-300 w-fit">
              <Zap className="h-3 w-3" />
              {t("trialInfo")}
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-4">
              {/* Workshop name */}
              <div className="space-y-1.5">
                <Label htmlFor="workshopName" className="text-xs">{t("workshopName")}</Label>
                <div className="relative">
                  <Building2 className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="workshopName"
                    value={workshopName}
                    onChange={(e) => setWorkshopName(e.target.value)}
                    placeholder={t("workshopNamePlaceholder")}
                    className="ps-9"
                    autoComplete="organization"
                  />
                </div>
                {errors.workshopName && <p className="text-xs text-destructive">{errors.workshopName}</p>}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {/* Full name */}
                <div className="space-y-1.5">
                  <Label htmlFor="name" className="text-xs">{t("fullName")}</Label>
                  <div className="relative">
                    <User className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={t("fullNamePlaceholder")}
                      className="ps-9"
                      autoComplete="name"
                    />
                  </div>
                  {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
                </div>

                {/* Email */}
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs">{t("email")}</Label>
                  <div className="relative">
                    <Mail className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="ps-9"
                      autoComplete="email"
                    />
                  </div>
                  {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-xs">{t("password")}</Label>
                <div className="relative">
                  <Lock className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="ps-9"
                    autoComplete="new-password"
                  />
                </div>
                {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
              </div>

              {/* Plan selection */}
              <div className="space-y-2">
                <Label className="text-xs">{t("chooseYourPlan")}</Label>
                {plans.length === 0 ? (
                  <div className="flex items-center justify-center rounded-lg border border-dashed p-4">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <div className="grid gap-2">
                    {plans.map((p) => {
                      const selected = planId === p.id;
                      const recommended = p.name === "Professional";
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setPlanId(p.id)}
                          className={`group flex items-center gap-3 rounded-lg border p-3 text-start transition-all ${selected ? "border-primary bg-primary/5 ring-1 ring-primary/30" : "hover:border-primary/40 hover:bg-muted/30"}`}
                        >
                          <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${selected ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40"}`}>
                            {selected && <CheckCircle2 className="h-3.5 w-3.5" />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-semibold">{p.name}</p>
                              {recommended && (
                                <span className="rounded-full bg-primary px-1.5 py-0.5 text-[9px] font-semibold text-primary-foreground">
                                  {t("popular")}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground line-clamp-1">{p.description}</p>
                          </div>
                          <p className="shrink-0 text-end">
                            <span className="block text-sm font-bold tnum">{planPrice(p.price)}</span>
                            <span className="block text-[10px] text-muted-foreground">{currency}{t("perMonth")}</span>
                          </p>
                        </button>
                      );
                    })}
                  </div>
                )}
                {errors.planId && <p className="text-xs text-destructive">{errors.planId}</p>}
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 animate-spin me-1" />}
                {loading ? t("creatingAccount") : t("createAccount")}
                {!loading && <Arrow className="h-4 w-4 ms-1" />}
              </Button>

              <div className="text-center text-xs text-muted-foreground">
                {t("alreadyHaveAccount")}{" "}
                <button type="button" onClick={() => setScreen("login")} className="font-medium text-primary hover:underline">
                  {t("backToLogin")}
                </button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
