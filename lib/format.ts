import type { Kobo } from "@/lib/domain/types";

const naira = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  maximumFractionDigits: 0,
});

export function formatMoney(kobo: Kobo): string {
  return naira.format(kobo / 100).replace("NGN", "₦");
}

export function nairaToKobo(naira: number): Kobo {
  return Math.round(naira * 100);
}

const TZ = "Africa/Lagos";
const dateFmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: TZ });
const dateYearFmt = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: TZ,
});
const timeFmt = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: TZ,
});

export function formatDate(iso: string, withYear = false): string {
  return (withYear ? dateYearFmt : dateFmt).format(new Date(iso));
}

export function formatTime(iso: string): string {
  return timeFmt.format(new Date(iso));
}

export function formatDateTime(iso: string): string {
  return `${formatDate(iso)}, ${formatTime(iso)}`;
}

/** "3h ago", "2d ago". Only call in browser-rendered components. */
export function timeAgo(iso: string, now = Date.now()): string {
  const s = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d}d ago`;
  return formatDate(iso, true);
}

/** Days until a deadline (negative when overdue). */
export function daysUntil(iso: string, now = Date.now()): number {
  return Math.ceil((new Date(iso).getTime() - now) / 86_400_000);
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
}

export function initials(first: string, last: string): string {
  return `${first[0] ?? ""}${last[0] ?? ""}`.toUpperCase();
}
