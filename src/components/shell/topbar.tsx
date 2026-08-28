"use client";

import { useApp } from "@/lib/store";
import { useT } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { SidebarContent } from "@/components/shell/sidebar";
import { Menu, Search, Sun, Moon, Globe, Bell, User, Plus } from "lucide-react";
import { useTheme } from "next-themes";
import { useApi } from "@/components/shared";
import { useEffect, useState } from "react";

export function Topbar() {
  const { t } = useT();
  const toggleLang = useApp((s) => s.toggleLang);
  const setView = useApp((s) => s.setView);
  const setQuickCreate = useApp((s) => s.setQuickCreate);
  const sidebarOpen = useApp((s) => s.sidebarOpen);
  const setSidebarOpen = useApp((s) => s.setSidebarOpen);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);
  const { data: dash } = useApi<any>("/api/dashboard");

  const lowStockCount = dash?.kpis?.lowStockCount ?? 0;
  const pendingCount = (dash?.kpis?.pendingApprovals ?? 0) + (dash?.kpis?.waitingParts ?? 0);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/70 px-3 sm:px-4">
      {/* Mobile menu */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Toggle menu">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 p-0">
          <SidebarContent onNavigate={() => setSidebarOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* Search */}
      <div className="relative flex-1 max-w-xl">
        <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder={t("searchPlaceholder")}
          className="ps-9 h-10 bg-muted/50 border-0 focus-visible:ring-1"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              const q = (e.target as HTMLInputElement).value.trim();
              if (q) setView("vehicles");
            }
          }}
        />
      </div>

      <div className="flex items-center gap-1">
        {/* Quick create */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" className="hidden sm:inline-flex gap-1.5">
              <Plus className="h-4 w-4" />
              <span className="hidden md:inline">{t("addNew")}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel>{t("quickActions")}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {[
              { k: "customer", label: t("customers") },
              { k: "vehicle", label: t("vehicles") },
              { k: "appointment", label: t("appointments") },
              { k: "estimate", label: t("estimates") },
              { k: "jobCard", label: t("jobCards") },
              { k: "invoice", label: t("invoices") },
              { k: "payment", label: t("receivePayment") },
              { k: "part", label: t("inventory") },
            ].map((x) => (
              <DropdownMenuItem key={x.k} onClick={() => setQuickCreate(x.k)}>
                {x.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Language */}
        <Button variant="ghost" size="icon" onClick={toggleLang} aria-label="Toggle language" title={t("language")}>
          <Globe className="h-5 w-5" />
          <span className="sr-only">{t("language")}</span>
        </Button>

        {/* Theme */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          aria-label="Toggle theme"
          title={t("theme")}
        >
          {mounted && theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </Button>

        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
              <Bell className="h-5 w-5" />
              {(lowStockCount + pendingCount) > 0 && (
                <span className="absolute end-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
                  {lowStockCount + pendingCount}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel>{t("alerts")}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {lowStockCount > 0 && (
              <DropdownMenuItem className="flex items-center justify-between" onClick={() => setView("inventory")}>
                <span>{t("lowStockParts")}</span>
                <span className="font-bold text-red-600">{lowStockCount}</span>
              </DropdownMenuItem>
            )}
            {(dash?.kpis?.pendingApprovals ?? 0) > 0 && (
              <DropdownMenuItem className="flex items-center justify-between" onClick={() => setView("estimates")}>
                <span>{t("pendingApprovals")}</span>
                <span className="font-bold text-amber-600">{dash?.kpis?.pendingApprovals}</span>
              </DropdownMenuItem>
            )}
            {(dash?.kpis?.waitingParts ?? 0) > 0 && (
              <DropdownMenuItem className="flex items-center justify-between" onClick={() => setView("jobCards")}>
                <span>{t("waitingParts")}</span>
                <span className="font-bold text-orange-600">{dash?.kpis?.waitingParts}</span>
              </DropdownMenuItem>
            )}
            {lowStockCount + pendingCount === 0 && (
              <DropdownMenuItem disabled>{t("noData")}</DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full" aria-label="User menu">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                <User className="h-4 w-4" />
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div>
                <p className="text-sm font-medium">Khalid Al-Rashidi</p>
                <p className="text-xs text-muted-foreground">Workshop Owner</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setView("settings")}>{t("settings")}</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setView("auditLogs")}>{t("auditLogs")}</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
