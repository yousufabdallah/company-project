"use client";

import { useApp } from "@/lib/store";
import { useT } from "@/lib/format";
import { authenticate, DEMO_USERS } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Wrench, ArrowLeft, ArrowRight, Mail, Lock, ShieldCheck, ChevronRight } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export function LoginScreen() {
  const { t, lang } = useT();
  const setScreen = useApp((s) => s.setScreen);
  const login = useApp((s) => s.login);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const Arrow = lang === "ar" ? ArrowLeft : ArrowRight;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    setTimeout(() => {
      const user = authenticate(email, password);
      if (user) {
        login({ name: user.name, email: user.email, role: user.role, tenantName: user.tenantName });
        toast.success(`${t("signInAs")} ${user.name}`);
      } else {
        setError(t("invalidCredentials"));
      }
      setLoading(false);
    }, 400);
  };

  const quickLogin = (userEmail: string) => {
    setEmail(userEmail);
    setPassword(DEMO_USERS.find((u) => u.email === userEmail)?.password || "");
    setError("");
  };

  // Group demo users by type
  const workshopUsers = DEMO_USERS.filter((u) => u.role !== "super_admin");
  const superAdmin = DEMO_USERS.find((u) => u.role === "super_admin");

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
          <Button variant="ghost" size="sm" onClick={() => setScreen("landing")}>
            <ArrowLeft className="h-4 w-4 me-1" />
            {t("backToHome")}
          </Button>
        </div>
      </header>

      <div className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="grid w-full max-w-5xl gap-6 lg:grid-cols-2">
          {/* Login form */}
          <Card className="mx-auto w-full max-w-md self-center">
            <CardHeader>
              <h1 className="text-2xl font-bold tracking-tight">{t("loginTitle")}</h1>
              <p className="text-sm text-muted-foreground">{t("loginSubtitle")}</p>
            </CardHeader>
            <CardContent>
              <form onSubmit={submit} className="space-y-4">
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
                      required
                      autoComplete="email"
                    />
                  </div>
                </div>
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
                      required
                      autoComplete="current-password"
                    />
                  </div>
                </div>

                {error && (
                  <div className="rounded-md bg-destructive/10 border border-destructive/30 px-3 py-2 text-xs text-destructive">
                    {error}
                  </div>
                )}

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? t("loading") : t("signIn")}
                  {!loading && <Arrow className="h-4 w-4 ms-1" />}
                </Button>

                <div className="text-center text-xs text-muted-foreground">
                  {t("dontHaveAccount")}{" "}
                  <button type="button" onClick={() => setScreen("landing")} className="font-medium text-primary hover:underline">
                    {t("startTrial")}
                  </button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Demo credentials */}
          <div className="self-center">
            <div className="mb-3 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm font-semibold">{t("demoCredentials")}</p>
            </div>
            <div className="space-y-3">
              {/* Workshop users */}
              <div className="rounded-lg border bg-background p-3">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{t("appName")}</p>
                <div className="space-y-1.5">
                  {workshopUsers.map((u) => (
                    <button
                      key={u.email}
                      onClick={() => quickLogin(u.email)}
                      className="group flex w-full items-center gap-2.5 rounded-md border border-transparent px-2 py-1.5 text-start hover:border-border hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                        {u.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium">{u.name}</p>
                        <p className="truncate text-[10px] text-muted-foreground font-mono">{u.email}</p>
                      </div>
                      <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[9px] font-medium">
                        {t("demo" + u.role.charAt(0).toUpperCase() + u.role.slice(1))}
                      </span>
                      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Super admin */}
              {superAdmin && (
                <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-primary">{t("superAdminPanel")}</p>
                  <button
                    onClick={() => quickLogin(superAdmin.email)}
                    className="group flex w-full items-center gap-2.5 rounded-md border border-transparent px-2 py-1.5 text-start hover:bg-background transition-colors"
                  >
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <ShieldCheck className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium">{superAdmin.name}</p>
                      <p className="truncate text-[10px] text-muted-foreground font-mono">{superAdmin.email}</p>
                    </div>
                    <span className="shrink-0 rounded bg-primary px-1.5 py-0.5 text-[9px] font-medium text-primary-foreground">
                      {t("demoSuperAdmin")}
                    </span>
                    <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100" />
                  </button>
                </div>
              )}
            </div>
            <p className="mt-3 text-center text-[10px] text-muted-foreground">
              {t("password")}: <span className="font-mono">demo1234</span> · {t("superAdminPanel")}: <span className="font-mono">admin123</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
