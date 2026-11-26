"use client";

import { cn } from "@/lib/cn";

/** Segmented control for switching views. */
export function Tabs<T extends string>({
  value,
  onChange,
  items,
  label,
  className,
}: {
  value: T;
  onChange: (v: T) => void;
  items: { value: T; label: string; count?: number }[];
  label: string;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className={cn("scrollbar-none inline-flex max-w-full gap-1 overflow-x-auto rounded-full border border-line bg-surface p-1", className)}
    >
      {items.map((it) => {
        const active = it.value === value;
        return (
          <button
            key={it.value}
            role="tab"
            type="button"
            aria-selected={active}
            onClick={() => onChange(it.value)}
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm whitespace-nowrap transition-colors",
              active ? "bg-canvas font-medium text-ink shadow-card" : "text-muted hover:text-ink",
            )}
          >
            {it.label}
            {it.count !== undefined && (
              <span className={cn("rounded-full px-1.5 text-xs tabular-nums", active ? "bg-surface" : "bg-surface-strong")}>
                {it.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
