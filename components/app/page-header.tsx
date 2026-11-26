import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Skeleton } from "@/components/ui/feedback";

export function Page({ children, className, wide }: { children: ReactNode; className?: string; wide?: boolean }) {
  return (
    <div className={cn("mx-auto w-full px-4 py-6 md:px-8 md:py-10", wide ? "max-w-7xl" : "max-w-6xl", className)}>
      {children}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
  back,
  eyebrow,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  back?: { href: string; label: string };
  eyebrow?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-col gap-4">
      {back && (
        <Link href={back.href} className="inline-flex items-center gap-1 self-start text-sm text-muted hover:text-ink">
          <ChevronLeft className="size-4" aria-hidden />
          {back.label}
        </Link>
      )}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex min-w-0 flex-col gap-1.5">
          {eyebrow}
          <h1 className="font-display text-[1.75rem] leading-tight font-medium tracking-[-0.035em] text-balance md:text-[2rem]">
            {title}
          </h1>
          {description && <p className="max-w-2xl text-muted">{description}</p>}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
      </div>
    </div>
  );
}

export function StatTile({
  label,
  value,
  hint,
  icon,
  className,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-3 rounded-card border border-line bg-canvas p-5", className)}>
      <div className="flex items-center justify-between gap-2 text-sm text-muted">
        <span>{label}</span>
        {icon && <span className="text-subtle [&_svg]:size-4">{icon}</span>}
      </div>
      <p className="text-2xl font-medium tracking-[-0.03em] tabular-nums">{value}</p>
      {hint && <p className="text-xs text-muted">{hint}</p>}
    </div>
  );
}

/** Card section with a title row, used across dashboards and detail pages. */
export function Panel({
  title,
  action,
  children,
  className,
  bodyClassName,
}: {
  title?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={cn("rounded-card border border-line bg-canvas", className)}>
      {title && (
        <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
          <h2 className="font-medium tracking-tight">{title}</h2>
          {action}
        </div>
      )}
      <div className={cn("p-5", bodyClassName)}>{children}</div>
    </section>
  );
}

export function PageSkeleton() {
  return (
    <Page>
      <div className="flex flex-col gap-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-9 w-72" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <div className="mt-10 grid gap-4 sm:grid-cols-3">
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
      </div>
      <Skeleton className="mt-6 h-72" />
    </Page>
  );
}
