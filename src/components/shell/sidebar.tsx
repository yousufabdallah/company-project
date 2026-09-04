"use client";

import { NAV } from "@/lib/nav";
import { useApp } from "@/lib/store";
import { useT } from "@/lib/format";
import { usePermissions } from "@/lib/use-permissions";
import { cn } from "@/lib/utils";
import { Wrench } from "lucide-react";
import { useApi } from "@/components/shared";

export function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const view = useApp((s) => s.view);
  const setView = useApp((s) => s.setView);
  const { t } = useT();
  const { canView } = usePermissions();
  const { data: tenant } = useApi<any>("/api/settings");

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      {/* Brand */}
      <div className="flex items-center gap-3 border-b border-sidebar-border px-4 py-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
          <Wrench className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold leading-tight">{tenant?.name || t("appName")}</p>
          <p className="truncate text-xs text-muted-foreground">{t("appTagline")}</p>
        </div>
      </div>

      {/* Nav */}
      <div className="min-h-0 flex-1 overflow-y-auto px-2 py-3 scroll-thin">
        <nav className="space-y-4">
          {NAV.map((group) => {
            const visibleItems = group.items.filter((item) => canView(item.key));
            if (visibleItems.length === 0) return null;
            return (
            <div key={group.titleKey}>
              <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{t(group.titleKey)}</p>
              <ul className="space-y-0.5">
                {group.items.filter((item) => canView(item.key)).map((item) => {
                  const active = view === item.key;
                  const Icon = item.icon;
                  return (
                    <li key={item.key}>
                      <button
                        onClick={() => {
                          setView(item.key);
                          onNavigate?.();
                        }}
                        className={cn(
                          "group flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium transition-colors",
                          active
                            ? "bg-sidebar-accent text-sidebar-accent-foreground"
                            : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
                        )}
                      >
                        <Icon className={cn("h-4 w-4 shrink-0", active ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
                        <span className="truncate">{t(item.labelKey)}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
            );
          })}
        </nav>
      </div>

      {/* Footer plan */}
      <div className="border-t border-sidebar-border px-4 py-3">
        <div className="rounded-lg bg-sidebar-accent/60 p-2.5">
          <p className="text-xs font-semibold">{tenant?.plan || "Professional"} Plan</p>
          <p className="mt-0.5 text-[10px] text-muted-foreground">Multi-tenant SaaS · Demo</p>
        </div>
      </div>
    </div>
  );
}

export function Sidebar() {
  return (
    <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 lg:z-40 border-r border-sidebar-border">
      <SidebarContent />
    </aside>
  );
}
