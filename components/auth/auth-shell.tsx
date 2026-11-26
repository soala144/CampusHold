import { CheckCircle2 } from "lucide-react";
import type { ReactNode } from "react";
import { Logo } from "@/components/ui/logo";

const points = [
  "Scope, price and deadline agreed up front",
  "Payment confirmed before work starts",
  "Released when the work is approved",
];

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_minmax(0,34rem)]">
      <div className="flex flex-col px-5 py-6 md:px-10">
        <Logo />
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-12">{children}</div>
        <p className="text-xs text-subtle">© 2026 CampusHold</p>
      </div>
      <aside className="relative hidden overflow-hidden bg-ink p-10 text-white lg:flex lg:flex-col lg:justify-end">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:linear-gradient(to_right,white_1px,transparent_1px),linear-gradient(to_bottom,white_1px,transparent_1px)] [background-size:56px_56px] [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]"
        />
        <div className="relative flex flex-col gap-8">
          <p className="font-display text-[2rem] leading-tight font-medium tracking-[-0.035em] text-balance">
            Every job agreed, funded and on record.
          </p>
          <ul className="flex flex-col gap-3">
            {points.map((p) => (
              <li key={p} className="flex items-center gap-3 text-white/75">
                <CheckCircle2 className="size-4 shrink-0 text-accent" aria-hidden />
                {p}
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </div>
  );
}

export function AuthHeading({ title, description }: { title: string; description?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-col gap-2">
      <h1 className="font-display text-[1.875rem] leading-tight font-medium tracking-[-0.035em]">{title}</h1>
      {description && <p className="text-muted">{description}</p>}
    </div>
  );
}

export function DemoHint({ children }: { children: ReactNode }) {
  return (
    <p className="mt-6 rounded-xl border border-dashed border-line-strong bg-surface px-4 py-3 text-xs text-muted">
      <span className="font-medium text-ink">Demo:</span> {children}
    </p>
  );
}
