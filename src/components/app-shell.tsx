"use client";

import { useApp } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Sidebar } from "@/components/shell/sidebar";
import { Topbar } from "@/components/shell/topbar";
import { AppFooter } from "@/components/shell/app-footer";
import { QuickCreateHost } from "@/components/quick-create-host";
import { DashboardView } from "@/components/views/dashboard";
import { CustomersView } from "@/components/views/customers";
import { VehiclesView } from "@/components/views/vehicles";
import { AppointmentsView } from "@/components/views/appointments";
import { EstimatesView } from "@/components/views/estimates";
import { JobCardsView } from "@/components/views/job-cards";
import { ServicesView } from "@/components/views/services";
import { InventoryView } from "@/components/views/inventory";
import { PosView } from "@/components/views/pos";
import { AccountsView } from "@/components/views/accounts";
import { SuppliersView } from "@/components/views/suppliers";
import { PurchasesView } from "@/components/views/purchases";
import { InvoicesView } from "@/components/views/invoices";
import { PaymentsView } from "@/components/views/payments";
import { ExpensesView } from "@/components/views/expenses";
import { WarrantiesView } from "@/components/views/warranties";
import { ReportsView } from "@/components/views/reports";
import { TechniciansView } from "@/components/views/technicians";
import { UsersView } from "@/components/views/users";
import { AuditLogsView } from "@/components/views/audit-logs";
import { SettingsView } from "@/components/views/settings";
import { useT } from "@/lib/format";
import { ShieldCheck } from "lucide-react";

export function AppShell() {
  const { t } = useT();
  const view = useApp((s) => s.view);
  const user = useApp((s) => s.user);
  const setUser = useApp((s) => s.setUser);
  const setScreen = useApp((s) => s.setScreen);

  const exitImpersonation = async () => {
    try {
      const res = await fetch("/api/auth/impersonate-exit", { method: "POST" });
      if (res.ok) {
        const restored = await res.json();
        setUser(restored);
        setScreen("superadmin");
      }
    } catch {
      // ignore
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Sidebar />
      <div className="flex flex-1 flex-col lg:ps-64">
        {/* Super admin impersonation banner */}
        {user?.role === "super_admin" && (
          <div className="no-print flex items-center justify-between gap-2 bg-primary px-4 py-2 text-primary-foreground">
            <p className="truncate text-xs sm:text-sm">
              {t("viewingAs")} <b>{user.tenantName}</b>
            </p>
            <Button size="sm" variant="secondary" className="h-7 shrink-0 text-xs" onClick={exitImpersonation}>
              <ShieldCheck className="h-3.5 w-3.5 me-1" />{t("exitToAdmin")}
            </Button>
          </div>
        )}
        <Topbar />
        <main className="flex-1">
          <div className="mx-auto w-full max-w-[1600px] px-3 py-5 sm:px-4 sm:py-6">
            <div key={view} className="animate-fadein">
              {view === "dashboard" && <DashboardView />}
              {view === "customers" && <CustomersView />}
              {view === "vehicles" && <VehiclesView />}
              {view === "appointments" && <AppointmentsView />}
              {view === "estimates" && <EstimatesView />}
              {view === "jobCards" && <JobCardsView />}
              {view === "services" && <ServicesView />}
              {view === "inventory" && <InventoryView />}
              {view === "pos" && <PosView />}
              {view === "accounts" && <AccountsView />}
              {view === "suppliers" && <SuppliersView />}
              {view === "purchases" && <PurchasesView />}
              {view === "invoices" && <InvoicesView />}
              {view === "payments" && <PaymentsView />}
              {view === "expenses" && <ExpensesView />}
              {view === "warranties" && <WarrantiesView />}
              {view === "reports" && <ReportsView />}
              {view === "technicians" && <TechniciansView />}
              {view === "users" && <UsersView />}
              {view === "auditLogs" && <AuditLogsView />}
              {view === "settings" && <SettingsView />}
            </div>
          </div>
        </main>
        <AppFooter />
      </div>
      <QuickCreateHost />
    </div>
  );
}
