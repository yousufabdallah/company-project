"use client";

import { useT, formatDate } from "@/lib/format";
import { useApi, EmptyState, LoadingRows, PageHeader } from "@/components/shared";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ShieldCheck, AlertCircle } from "lucide-react";

export function WarrantiesView() {
  const { t, lang } = useT();
  const { data, isLoading } = useApi<any>("/api/warranties");
  const now = new Date();

  return (
    <div>
      <PageHeader title={t("warranties")} subtitle={`${data?.items?.length ?? 0} ${t("warranties").toLowerCase()}`} />
      <Card>
        <CardContent className="p-3 sm:p-4">
          {isLoading ? <LoadingRows /> : (data?.items || []).length === 0 ? <EmptyState title={t("noData")} icon={ShieldCheck} /> : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("vehicle")}</TableHead>
                    <TableHead>{t("customer")}</TableHead>
                    <TableHead className="hidden md:table-cell">{t("jobCardNumber")}</TableHead>
                    <TableHead className="text-center">{t("warranties")}</TableHead>
                    <TableHead className="hidden sm:table-cell">{t("date")}</TableHead>
                    <TableHead className="text-center">{t("status")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(data?.items || []).map((w: any) => {
                    const expired = new Date(w.expiryDate) < now;
                    return (
                      <TableRow key={w.id}>
                        <TableCell className="text-sm font-medium">{w.jobCard?.vehicle?.plateNumber}</TableCell>
                        <TableCell className="text-xs">{w.jobCard?.customer?.name}</TableCell>
                        <TableCell className="hidden md:table-cell font-mono text-xs tnum">{w.jobCard?.code}</TableCell>
                        <TableCell className="text-center tnum">{w.periodMonths}m</TableCell>
                        <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">{formatDate(w.startDate, lang)} → {formatDate(w.expiryDate, lang)}</TableCell>
                        <TableCell className="text-center">
                          {expired ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800 dark:bg-red-950 dark:text-red-300"><AlertCircle className="h-3 w-3" />{t("status_cancelled")}</span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"><ShieldCheck className="h-3 w-3" />{t("status_active") || "Active"}</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
