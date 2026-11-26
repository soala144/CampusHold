"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import { BadgeCheck, Clock, FileSearch, Lock, ShieldCheck, XCircle } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button, ButtonLink } from "@/components/ui/button";
import { Alert, EmptyState, SimulatedNotice, Spinner } from "@/components/ui/feedback";
import { Page, PageHeader, Panel } from "@/components/app/page-header";
import { can } from "@/lib/domain/job-machine";
import { formatMoney } from "@/lib/format";
import { delay } from "@/lib/simulate";
import { currentUser, getUser, ops, run, useAppState } from "@/lib/store";

type Phase = "review" | "verifying" | "success" | "failed" | "pending";

/**
 * Simulated payment flow. The real flow (Stage 4) redirects to the provider's
 * hosted checkout and only marks the job funded after server-side verification.
 */
export function Checkout() {
  const { id } = useParams<{ id: string }>();
  const s = useAppState();
  const me = currentUser(s);
  const job = s.jobs.find((j) => j.id === id);
  const [phase, setPhase] = useState<Phase>("review");
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!job) {
    return (
      <Page>
        <EmptyState icon={<FileSearch />} title="Job not found" action={<ButtonLink href="/jobs" size="sm">Back to jobs</ButtonLink>} />
      </Page>
    );
  }
  if (job.clientId !== me.id) {
    return (
      <Page>
        <EmptyState icon={<Lock />} title="Only the client can fund this job" action={<ButtonLink href={`/jobs/${job.id}`} size="sm">Back to job</ButtonLink>} />
      </Page>
    );
  }

  const freelancer = getUser(s, job.freelancerId)!;
  const workspace = `/jobs/${job.id}`;

  async function pay(outcome: "success" | "failed" | "pending") {
    setError(null);
    const started = run(ops.jobAction(job!.id, "initiate_payment", { as: "client", byUserId: me.id }));
    if (!started.ok) return setError(started.error);
    setPhase("verifying");
    await delay(1800);
    if (outcome === "pending") return setPhase("pending");
    const r = run(ops.jobAction(job!.id, outcome === "success" ? "confirm_payment" : "fail_payment", { as: "system" }));
    if (!r.ok) return setError(r.error);
    setPhase(outcome === "success" ? "success" : "failed");
  }

  if (phase === "verifying") {
    return (
      <Page className="max-w-xl">
        <div className="flex flex-col items-center gap-4 py-20 text-center" role="status">
          <Spinner className="size-8 text-ink" />
          <h1 className="text-xl font-medium tracking-tight">Verifying your payment</h1>
          <p className="max-w-sm text-muted">
            We&rsquo;re confirming the payment directly with the payment provider. Please don&rsquo;t close this page.
          </p>
        </div>
      </Page>
    );
  }

  if (phase !== "review") {
    const content = {
      success: { icon: <BadgeCheck className="size-7 text-success" />, bg: "bg-success-soft", title: "Payment confirmed", body: `${freelancer.firstName} has been notified and can start work. You'll approve the delivery before anything is released.` },
      failed: { icon: <XCircle className="size-7 text-danger" />, bg: "bg-danger-soft", title: "Payment didn't go through", body: "No money was taken. You can try again, or contact your bank if it keeps happening." },
      pending: { icon: <Clock className="size-7 text-warning" />, bg: "bg-warning-soft", title: "Waiting for confirmation", body: "The provider hasn't confirmed this payment yet. That can take a few minutes. We'll update the job and notify you as soon as it's verified — no need to pay again." },
    }[phase];
    return (
      <Page className="max-w-xl">
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <span className={`flex size-14 items-center justify-center rounded-2xl ${content.bg}`}>{content.icon}</span>
          <h1 className="text-2xl font-medium tracking-[-0.03em]">{content.title}</h1>
          <p className="max-w-md text-muted">{content.body}</p>
          <div className="mt-4 flex gap-2">
            {phase === "failed" && <Button onClick={() => setPhase("review")}>Try again</Button>}
            <ButtonLink href={workspace} variant={phase === "failed" ? "secondary" : "primary"}>
              Go to job workspace
            </ButtonLink>
          </div>
        </div>
      </Page>
    );
  }

  const fundable = can(job, "initiate_payment", "client");

  return (
    <Page className="max-w-3xl">
      <PageHeader back={{ href: workspace, label: "Back to job" }} title="Fund this job" description="Payment is confirmed before work starts and only released after you approve the delivery." />

      <SimulatedNotice className="mb-6">
        This checkout is simulated. No card or bank details are collected and no money moves. In the live product you&rsquo;ll pay on the payment provider&rsquo;s secure page.
      </SimulatedNotice>

      {!fundable && (
        <Alert tone="warning" title="This job can't be funded right now" className="mb-6" action={<ButtonLink href={workspace} size="sm" variant="secondary">View job</ButtonLink>}>
          {job.status === "awaiting_payment"
            ? "A payment is already being verified. We'll update the job once the provider confirms it."
            : "Only accepted jobs that haven't been paid can be funded."}
        </Alert>
      )}
      {job.paymentStatus === "failed" && fundable && (
        <Alert tone="danger" className="mb-6">Your last payment attempt failed. No money was taken.</Alert>
      )}

      <div className="grid gap-6 md:grid-cols-[1fr_18rem]">
        <Panel title="Summary">
          <div className="flex items-center gap-3">
            <Avatar user={freelancer} />
            <div>
              <p className="font-medium">{job.title}</p>
              <p className="text-sm text-muted">with {freelancer.displayName}</p>
            </div>
          </div>
          <dl className="mt-5 flex flex-col gap-2.5 border-t border-line pt-5 text-sm">
            <div className="flex justify-between"><dt className="text-muted">Agreed price</dt><dd className="tabular-nums">{formatMoney(job.budget)}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">Platform fee</dt><dd className="text-muted">To be confirmed · not charged</dd></div>
            <div className="flex justify-between"><dt className="text-muted">Provider charges</dt><dd className="text-muted">Shown at checkout</dd></div>
            <div className="mt-2 flex justify-between border-t border-line pt-3 text-base font-medium"><dt>Total</dt><dd className="tabular-nums">{formatMoney(job.budget)}</dd></div>
          </dl>
          <label className="mt-5 flex cursor-pointer items-start gap-3 text-sm text-ink-soft">
            <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-0.5 size-4 accent-ink" />
            I understand the payment is held until I approve the work or a dispute is resolved, under CampusHold&rsquo;s payment terms.
          </label>
        </Panel>

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-3 rounded-card border border-line bg-canvas p-5">
            <p className="flex items-center gap-2 text-sm font-medium">
              <ShieldCheck className="size-4 text-success" aria-hidden />
              Simulated checkout
            </p>
            <Button disabled={!fundable || !agreed} onClick={() => pay("success")}>
              Pay {formatMoney(job.budget)}
            </Button>
            <p className="text-xs text-muted">Test other outcomes:</p>
            <Button size="sm" variant="secondary" disabled={!fundable || !agreed} onClick={() => pay("failed")}>
              Simulate failed payment
            </Button>
            <Button size="sm" variant="secondary" disabled={!fundable || !agreed} onClick={() => pay("pending")}>
              Simulate delayed confirmation
            </Button>
            {!agreed && fundable && <p className="text-xs text-muted">Tick the box to continue.</p>}
          </div>
          {error && <Alert tone="danger">{error}</Alert>}
        </div>
      </div>
    </Page>
  );
}
