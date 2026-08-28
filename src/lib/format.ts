// Formatting helpers + lightweight i18n hook
import { useApp } from "@/lib/store";
import { translate, type Lang } from "@/lib/i18n";

export function useT() {
  const lang = useApp((s) => s.lang);
  return {
    lang,
    t: (key: string) => translate(lang, key),
    dir: lang === "ar" ? "rtl" : ("ltr" as "rtl" | "ltr"),
  };
}

export function formatMoney(amount: number | null | undefined, currency = "OMR", lang: Lang = "en") {
  const n = Number(amount ?? 0);
  const locale = lang === "ar" ? "ar-OM" : "en-US";
  try {
    return new Intl.NumberFormat(locale, {
      style: "decimal",
      minimumFractionDigits: 3,
      maximumFractionDigits: 3,
    }).format(n) + " " + currency;
  } catch {
    return n.toFixed(3) + " " + currency;
  }
}

export function formatNumber(n: number | null | undefined, lang: Lang = "en") {
  const v = Number(n ?? 0);
  const locale = lang === "ar" ? "ar-OM" : "en-US";
  try {
    return new Intl.NumberFormat(locale).format(v);
  } catch {
    return String(v);
  }
}

export function formatDate(d: string | Date | null | undefined, lang: Lang = "en") {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  const locale = lang === "ar" ? "ar-OM" : "en-US";
  try {
    return new Intl.DateTimeFormat(locale, { year: "numeric", month: "short", day: "numeric" }).format(date);
  } catch {
    return date.toDateString();
  }
}

export function formatDateTime(d: string | Date | null | undefined, lang: Lang = "en") {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  const locale = lang === "ar" ? "ar-OM" : "en-US";
  try {
    return new Intl.DateTimeFormat(locale, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  } catch {
    return date.toLocaleString();
  }
}

export function timeAgo(d: string | Date | null | undefined, lang: Lang = "en") {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return lang === "ar" ? "الآن" : "just now";
  if (mins < 60) return lang === "ar" ? `قبل ${mins} دقيقة` : `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return lang === "ar" ? `قبل ${hrs} ساعة` : `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return lang === "ar" ? `قبل ${days} يوم` : `${days}d ago`;
  return formatDate(d, lang);
}
