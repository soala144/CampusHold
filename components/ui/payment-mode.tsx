"use client";

import { FlaskConical } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { useAppState } from "@/lib/store";

/**
 * Labels money as not real. Simulated mode says "Simulated", the Bachs
 * sandbox says "Test mode", and live payments show nothing.
 */
function useModeLabel() {
  const { payments } = useAppState();
  if (payments === "bachs-live") return null;
  return payments === "bachs-sandbox" ? "Test mode" : "Simulated";
}

export function SimulatedBadge({ className }: { className?: string }) {
  const label = useModeLabel();
  if (!label) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-dashed border-warning/50 bg-warning-soft px-2 py-0.5 text-[0.6875rem] font-medium tracking-wide text-warning uppercase",
        className,
      )}
    >
      <FlaskConical className="size-3" aria-hidden />
      {label}
    </span>
  );
}

export function SimulatedNotice({ children, className }: { children?: ReactNode; className?: string }) {
  const label = useModeLabel();
  if (!label) return null;
  const sandbox = label === "Test mode";
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-xl border border-dashed border-warning/40 bg-warning-soft/60 px-4 py-3 text-sm text-ink-soft",
        className,
      )}
    >
      <FlaskConical className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
      <p>
        <span className="font-medium text-ink">{sandbox ? "Test mode." : "Simulation."}</span>{" "}
        {sandbox
          ? "Payments run through Bachs’s sandbox. No real money moves."
          : (children ?? "No real money moves. Payments, balances and payouts here are mock data for testing the workflow.")}
      </p>
    </div>
  );
}
