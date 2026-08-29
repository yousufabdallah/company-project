"use client";

import { useT, formatDateTime } from "@/lib/format";
import { useApi, EmptyState, LoadingRows, PageHeader } from "@/components/shared";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollText } from "lucide-react";

const ACTION_LABEL: Record<string, string> = {
  login: "Login",
  logout: "Logout",
  created: "Created",
  updated: "Updated",
  deleted: "Deleted",
  invoice_created: "Invoice Created",
  payment_received: "Payment Received",
  stock_changed: "Stock Changed",
  job_card_status_changed: "Job Card Status",
  appointment_status_changed: "Appointment Status",
  estimate_status_changed: "Estimate Status",
};

export function AuditLogsView() {
  const { t, lang } = useT();

  return (
    <div>
      <PageHeader title={t("auditLogs")} subtitle={t("auditLogs")} />
      <Card>
        <CardContent className="p-3 sm:p-4">
          <AuditContent lang={lang} />
        </CardContent>
      </Card>
    </div>
  );
}

function AuditContent({ lang }: { lang: string }) {
  const { t } = useT();
  const { data, isLoading } = useApi<any>("/api/audit-logs");
  if (isLoading) return <LoadingRows />;
  const items = data?.items || [];
  if (items.length === 0) return <EmptyState title={t("noData")} icon={ScrollText} />;
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("date")}</TableHead>
            <TableHead>{t("user")}</TableHead>
            <TableHead>{t("action")}</TableHead>
            <TableHead className="hidden md:table-cell">{t("module")}</TableHead>
            <TableHead>{t("record")}</TableHead>
            <TableHead className="hidden lg:table-cell">{t("ipAddress")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((l: any) => (
            <TableRow key={l.id}>
              <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{formatDateTime(l.createdAt, lang)}</TableCell>
              <TableCell className="text-sm font-medium">{l.user?.name || "System"}</TableCell>
              <TableCell>
                <span className="inline-flex rounded-full bg-muted px-2 py-0.5 text-xs font-medium">{ACTION_LABEL[l.action] || l.action}</span>
              </TableCell>
              <TableCell className="hidden md:table-cell text-xs text-muted-foreground capitalize">{l.module}</TableCell>
              <TableCell className="text-xs font-mono">{l.record || "—"}</TableCell>
              <TableCell className="hidden lg:table-cell text-xs font-mono text-muted-foreground">{l.ip || "—"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
