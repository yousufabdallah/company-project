"use client";

import { useT, formatMoney, formatDate, formatNumber } from "@/lib/format";
import { useApi, StatusBadge, EmptyState, LoadingRows, PageHeader } from "@/components/shared";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useApp } from "@/lib/store";
import { useState } from "react";
import { Search, Plus, Car, Wrench, Receipt, Gauge, QrCode } from "lucide-react";

export function VehiclesView() {
  const { t, lang } = useT();
  const { data, isLoading } = useApi<any>("/api/vehicles");
  const setQuickCreate = useApp((s) => s.setQuickCreate);
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<string | null>(null);

  const money = (n: number) => formatMoney(n, "OMR", lang);
  const items = (data?.items || []).filter((v: any) =>
    !q || v.plateNumber.toLowerCase().includes(q.toLowerCase()) || (v.vin || "").toLowerCase().includes(q.toLowerCase()) || v.make.toLowerCase().includes(q.toLowerCase()) || (v.customer?.name || "").toLowerCase().includes(q.toLowerCase())
  );

  const { data: detail } = useApi<any>(selected ? `/api/vehicles/${selected}` : null);

  return (
    <div>
      <PageHeader title={t("vehicles")} subtitle={`${items.length} ${t("vehicles").toLowerCase()}`}>
        <Button size="sm" onClick={() => setQuickCreate("vehicle")}><Plus className="h-4 w-4 me-1" />{t("addNew")}</Button>
      </PageHeader>

      <Card>
        <CardContent className="p-3 sm:p-4">
          <div className="relative mb-3 max-w-sm">
            <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`${t("plateNumber")}, VIN, ${t("customer")}...`} className="ps-9" />
          </div>

          {isLoading ? (
            <LoadingRows />
          ) : items.length === 0 ? (
            <EmptyState title={t("noResults")} icon={Car} />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("plateNumber")}</TableHead>
                    <TableHead className="hidden md:table-cell">{t("vin")}</TableHead>
                    <TableHead>{t("make")} / {t("model")}</TableHead>
                    <TableHead className="hidden sm:table-cell">{t("year")}</TableHead>
                    <TableHead className="hidden lg:table-cell">{t("customer")}</TableHead>
                    <TableHead className="text-end">{t("mileage")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((v: any) => (
                    <TableRow key={v.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelected(v.id)}>
                      <TableCell className="font-mono text-xs font-bold tnum">{v.plateNumber}</TableCell>
                      <TableCell className="hidden md:table-cell font-mono text-xs text-muted-foreground">{v.vin || "—"}</TableCell>
                      <TableCell className="font-medium">{v.make} {v.model}</TableCell>
                      <TableCell className="hidden sm:table-cell tnum">{v.year || "—"}</TableCell>
                      <TableCell className="hidden lg:table-cell text-xs">{v.customer?.name || "—"}</TableCell>
                      <TableCell className="text-end tnum text-muted-foreground">{formatNumber(v.mileage, lang)} km</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto scroll-thin">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Car className="h-5 w-5" />{detail?.plateNumber}
              <span className="text-sm font-normal text-muted-foreground">{detail?.make} {detail?.model} {detail?.year}</span>
            </DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 text-xs">
                <Field label={t("vin")} value={detail.vin || "—"} />
                <Field label={t("color")} value={detail.color || "—"} />
                <Field label={t("fuelType")} value={detail.fuelType || "—"} />
                <Field label={t("transmission")} value={detail.transmission || "—"} />
                <Field label={t("mileage")} value={`${formatNumber(detail.mileage, lang)} km`} icon={Gauge} />
                <Field label={t("customer")} value={detail.customer?.name || "—"} />
                <Field label={t("totalSpent")} value={money(detail.totalSpent ?? 0)} />
                <Field label={t("serviceHistory")} value={`${detail.jobCards?.length ?? 0} ${t("jobCards").toLowerCase()}`} icon={Wrench} />
              </div>

              <div className="flex items-center gap-2 rounded-lg border border-dashed p-3">
                <QrCode className="h-8 w-8 text-muted-foreground" />
                <div className="text-xs text-muted-foreground">{t("vehicle")} QR · scan to open this record (auth required in production).</div>
              </div>

              <div>
                <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold"><Wrench className="h-4 w-4" />{t("serviceHistory")}</h3>
                {detail.jobCards?.length === 0 ? (
                  <EmptyState title={t("noData")} icon={Wrench} />
                ) : (
                  <div className="space-y-2 max-h-72 overflow-y-auto scroll-thin">
                    {detail.jobCards.map((j: any) => (
                      <div key={j.id} className="rounded-lg border p-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium tnum">{j.code}</span>
                          <StatusBadge status={j.status} />
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">{j.complaint}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                          <span>{t("technician")}: {j.technician?.name || "—"}</span>
                          <span>{t("mileage")}: {formatNumber(j.mileage, lang)} km</span>
                          <span className="font-semibold text-foreground tnum">{money(j.grandTotal)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold"><Receipt className="h-4 w-4" />{t("invoices")}</h3>
                {detail.invoices?.length === 0 ? (
                  <EmptyState title={t("noData")} icon={Receipt} />
                ) : (
                  <div className="overflow-x-auto rounded-lg border">
                    <Table>
                      <TableHeader><TableRow><TableHead className="text-xs">{t("invoiceNumber")}</TableHead><TableHead className="text-xs">{t("date")}</TableHead><TableHead className="text-xs text-end">{t("total")}</TableHead><TableHead className="text-xs">{t("status")}</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {detail.invoices.map((i: any) => (
                          <TableRow key={i.id}>
                            <TableCell className="text-xs font-mono tnum">{i.code}</TableCell>
                            <TableCell className="text-xs">{formatDate(i.date, lang)}</TableCell>
                            <TableCell className="text-xs text-end tnum font-medium">{money(i.grandTotal)}</TableCell>
                            <TableCell><StatusBadge status={i.status} /></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({ label, value, icon: Icon }: { label: string; value: string; icon?: any }) {
  return (
    <div className="rounded-lg border p-2">
      <p className="text-[10px] text-muted-foreground flex items-center gap-1">{Icon && <Icon className="h-3 w-3" />}{label}</p>
      <p className="mt-0.5 text-sm font-medium truncate">{value}</p>
    </div>
  );
}
