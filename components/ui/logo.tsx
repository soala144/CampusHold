import Link from "next/link";
import { cn } from "@/lib/cn";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={cn("size-8", className)}>
      <rect width="32" height="32" rx="9" fill="var(--color-ink)" />
      {/* Two brackets "holding" a centre point */}
      <path
        d="M12 9.5H10a1.5 1.5 0 0 0-1.5 1.5v10a1.5 1.5 0 0 0 1.5 1.5h2M20 9.5h2a1.5 1.5 0 0 1 1.5 1.5v10a1.5 1.5 0 0 1-1.5 1.5h-2"
        fill="none"
        stroke="#fff"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <circle cx="16" cy="16" r="3" fill="var(--color-accent)" />
    </svg>
  );
}

export function Logo({ className, inverse = false }: { className?: string; inverse?: boolean }) {
  return (
    <Link
      href="/"
      aria-label="CampusHold home"
      className={cn("inline-flex items-center gap-2.5", className)}
    >
      <LogoMark />
      <span
        className={cn(
          "font-display text-[1.1875rem] font-semibold tracking-[-0.03em]",
          inverse ? "text-white" : "text-ink",
        )}
      >
        CampusHold
      </span>
    </Link>
  );
}
