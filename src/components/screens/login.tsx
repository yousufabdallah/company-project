"use client";

import { useApp } from "@/lib/store";
import { useT } from "@/lib/format";
import { authenticate, DEMO_USERS } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Wrench, ArrowLeft, ArrowRight, Mail, Lock, Eye, EyeOff, ShieldCheck, Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export function LoginScreen() {
  const { t, lang } = useT();
  const setScreen = useApp((s) => s.setScreen);
  const login = useApp((s) => s.login);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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

  // Discreet demo login — logs in directly without exposing credentials on screen
  const demoLogin = (role: string) => {
    const user = DEMO_USERS.find((u) => u.role === role);
    if (user) {
      login({ name: user.name, email: user.email, role: user.role, tenantName: user.tenantName });
      toast.success(`${t("signInAs")} ${user.name}`);
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
          <Button variant="ghost" size="sm" onClick={() => setScreen("landing")}>
            <ArrowLeft className="h-4 w-4 me-1" />
            {t("backToHome")}
          </Button>
        </div>
      </header>

      <div className="flex flex-1 items-center justify-center px-4 py-10">
        {/* Single clean login card — no credentials displayed */}
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-2">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Wrench className="h-6 w-6" />
            </div>
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
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-xs">{t("password")}</Label>
                  <button type="button" className="text-[11px] text-muted-foreground hover:text-primary">
                    {t("password") === "كلمة المرور" ? "نسيت كلمة المرور؟" : "Forgot password?"}
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="ps-9 pe-9"
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
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

            {/* Discreet demo login — no credentials shown */}
            <div className="mt-5 pt-4 border-t">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button type="button" variant="ghost" size="sm" className="w-full text-xs text-muted-foreground hover:text-foreground">
                    <Sparkles className="h-3.5 w-3.5 me-1.5" />
                    {t("password") === "كلمة المرور" ? "دخول تجريبي" : "Demo Login"}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center" className="w-full min-w-[260px]">
                  <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    {t("signInAs")}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {DEMO_USERS.map((u) => (
                    <DropdownMenuItem
                      key={u.role}
                      onClick={() => demoLogin(u.role)}
                      className="cursor-pointer gap-2.5 py-1.5"
                    >
                      <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${u.role === "super_admin" ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"}`}>
                        {u.role === "super_admin" ? <ShieldCheck className="h-3 w-3" /> : u.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium">{t("demo" + u.role.charAt(0).toUpperCase() + u.role.slice(1))}</p>
                      </div>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
