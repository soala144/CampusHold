import { AlertTriangle, CheckCircle2, FlaskConical, Info, Loader2, XCircle } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import type { Tone } from "@/lib/tone";

const alertStyles: Record<Exclude<Tone, "accent" | "neutral">, { box: string; icon: ReactNode }> = {
  info: { box: "border-info/20 bg-info-soft", icon: <Info className="text-info" /> },
  success: { box: "border-success/20 bg-success-soft", icon: <CheckCircle2 className="text-success" /> },
  warning: { box: "border-warning/25 bg-warning-soft", icon: <AlertTriangle className="text-warning" /> },
  danger: { box: "border-danger/20 bg-danger-soft", icon: <XCircle className="text-danger" /> },
};

export function Alert({
  tone = "info",
  title,
  children,
  action,
  className,
}: {
  tone?: keyof typeof alertStyles;
  title?: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  const s = alertStyles[tone];
  return (
    <div role={tone === "danger" ? "alert" : "status"} className={cn("flex gap-3 rounded-xl border p-4", s.box, className)}>
      <span className="mt-0.5 shrink-0 [&_svg]:size-[1.125rem]">{s.icon}</span>
      <div className="flex flex-1 flex-col gap-1 text-sm">
        {title && <p className="font-medium text-ink">{title}</p>}
        {children && <div className="text-ink-soft">{children}</div>}
      </div>
      {action && <div className="shrink-0 self-center">{action}</div>}
    </div>
  );
}

/** Marks anything financial as simulated during Stages 2–3. */
export function SimulatedBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-dashed border-warning/50 bg-warning-soft px-2 py-0.5 text-[0.6875rem] font-medium tracking-wide text-warning uppercase",
        className,
      )}
    >
      <FlaskConical className="size-3" aria-hidden />
      Simulated
    </span>
  );
}

export function SimulatedNotice({ children, className }: { children?: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-xl border border-dashed border-warning/40 bg-warning-soft/60 px-4 py-3 text-sm text-ink-soft",
        className,
      )}
    >
      <FlaskConical className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
      <p>
        <span className="font-medium text-ink">Simulation.</span>{" "}
        {children ?? "No real money moves. Payments, balances and payouts here are mock data for testing the workflow."}
      </p>
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-card border border-dashed border-line-strong px-6 py-14 text-center",
        className,
      )}
    >
      {icon && (
        <span className="flex size-11 items-center justify-center rounded-xl bg-surface text-muted [&_svg]:size-5">
          {icon}
        </span>
      )}
      <p className="font-medium tracking-tight">{title}</p>
      {description && <p className="max-w-sm text-sm text-muted">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("animate-pulse rounded-lg bg-surface-strong", className)} />;
}

export function Spinner({ className }: { className?: string }) {
  return <Loader2 aria-hidden className={cn("size-4 animate-spin", className)} />;
}
