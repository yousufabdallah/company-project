"use client";

import { useApp } from "@/lib/store";
import { useT } from "@/lib/format";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { QuickCustomerForm, QuickVehicleForm, QuickAppointmentForm, QuickPaymentForm, QuickPartForm } from "@/components/quick-forms";
import { useEffect } from "react";

export function QuickCreateHost() {
  const quickCreate = useApp((s) => s.quickCreate);
  const setQuickCreate = useApp((s) => s.setQuickCreate);
  const setView = useApp((s) => s.setView);
  const { t } = useT();

  const open = !!quickCreate;
  const key = quickCreate;

  // For complex entities, route to their full view instead
  useEffect(() => {
    if (key === "jobCard") setView("jobCards");
    if (key === "estimate") setView("estimates");
    if (key === "invoice") setView("invoices");
  }, [key]);

  const isSimple = key && !["jobCard", "estimate", "invoice"].includes(key);

  return (
    <Dialog open={open && isSimple} onOpenChange={(o) => !o && setQuickCreate(null)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {key === "customer" && t("addNew") + " · " + t("customer")}
            {key === "vehicle" && t("addNew") + " · " + t("vehicle")}
            {key === "appointment" && t("addNew") + " · " + t("appointments")}
            {key === "payment" && t("receivePayment")}
            {key === "part" && t("addNew") + " · " + t("inventory")}
          </DialogTitle>
          <DialogDescription className="sr-only">{t("newRecord")}</DialogDescription>
        </DialogHeader>
        {key === "customer" && <QuickCustomerForm onDone={() => setQuickCreate(null)} />}
        {key === "vehicle" && <QuickVehicleForm onDone={() => setQuickCreate(null)} />}
        {key === "appointment" && <QuickAppointmentForm onDone={() => setQuickCreate(null)} />}
        {key === "payment" && <QuickPaymentForm onDone={() => setQuickCreate(null)} />}
        {key === "part" && <QuickPartForm onDone={() => setQuickCreate(null)} />}
      </DialogContent>
    </Dialog>
  );
}
