"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { BadgeCheck, Clock, ExternalLink, Lock, ShieldCheck, XCircle } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button, ButtonLink } from "@/components/ui/button";
import { Alert, Spinner } from "@/components/ui/feedback";
import { Page, PageHeader, Panel } from "@/components/app/page-header";
import type { Job, User } from "@/lib/domain/types";
import { formatMoney } from "@/lib/format";
import { checkJobPayment, startJobCheckout } from "@/lib/server/payment-actions";
import { refresh, useAppState } from "@/lib/store";

type Phase = "review" | "opening" | "waiting" | "paid" | "failed";
const POLL_MS = 4000;

/**
 * Real payment with Bachs. We never treat the redirect back as proof:
 * the page asks our server, which reads the checkout from Bachs.
 */
export function BachsCheckout({ job, freelancer }: { job: Job; freelancer: User }) {
  const s = useAppState();
  const router = useRouter();
  const params = useSearchParams();
  const sandbox = s.payments === "bachs-sandbox";
  const tx = s.transactions.find((t) => t.jobId === job.id && t.type === "payment" && t.status === "processing");
  const initial: Phase = job.status === "awaiting_payment" || params.get("returned") ? "waiting" : "review";
  const [phase, setPhase] = useState<Phase>(initial);
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState<string | null>(params.get("cancelled") ? "Payment was cancelled. No money was taken." : null);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(tx?.checkoutUrl ?? null);
  const stopped = useRef(false);
  const workspace = `/jobs/${job.id}`;

  const check = useCallback(async () => {
    const result = await checkJobPayment(job.id);
    if (result === "paid") {
      setPhase("paid");
      void refresh();
    } else if (result === "failed" || result === "expired") {
      setPhase("failed");
      void refresh();
    }
    return result;
  }, [job.id]);

  // Poll Bachs (through our server) while we wait for the payment.
  useEffect(() => {
    if (phase !== "waiting") return;
    stopped.current = false;
    const tick = async () => {
      if (stopped.current) return;
      await check();
    };
    void tick();
    const id = setInterval(tick, POLL_MS);
    return () => {
      stopped.current = true;
      clearInterval(id);
    };
  }, [phase, check]);

  async function pay() {
    setError(null);
    setPhase("opening");
    const res = await startJobCheckout(job.id);
    if (!res.ok) {
      setError(res.error);
      setPhase("review");
      return;
    }
    setCheckoutUrl(res.url);
    if (res.newTab) {
      // Local development: Bachs can't send people back to localhost, so checkout opens beside this page.
      window.open(res.url, "_blank", "noopener");
      setPhase("waiting");
    } else {
      window.location.assign(res.url);
    }
  }

  if (phase === "paid") {
    return (
      <Outcome icon={<BadgeCheck className="size-7 text-success" />} tone="bg-success-soft" title="Payment confirmed">
        <p className="max-w-md text-muted">
          Bachs has confirmed your payment of {formatMoney(job.budget)}. {freelancer.firstName} can start work. You&rsquo;ll
          approve the delivery before anything is released.
        </p>
        <ButtonLink href={workspace} className="mt-4">Go to job workspace</ButtonLink>
      </Outcome>
    );
  }
  if (phase === "failed") {
    return (
      <Outcome icon={<XCircle className="size-7 text-danger" />} tone="bg-danger-soft" title="Payment didn’t go through">
        <p className="max-w-md text-muted">No money was taken. You can try again.</p>
        <div className="mt-4 flex gap-2">
          <Button onClick={() => { setPhase("review"); router.refresh(); }}>Try again</Button>
          <ButtonLink href={workspace} variant="secondary">Back to job</ButtonLink>
        </div>
      </Outcome>
    );
  }
  if (phase === "waiting") {
    return (
      <Outcome icon={<Clock className="size-7 text-warning" />} tone="bg-warning-soft" title="Waiting for Bachs to confirm">
        <p className="max-w-md text-muted">
          Complete the payment on the Bachs page. This page updates on its own as soon as Bachs confirms it, usually within a minute.
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {checkoutUrl && (
            <a href={checkoutUrl} target="_blank" rel="noopener noreferrer" className="inline-flex h-11 items-center gap-2 rounded-full bg-ink px-5 text-[0.9375rem] font-medium text-white hover:bg-ink-soft">
              Open payment page <ExternalLink className="size-4" aria-hidden />
            </a>
          )}
          <Button variant="secondary" onClick={() => void check()}>
            <Spinner />
            Check now
          </Button>
        </div>
        <ButtonLink href={workspace} variant="ghost" className="mt-2">Back to job</ButtonLink>
      </Outcome>
    );
  }

  return (
    <Page className="max-w-3xl">
      <PageHeader
        back={{ href: workspace, label: "Back to job" }}
        title="Fund this job"
        description="Pay securely with Bachs. The payment is held and only released after you approve the delivery."
      />
      {sandbox && (
        <Alert tone="warning" title="Test mode" className="mb-6">
          Payments use Bachs’s sandbox. No real money moves. Choose bank transfer and press “I have sent the money” to simulate a payment.
        </Alert>
      )}
      {error && <Alert tone="danger" className="mb-6">{error}</Alert>}
      {job.status !== "accepted" && (
        <Alert tone="warning" className="mb-6">Only accepted jobs that haven&rsquo;t been paid can be funded.</Alert>
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
            <div className="flex justify-between"><dt className="text-muted">Platform fee</dt><dd className="text-muted">None during early access</dd></div>
            <div className="mt-2 flex justify-between border-t border-line pt-3 text-base font-medium"><dt>Total</dt><dd className="tabular-nums">{formatMoney(job.budget)}</dd></div>
          </dl>
          <label className="mt-5 flex cursor-pointer items-start gap-3 text-sm text-ink-soft">
            <input id="agree-terms" type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-0.5 size-4 accent-ink" />
            I understand the payment is held until I approve the work or a dispute is resolved.
          </label>
        </Panel>
        <div className="flex flex-col gap-3 self-start rounded-card border border-line bg-canvas p-5">
          <p className="flex items-center gap-2 text-sm font-medium">
            <ShieldCheck className="size-4 text-success" aria-hidden />
            Secure checkout by Bachs
          </p>
          <Button disabled={!agreed || job.status !== "accepted" || phase === "opening"} onClick={pay}>
            {phase === "opening" ? <Spinner /> : <Lock />}
            Pay {formatMoney(job.budget)}
          </Button>
          <p className="text-xs text-muted">You&rsquo;ll enter your card or bank details on Bachs&rsquo;s page, never on CampusHold.</p>
        </div>
      </div>
    </Page>
  );
}

function Outcome({ icon, tone, title, children }: { icon: React.ReactNode; tone: string; title: string; children: React.ReactNode }) {
  return (
    <Page className="max-w-xl">
      <div className="flex flex-col items-center gap-3 py-16 text-center" role="status">
        <span className={`flex size-14 items-center justify-center rounded-2xl ${tone}`}>{icon}</span>
        <h1 className="text-2xl font-medium tracking-[-0.03em]">{title}</h1>
        {children}
      </div>
    </Page>
  );
}
