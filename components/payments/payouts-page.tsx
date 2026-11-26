"use client";

import { useState } from "react";
import { Landmark, ReceiptText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Alert, EmptyState, SimulatedBadge } from "@/components/ui/feedback";
import { StatusPill } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { Page, PageHeader, Panel } from "@/components/app/page-header";
import { formatDate, formatMoney } from "@/lib/format";
import { currentUser, ops, run, useAppState } from "@/lib/store";
import { PayoutAccountForm } from "./payout-account-form";

export function PayoutsPage() {
  const s = useAppState();
  const me = currentUser(s);
  const toast = useToast();
  const account = s.payoutAccounts.find((a) => a.userId === me.id);
  const [editing, setEditing] = useState(!account);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const payouts = s.transactions
    .filter((t) => t.type === "payout" && t.userId === me.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  if (!me.roles.freelancer) {
    return (
      <Page className="max-w-3xl">
        <PageHeader title="Payout account" />
        <Alert tone="info" title="Payouts are for freelancers">Turn on &ldquo;Offer services&rdquo; in settings to receive payouts.</Alert>
      </Page>
    );
  }

  return (
    <Page className="max-w-3xl">
      <PageHeader back={{ href: "/wallet", label: "Earnings" }} title="Payout account" description="Where approved payments are sent." />

      <Panel title="Bank account" action={account && <StatusPill tone={account.status === "verified" ? "success" : "warning"}>{account.status === "verified" ? "Verified" : "Pending verification"}</StatusPill>}>
        {account && !editing ? (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="flex size-11 items-center justify-center rounded-xl bg-surface"><Landmark className="size-5" aria-hidden /></span>
              <div>
                <p className="font-medium">{account.bankName} ••••{account.accountNumberLast4}</p>
                <p className="text-sm text-muted">{account.accountName} · added {formatDate(account.createdAt, true)}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>Change</Button>
              <Button variant="ghost" size="sm" onClick={() => setConfirmRemove(true)}>Remove</Button>
            </div>
          </div>
        ) : (
          <PayoutAccountForm
            defaultName={`${me.lastName} ${me.firstName}`}
            onSubmit={(d) => {
              run(
                ops.savePayoutAccount({
                  userId: me.id,
                  bankName: d.bankName,
                  accountNumberLast4: d.accountNumber.slice(-4),
                  accountName: d.accountName,
                  status: "pending_verification",
                  createdAt: new Date().toISOString(),
                }),
              );
              setEditing(false);
              toast.success("Payout account saved");
            }}
            secondary={account && <Button variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>}
          />
        )}
        {account?.status === "pending_verification" && !editing && (
          <Alert tone="warning" className="mt-4">
            We&rsquo;re confirming this account with the payment provider. Payouts will go here once it&rsquo;s verified.
          </Alert>
        )}
      </Panel>

      <Panel title="Payout history" action={<SimulatedBadge />} className="mt-6" bodyClassName="p-0">
        {payouts.length === 0 ? (
          <div className="p-5"><EmptyState icon={<ReceiptText />} title="No payouts yet" description="When a client approves your work, the payout appears here." /></div>
        ) : (
          <ul className="divide-y divide-line">
            {payouts.map((t) => {
              const job = s.jobs.find((j) => j.id === t.jobId);
              return (
                <li key={t.id} className="flex items-center justify-between gap-4 px-5 py-4 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{job?.title}</p>
                    <p className="text-xs text-muted">{formatDate(t.createdAt, true)} · {t.reference}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusPill tone={t.status === "succeeded" ? "success" : t.status === "failed" ? "danger" : "warning"}>
                      {t.status === "succeeded" ? "Sent" : t.status === "failed" ? "Failed" : "Processing"}
                    </StatusPill>
                    <span className="font-medium tabular-nums">{formatMoney(t.amount)}</span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      <p className="mt-4 text-xs text-muted">
        Payout timing depends on the payment provider&rsquo;s settlement schedule. We&rsquo;ll publish expected timings before live payments launch.
      </p>

      <Dialog
        open={confirmRemove}
        onClose={() => { setConfirmRemove(false); setError(null); }}
        title="Remove payout account?"
        description="You won't be able to receive payouts until you add a new one."
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmRemove(false)}>Keep it</Button>
            <Button
              onClick={() => {
                const r = run(ops.removePayoutAccount(me.id));
                if (!r.ok) return setError(r.error);
                setConfirmRemove(false);
                setEditing(true);
                toast.success("Payout account removed");
              }}
            >
              Remove
            </Button>
          </>
        }
      >
        {error && <Alert tone="danger">{error}</Alert>}
      </Dialog>
    </Page>
  );
}
