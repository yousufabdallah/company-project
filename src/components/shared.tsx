"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useT } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Inbox } from "lucide-react";

// Data fetching hook
export function useApi<T>(url: string | null) {
  return useQuery<T>({
    queryKey: [url],
    queryFn: async () => {
      if (!url) return null as any;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Request failed");
      return res.json();
    },
    enabled: !!url,
  });
}

// Mutation helper that invalidates given keys
export function useApiMutation() {
  const qc = useQueryClient();
  const { t } = useT();
  return {
    invalidate: (keys: string[]) => {
      keys.forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
      qc.invalidateQueries({ queryKey: ["/api/dashboard"] });
    },
    toastSuccess: (msg?: string) => toast.success(msg || t("saved")),
    toastError: (msg: string) => toast.error(msg),
  };
}

// Status badge with color mapping
const STATUS_COLORS: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  waiting_approval: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  approved: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  in_progress: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300",
  waiting_parts: "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300",
  waiting_customer: "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300",
  quality_check: "bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300",
  completed: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  ready_for_delivery: "bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300",
  delivered: "bg-green-200 text-green-900 dark:bg-green-950 dark:text-green-300",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  pending: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  rejected: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  scheduled: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  confirmed: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300",
  arrived: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  no_show: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  paid: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  partial: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  unpaid: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  refunded: "bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-950 dark:text-fuchsia-300",
  low: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  normal: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300",
  high: "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300",
  urgent: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  active: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  trial: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  suspended: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
};

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  const { t } = useT();
  const cls = STATUS_COLORS[status] || "bg-muted text-muted-foreground";
  const text = label || t("status_" + status) || status.replace(/_/g, " ");
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${cls}`}>{text}</span>;
}

export function StatCard({
  title,
  value,
  icon: Icon,
  tone = "default",
  subtitle,
}: {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  tone?: "default" | "revenue" | "warning" | "danger" | "info";
  subtitle?: string;
}) {
  const tones: Record<string, string> = {
    default: "text-primary",
    revenue: "text-emerald-600 dark:text-emerald-400",
    warning: "text-amber-600 dark:text-amber-400",
    danger: "text-red-600 dark:text-red-400",
    info: "text-sky-600 dark:text-sky-400",
  };
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground truncate">{title}</p>
            <p className={`mt-1 text-2xl font-bold tnum ${tones[tone]}`}>{value}</p>
            {subtitle && <p className="mt-0.5 text-xs text-muted-foreground truncate">{subtitle}</p>}
          </div>
          <div className="rounded-lg bg-muted p-2 shrink-0">
            <Icon className="h-5 w-5 text-muted-foreground" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function EmptyState({ title, icon: Icon = Inbox, hint }: { title: string; icon?: React.ComponentType<{ className?: string }>; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
      <div className="rounded-full bg-muted p-3">
        <Icon className="h-6 w-6 text-muted-foreground" />
      </div>
      <p className="text-sm font-medium text-foreground">{title}</p>
      {hint && <p className="text-xs text-muted-foreground max-w-sm">{hint}</p>}
    </div>
  );
}

export function LoadingRows({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  );
}

export function PageHeader({ title, subtitle, children }: { title: string; subtitle?: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-5">
      <div>
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}
