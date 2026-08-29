"use client";

import { useT } from "@/lib/format";

export function AppFooter() {
  const { t } = useT();
  return (
    <footer className="mt-auto border-t bg-background">
      <div className="mx-auto flex max-w-[1600px] flex-col items-center justify-between gap-2 px-4 py-3 text-xs text-muted-foreground sm:flex-row">
        <p>
          © {new Date().getFullYear()} {t("appName")} · {t("appTagline")}
        </p>
        <p className="flex items-center gap-1.5">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
          {t("verified")} · {t("poweredBy")}
        </p>
      </div>
    </footer>
  );
}
