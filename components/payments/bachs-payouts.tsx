"use client";

import { useEffect, useState } from "react";
import { BadgeCheck, ExternalLink, Landmark, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, Spinner } from "@/components/ui/feedback";
import { StatusPill } from "@/components/ui/primitives";
import { Panel } from "@/components/app/page-header";
import type { User } from "@/lib/domain/types";
import { refreshPayoutSetup, startPayoutSetup } from "@/lib/server/payment-actions";
import { refresh } from "@/lib/store";

const labels = {
  active: { text: "Ready for payouts", tone: "success" },
  onboarding: { text: "Setup unfinished", tone: "warning" },
  restricted: { text: "Needs attention", tone: "danger" },
} as const;

/** Payouts through Bachs Connect: Bachs collects and verifies bank details, never CampusHold. */
export function BachsPayouts({ me }: { me: User }) {
  const status = me.payouts?.status;
  const [busy, setBusy] = useState<"start" | "check" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [link, setLink] = useState<string | null>(null);

  async function check() {
    setBusy("check");
    await refreshPayoutSetup();
    await refresh();
    setBusy(null);
  }

  // Coming back from Bachs's onboarding page: re-read the account once.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("setup")) void refreshPayoutSetup().then(() => refresh());
  }, []);

  async function start() {
    setError(null);
    setBusy("start");
    const res = await startPayoutSetup();
    setBusy(null);
    if (!res.ok) return setError(res.error);
    void refresh();
    if (res.newTab) {
      setLink(res.url);
      window.open(res.url, "_blank", "noopener");
    } else {
      window.location.assign(res.url);
    }
  }

  return (
    <Panel title="Payout account" action={status && <StatusPill tone={labels[status].tone}>{labels[status].text}</StatusPill>}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-xl bg-surface">
            {status === "active" ? <BadgeCheck className="size-5 text-success" aria-hidden /> : <Landmark className="size-5" aria-hidden />}
          </span>
          <div className="max-w-md">
            <p className="font-medium">{status === "active" ? "Bank account verified by Bachs" : "Set up payouts with Bachs"}</p>
            <p className="text-sm text-muted">
              {status === "active"
                ? "Approved payments are sent to the account you gave Bachs."
                : "Bachs verifies your identity and bank account. Your bank details stay with Bachs."}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          {status && (
            <Button variant="ghost" size="sm" onClick={check} disabled={busy !== null}>
              {busy === "check" ? <Spinner /> : <RefreshCw />}
              Check status
            </Button>
          )}
          {status !== "active" && (
            <Button size="sm" onClick={start} disabled={busy !== null}>
              {busy === "start" && <Spinner />}
              {status ? "Continue setup" : "Set up payouts"}
            </Button>
          )}
        </div>
      </div>
      {link && (
        <Alert tone="info" className="mt-4">
          Bachs opened in a new tab. When you&rsquo;re done, come back and press &ldquo;Check status&rdquo;.{" "}
          <a href={link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-medium underline">
            Open again <ExternalLink className="size-3" aria-hidden />
          </a>
        </Alert>
      )}
      {error && <Alert tone="warning" className="mt-4">{error}</Alert>}
    </Panel>
  );
}
