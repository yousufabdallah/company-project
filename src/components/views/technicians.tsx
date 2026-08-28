"use client";

import { useT } from "@/lib/format";
import { useApi, LoadingRows, PageHeader, EmptyState } from "@/components/shared";
import { Card, CardContent } from "@/components/ui/card";
import { useEffect, useState } from "react";
import { UserCog, Wrench, CheckCircle2, Clock } from "lucide-react";

export function TechniciansView() {
  const { t } = useT();
  const { data: dash } = useApi<any>("/api/dashboard");
  const [techs, setTechs] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/dashboard");
        const d = await res.json();
        setTechs(d.charts.technicianPerformance || []);
      } catch {
        // ignore
      }
    })();
  }, []);

  const perf = dash?.charts?.technicianPerformance || techs;

  return (
    <div>
      <PageHeader title={t("technicians")} subtitle={`${perf.length} ${t("technicians").toLowerCase()}`} />
      {perf.length === 0 ? (
        <Card><CardContent className="p-6"><EmptyState title={t("noData")} icon={UserCog} /></CardContent></Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {perf.map((tech: any, i: number) => {
            const pct = tech.assigned > 0 ? Math.round((tech.done / tech.assigned) * 100) : 0;
            return (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                      {tech.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{tech.name}</p>
                      <p className="text-xs text-muted-foreground">{t("technician")}</p>
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-lg bg-muted/50 p-2"><Wrench className="mx-auto h-3.5 w-3.5 text-muted-foreground" /><p className="mt-0.5 text-lg font-bold tnum">{tech.assigned}</p><p className="text-[10px] text-muted-foreground">{t("jobCards")}</p></div>
                    <div className="rounded-lg bg-muted/50 p-2"><CheckCircle2 className="mx-auto h-3.5 w-3.5 text-emerald-500" /><p className="mt-0.5 text-lg font-bold tnum text-emerald-600">{tech.done}</p><p className="text-[10px] text-muted-foreground">{t("status_completed")}</p></div>
                    <div className="rounded-lg bg-muted/50 p-2"><Clock className="mx-auto h-3.5 w-3.5 text-amber-500" /><p className="mt-0.5 text-lg font-bold tnum text-amber-600">{Math.max(0, tech.assigned - tech.done)}</p><p className="text-[10px] text-muted-foreground">{t("status_in_progress")}</p></div>
                  </div>
                  <div className="mt-3">
                    <div className="flex justify-between text-[10px] text-muted-foreground"><span>{t("status_completed")}</span><span className="tnum">{pct}%</span></div>
                    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${pct}%` }} /></div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
