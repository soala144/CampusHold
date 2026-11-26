import {
  CalendarDays,
  CheckCircle2,
  FileText,
  Paperclip,
  RotateCcw,
  SendHorizontal,
  ShieldCheck,
} from "lucide-react";
import { StatusPill } from "@/components/ui/primitives";
import { cn } from "@/lib/cn";

/**
 * Static, illustrative mock of a CampusHold job workspace.
 * Purely presentational — no real data or payment state.
 */
export function WorkspacePreview() {
  return (
    <div className="relative">
      {/* Floating event cards (desktop only, echoing the references) */}
      <FloatCard className="-top-6 -left-10 -rotate-3 hidden xl:flex">
        <span className="flex size-8 items-center justify-center rounded-full bg-success-soft text-success">
          <ShieldCheck className="size-4" />
        </span>
        <div>
          <p className="text-sm font-medium">Payment confirmed</p>
          <p className="text-xs text-muted">Verified with provider</p>
        </div>
      </FloatCard>

      <FloatCard className="-top-7 -right-10 rotate-2 hidden xl:flex">
        <span className="flex size-8 items-center justify-center rounded-full bg-accent text-accent-ink">
          <FileText className="size-4" />
        </span>
        <div>
          <p className="text-sm font-medium">Delivery submitted</p>
          <p className="text-xs text-muted">3 files · awaiting review</p>
        </div>
      </FloatCard>

      <FloatCard className="-bottom-14 -left-12 rotate-2 hidden xl:flex">
        <span className="flex size-8 items-center justify-center rounded-full bg-warning-soft text-warning">
          <RotateCcw className="size-4" />
        </span>
        <div>
          <p className="text-sm font-medium">Revision requested</p>
          <p className="text-xs text-muted">1 of 2 included</p>
        </div>
      </FloatCard>

      {/* App frame */}
      <div className="overflow-hidden rounded-panel border border-line bg-canvas shadow-float">
        <div className="flex items-center gap-2 border-b border-line bg-surface px-4 py-3">
          <span className="size-2.5 rounded-full bg-line-strong" />
          <span className="size-2.5 rounded-full bg-line-strong" />
          <span className="size-2.5 rounded-full bg-line-strong" />
          <span className="ml-3 truncate text-xs text-subtle">Job workspace · Brand identity</span>
        </div>

        <div className="grid md:grid-cols-[17rem_1fr]">
          {/* Job context */}
          <aside className="flex flex-col gap-5 border-b border-line p-5 text-left md:border-r md:border-b-0">
            <div className="flex flex-col gap-2">
              <StatusPill tone="info" className="self-start">
                In progress
              </StatusPill>
              <h3 className="text-[1.0625rem] font-medium tracking-tight">
                Brand identity for a campus café
              </h3>
            </div>

            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl bg-surface p-3">
                <dt className="text-xs text-muted">Agreed price</dt>
                <dd className="mt-1 font-medium tabular-nums">₦85,000</dd>
              </div>
              <div className="rounded-xl bg-surface p-3">
                <dt className="text-xs text-muted">Deadline</dt>
                <dd className="mt-1 flex items-center gap-1.5 font-medium">
                  <CalendarDays className="size-3.5 text-muted" />
                  12 Dec
                </dd>
              </div>
            </dl>

            <div>
              <p className="text-xs font-medium text-muted">Deliverables</p>
              <ul className="mt-2 flex flex-col gap-1.5 text-sm">
                {["Logo + variations", "Colour & type guide", "Menu template"].map((d, i) => (
                  <li key={d} className="flex items-center gap-2">
                    <CheckCircle2
                      className={cn("size-4", i < 2 ? "text-success" : "text-line-strong")}
                    />
                    {d}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-muted">Payment</span>
                <span className="text-success">Held until approval</span>
              </div>
              <div className="mt-2 flex gap-1">
                {[1, 1, 1, 0, 0].map((on, i) => (
                  <span
                    key={i}
                    className={cn("h-1.5 flex-1 rounded-full", on ? "bg-ink" : "bg-line")}
                  />
                ))}
              </div>
              <p className="mt-2 text-xs text-subtle">Funded · Working · Review · Release</p>
            </div>
          </aside>

          {/* Thread */}
          <div className="flex min-h-[22rem] flex-col">
            <div className="flex flex-1 flex-col gap-4 p-5 text-left">
              <SystemEvent>Payment confirmed · work can begin</SystemEvent>

              <Message who="Ada · Freelancer" side="left">
                First logo directions are up. I went with two routes — warm and minimal.
              </Message>

              <Message who="You" side="right">
                Route B is great. Can we try a darker green?
              </Message>

              <SystemEvent>Delivery submitted · 3 files</SystemEvent>

              <div className="flex gap-2">
                {["logo-final.pdf", "brand-guide.pdf"].map((f) => (
                  <span
                    key={f}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 text-xs text-muted"
                  >
                    <Paperclip className="size-3.5" />
                    {f}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 border-t border-line p-4">
              <span className="inline-flex h-9 items-center rounded-full bg-ink px-4 text-sm font-medium text-white">
                Approve work
              </span>
              <span className="inline-flex h-9 items-center rounded-full border border-line-strong px-4 text-sm font-medium">
                Request revision
              </span>
              <span className="ml-auto hidden size-9 items-center justify-center rounded-full bg-surface text-muted sm:inline-flex">
                <SendHorizontal className="size-4" />
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FloatCard({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div
      aria-hidden
      className={cn(
        "absolute z-10 items-center gap-3 rounded-2xl border border-line bg-canvas py-3 pr-5 pl-3 text-left shadow-float",
        className,
      )}
    >
      {children}
    </div>
  );
}

function SystemEvent({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 text-xs text-subtle">
      <span className="h-px flex-1 bg-line" />
      <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1 font-medium text-muted">
        <span className="size-1.5 rounded-full bg-accent-strong" />
        {children}
      </span>
      <span className="h-px flex-1 bg-line" />
    </div>
  );
}

function Message({
  who,
  side,
  children,
}: {
  who: string;
  side: "left" | "right";
  children: React.ReactNode;
}) {
  return (
    <div className={cn("flex max-w-[85%] flex-col gap-1", side === "right" && "self-end items-end")}>
      <span className="text-xs text-subtle">{who}</span>
      <p
        className={cn(
          "rounded-2xl px-4 py-2.5 text-sm",
          side === "left" ? "rounded-tl-md bg-surface" : "rounded-tr-md bg-ink text-white",
        )}
      >
        {children}
      </p>
    </div>
  );
}
