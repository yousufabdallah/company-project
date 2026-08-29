"use client";

import { useApp } from "@/lib/store";
import { useT } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Wrench, Globe, Moon, Sun, Check, ArrowLeft, ArrowRight, ShoppingCart, Receipt, Users, Car, BarChart3, Building2, ShieldCheck, Zap, Star } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function LandingScreen() {
  const { t, lang } = useT();
  const setScreen = useApp((s) => s.setScreen);
  const toggleLang = useApp((s) => s.toggleLang);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);
  const Arrow = lang === "ar" ? ArrowLeft : ArrowRight;

  const features = [
    { icon: Wrench, title: t("featureJobCards"), desc: t("featureJobCardsDesc") },
    { icon: ShoppingCart, title: t("featureInventory"), desc: t("featureInventoryDesc") },
    { icon: Receipt, title: t("featureInvoicing"), desc: t("featureInvoicingDesc") },
    { icon: Users, title: t("featureCrm"), desc: t("featureCrmDesc") },
    { icon: BarChart3, title: t("featureReports"), desc: t("featureReportsDesc") },
    { icon: Building2, title: t("featureMultiTenant"), desc: t("featureMultiTenantDesc") },
  ];

  const plans = [
    {
      name: t("planBasic"),
      price: t("planBasicPrice"),
      popular: false,
      features: [t("planBasicFeat1"), t("planBasicFeat2"), t("planBasicFeat3"), t("planBasicFeat4")],
    },
    {
      name: t("planProfessional"),
      price: t("planProfessionalPrice"),
      popular: true,
      features: [t("planProFeat1"), t("planProFeat2"), t("planProFeat3"), t("planProFeat4")],
    },
    {
      name: t("planEnterprise"),
      price: t("planEnterprisePrice"),
      popular: false,
      features: [t("planEntFeat1"), t("planEntFeat2"), t("planEntFeat3"), t("planEntFeat4")],
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Top nav */}
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
              <Wrench className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-bold leading-tight">{t("appName")}</p>
              <p className="text-[10px] text-muted-foreground leading-tight">{t("appTagline")}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Button variant="ghost" size="icon" onClick={toggleLang} aria-label="Language">
              <Globe className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} aria-label="Theme">
              {mounted && theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setScreen("login")} className="hidden sm:inline-flex">{t("heroLogin")}</Button>
            <Button size="sm" onClick={() => setScreen("login")}>{t("heroCta")}</Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/5 via-transparent to-primary/10" />
        <div className="mx-auto max-w-6xl px-4 py-16 sm:py-24 text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border bg-background px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm">
            <Zap className="h-3 w-3 text-amber-500" />
            {t("heroBadge")}
          </span>
          <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-bold tracking-tight sm:text-6xl">
            {t("heroTitle")}
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base text-muted-foreground sm:text-lg">
            {t("heroSubtitle")}
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button size="lg" onClick={() => setScreen("login")} className="w-full sm:w-auto">
              {t("heroCta")}
              <Arrow className="h-4 w-4 ms-2" />
            </Button>
            <Button size="lg" variant="outline" onClick={() => setScreen("login")} className="w-full sm:w-auto">
              {t("heroLogin")}
            </Button>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">{t("trustedBy")}</p>
        </div>
      </section>

      {/* Features */}
      <section className="border-t bg-muted/30">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <div className="text-center">
            <h2 className="text-2xl font-bold sm:text-3xl">{t("featuresTitle")}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{t("featuresSubtitle")}</p>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f, i) => {
              const Icon = f.icon;
              return (
                <Card key={i} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-5">
                    <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="mt-3 text-base font-semibold">{f.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="border-t">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <div className="text-center">
            <h2 className="text-2xl font-bold sm:text-3xl">{t("pricingTitle")}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{t("pricingSubtitle")}</p>
          </div>
          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            {plans.map((p) => (
              <Card key={p.name} className={`relative ${p.popular ? "border-primary shadow-lg ring-1 ring-primary/20" : ""}`}>
                {p.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-0.5 text-xs font-semibold text-primary-foreground">
                    {t("popular")}
                  </span>
                )}
                <CardContent className="p-6">
                  <h3 className="text-lg font-bold">{p.name}</h3>
                  <p className="mt-2 text-3xl font-bold tnum">{p.price}</p>
                  <ul className="mt-5 space-y-2">
                    {p.features.map((feat, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 shrink-0 text-emerald-500" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    className="mt-6 w-full"
                    variant={p.popular ? "default" : "outline"}
                    onClick={() => setScreen("login")}
                  >
                    {t("choosePlan")}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t bg-primary text-primary-foreground">
        <div className="mx-auto max-w-4xl px-4 py-16 text-center">
          <h2 className="text-2xl font-bold sm:text-3xl">{t("ctaTitle")}</h2>
          <p className="mt-2 text-sm opacity-90">{t("ctaSubtitle")}</p>
          <Button size="lg" variant="secondary" className="mt-6" onClick={() => setScreen("login")}>
            {t("heroCta")}
            <Arrow className="h-4 w-4 ms-2" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t mt-auto">
        <div className="mx-auto max-w-6xl px-4 py-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded bg-primary text-primary-foreground">
                <Wrench className="h-4 w-4" />
              </div>
              <p className="text-sm font-semibold">{t("appName")}</p>
            </div>
            <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} {t("appName")}. {t("footerRights")}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
