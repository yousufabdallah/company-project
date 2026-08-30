"use client";

import { useT, formatDate } from "@/lib/format";
import { useApi, StatusBadge, EmptyState, LoadingRows, PageHeader, useApiMutation } from "@/components/shared";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useApp } from "@/lib/store";
import { CalendarClock, Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

export function AppointmentsView() {
  const { t, lang } = useT();
  const { data, isLoading } = useApi<any>("/api/appointments");
  const setQuickCreate = useApp((s) => s.setQuickCreate);
  const { invalidate, toastSuccess, toastError } = useApiMutation();
  const [statusFilter, setStatusFilter] = useState("all");

  const items = (data?.items || []).filter((a: any) => statusFilter === "all" || a.status === statusFilter);
  const byDate = new Map<string, any[]>();
  for (const a of items) {
    const key = new Date(a.date).toLocaleDateString(lang === "ar" ? "ar-OM" : "en-US", { weekday: "short", day: "numeric", month: "short" });
    if (!byDate.has(key)) byDate.set(key, []);
    byDate.get(key)!.push(a);
  }

  const setStatus = async (id: string, status: string) => {
    try {
      await fetch("/api/appointments", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status }) });
      invalidate(["/api/appointments", "/api/dashboard"]);
      toastSuccess();
    } catch {
      toastError("Error");
    }
  };

  return (
    <div>
      <PageHeader title={t("appointments")} subtitle={`${items.length} ${t("appointments").toLowerCase()}`}>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("all")}</SelectItem>
            <SelectItem value="scheduled">{t("status_scheduled")}</SelectItem>
            <SelectItem value="confirmed">{t("status_confirmed")}</SelectItem>
            <SelectItem value="arrived">{t("status_arrived")}</SelectItem>
            <SelectItem value="completed">{t("status_completed")}</SelectItem>
            <SelectItem value="no_show">{t("status_no_show")}</SelectItem>
            <SelectItem value="cancelled">{t("status_cancelled")}</SelectItem>
          </SelectContent>
        </Select>
        <Button size="sm" onClick={() => setQuickCreate("appointment")}><Plus className="h-4 w-4 me-1" />{t("addNew")}</Button>
      </PageHeader>

      {isLoading ? (
        <LoadingRows />
      ) : items.length === 0 ? (
        <Card><CardContent className="p-6"><EmptyState title={t("noAppointments")} icon={CalendarClock} /></CardContent></Card>
      ) : (
        <div className="space-y-4">
          {[...byDate.entries()].map(([date, appts]) => (
            <Card key={date}>
              <CardContent className="p-3 sm:p-4">
                <h3 className="mb-2 text-sm font-semibold text-muted-foreground">{date}</h3>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-20">{t("time")}</TableHead>
                        <TableHead>{t("customer")} / {t("vehicle")}</TableHead>
                        <TableHead className="hidden md:table-cell">{t("services")}</TableHead>
                        <TableHead className="hidden lg:table-cell">{t("technician")}</TableHead>
                        <TableHead>{t("status")}</TableHead>
                        <TableHead className="text-end">{t("actions")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {appts.map((a: any) => (
                        <TableRow key={a.id}>
                          <TableCell className="font-mono font-bold tnum">{a.time}</TableCell>
                          <TableCell>
                            <p className="text-sm font-medium">{a.customer?.name}</p>
                            <p className="text-xs text-muted-foreground">{a.vehicle?.plateNumber} · {a.vehicle?.make} {a.vehicle?.model}</p>
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-xs">{a.service?.name || "—"}</TableCell>
                          <TableCell className="hidden lg:table-cell text-xs">{a.technician?.name || "—"}</TableCell>
                          <TableCell><StatusBadge status={a.status} /></TableCell>
                          <TableCell className="text-end">
                            <Select value={a.status} onValueChange={(v) => setStatus(a.id, v)}>
                              <SelectTrigger className="h-7 w-28 text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="scheduled">{t("status_scheduled")}</SelectItem>
                                <SelectItem value="confirmed">{t("status_confirmed")}</SelectItem>
                                <SelectItem value="arrived">{t("status_arrived")}</SelectItem>
                                <SelectItem value="completed">{t("status_completed")}</SelectItem>
                                <SelectItem value="no_show">{t("status_no_show")}</SelectItem>
                                <SelectItem value="cancelled">{t("status_cancelled")}</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
