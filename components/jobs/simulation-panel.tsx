"use client";

import Link from "next/link";
import { FlaskConical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import type { JobAction } from "@/lib/domain/job-machine";
import type { Job } from "@/lib/domain/types";
import { ops, run, useAppState, type Result } from "@/lib/store";

interface SimAction {
  label: string;
  run: () => Result<unknown>;
  success: string;
  variant?: "secondary" | "ghost";
}

/**
 * Test controls for the payment provider, which is simulated until Stage 4.
 * They only stand in for provider events (confirmations, settlement,
 * transfers). People always act as themselves; to test the other side of a
 * job, sign in as the other party.
 */
export function SimulationPanel({ job }: { job: Job }) {
  const toast = useToast();
  const simulation = useAppState().simulation;
  const system = (action: JobAction) => () => run(ops.jobAction(job.id, action, { as: "system" }));

  const actions: SimAction[] = [];
  const s = job.status;
  const p = job.paymentStatus;

  // Payment provider
  if (s === "awaiting_payment") {
    actions.push({ label: "Provider confirms payment", run: system("confirm_payment"), success: "Payment confirmed" });
    actions.push({ label: "Payment fails", run: system("fail_payment"), success: "Payment failed", variant: "ghost" });
  }
  if (p === "pending_settlement" || p === "confirmed") {
    actions.push({ label: "Funds settle", run: () => run(ops.settleFunds(job.id)), success: "Funds settled" });
  }
  if (s === "approved" && p === "release_requested") {
    actions.push({ label: "Transfer succeeds", run: system("complete"), success: "Transfer completed" });
    actions.push({ label: "Transfer fails", run: () => run(ops.failTransfer(job.id)), success: "Transfer failed", variant: "ghost" });
  }
  if (s === "approved" && p === "available") {
    actions.push({ label: "Retry transfer", run: () => run(ops.retryTransfer(job.id)), success: "Transfer re-requested" });
  }

  if (!simulation) return null;

  return (
    <section className="rounded-card border border-dashed border-warning/50 bg-warning-soft/40 p-4">
      <div className="mb-3 flex items-center gap-2">
        <FlaskConical className="size-4 text-warning" aria-hidden />
        <h2 className="text-sm font-medium">Simulation controls</h2>
      </div>
      <p className="mb-3 text-xs text-muted">
        Stand in for the payment provider to test this workflow. Not part of the real product.
      </p>
      {actions.length === 0 ? (
        <p className="text-xs text-muted">
          {s === "disputed" ? (
            <>
              Resolve this from the{" "}
              <Link href={`/admin/disputes`} className="font-medium text-ink underline underline-offset-2">
                admin disputes page
              </Link>
              .
            </>
          ) : (
            "Nothing to simulate at this stage."
          )}
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {actions.map((a) => (
            <Button
              key={a.label}
              size="sm"
              variant={a.variant ?? "secondary"}
              onClick={() => {
                const r = a.run();
                if (r.ok) toast.success(`${a.success} (simulated)`);
                else toast.error(r.error);
              }}
            >
              {a.label}
            </Button>
          ))}
        </div>
      )}
    </section>
  );
}
