"use client";

import Link from "next/link";
import { FlaskConical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import type { Actor, JobAction } from "@/lib/domain/job-machine";
import type { Job } from "@/lib/domain/types";
import { ops, run, type Result } from "@/lib/store";

interface SimAction {
  label: string;
  run: () => Result<unknown>;
  success: string;
  variant?: "secondary" | "ghost";
}

/**
 * Stage 2 test controls: lets one demo account play the other party and the
 * payment provider, so every workflow can be exercised end to end.
 * Removed once real accounts and the provider integration exist.
 */
export function SimulationPanel({ job, role }: { job: Job; role: "client" | "freelancer" }) {
  const toast = useToast();
  const otherRole: Actor = role === "client" ? "freelancer" : "client";
  const otherId = role === "client" ? job.freelancerId : job.clientId;
  const as = (action: JobAction, extra: Omit<ops.JobActionInput, "as" | "byUserId"> = {}) => () =>
    run(ops.jobAction(job.id, action, { as: otherRole, byUserId: otherId, ...extra }));
  const system = (action: JobAction) => () => run(ops.jobAction(job.id, action, { as: "system" }));
  const who = role === "client" ? "Freelancer" : "Client";

  const actions: SimAction[] = [];
  const s = job.status;
  const p = job.paymentStatus;

  // Other party
  if (role === "client") {
    if (s === "pending_response") {
      actions.push({ label: "Freelancer accepts", run: as("accept"), success: "Freelancer accepted" });
      actions.push({ label: "Freelancer declines", run: as("decline", { note: "Fully booked this month, sorry!" }), success: "Freelancer declined", variant: "ghost" });
    }
    if (s === "payment_confirmed") actions.push({ label: "Freelancer starts work", run: as("start_work"), success: "Work started" });
    if (s === "in_progress" || s === "revision_requested") {
      actions.push({
        label: "Freelancer submits delivery",
        run: () =>
          as("submit_delivery", {
            submission: {
              note: s === "revision_requested" ? "Revision done — changes applied as requested." : "All deliverables attached. Let me know what you think!",
              files: [{ id: `file_${crypto.randomUUID().slice(0, 8)}`, name: "delivery.zip", sizeBytes: 3_400_000 }],
            },
          })(),
        success: "Delivery submitted",
      });
    }
  } else {
    if (s === "accepted") {
      actions.push({
        label: "Client funds the job",
        run: () => {
          const r = as("initiate_payment")();
          return r.ok ? system("confirm_payment")() : r;
        },
        success: "Payment confirmed",
      });
    }
    if (s === "submitted") {
      actions.push({ label: "Client approves", run: as("approve"), success: "Client approved the work" });
      if (job.revisionsUsed < job.revisionsAllowed) {
        actions.push({ label: "Client requests revision", run: as("request_revision", { note: "Please tighten the spacing on mobile and fix the footer links." }), success: "Revision requested", variant: "ghost" });
      }
    }
  }

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

  return (
    <section className="rounded-card border border-dashed border-warning/50 bg-warning-soft/40 p-4">
      <div className="mb-3 flex items-center gap-2">
        <FlaskConical className="size-4 text-warning" aria-hidden />
        <h2 className="text-sm font-medium">Simulation controls</h2>
      </div>
      <p className="mb-3 text-xs text-muted">
        Act as the {who.toLowerCase()} or the payment provider to test this workflow. Not part of the real product.
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
