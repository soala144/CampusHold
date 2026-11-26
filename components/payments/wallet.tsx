"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowDownLeft, ArrowUpRight, Clock, Hourglass, Landmark, ReceiptText, RotateCcw, Send, Wallet as WalletIcon } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState, SimulatedBadge, SimulatedNotice } from "@/components/ui/feedback";
import { StatusPill, type Tone } from "@/components/ui/primitives";
import { Tabs } from "@/components/ui/tabs";
import { Page, PageHeader, Panel, StatTile } from "@/components/app/page-header";
import { deriveBalances } from "@/lib/domain/payment";
import type { Job, Transaction } from "@/lib/domain/types";
import { cn } from "@/lib/cn";
import { formatDate, formatDateTime, formatMoney } from "@/lib/format";
import { currentUser, getUser, useAppState, type AppState } from "@/lib/store";

type Filter = "all" | "in" | "out" | "payout" | "refund";

const txStatusTone: Record<Transaction["status"], Tone> = {
  processing: "warning",
  pending: "info",
  succeeded: "success",
  failed: "danger",
};
const txStatusLabel: Record<Transaction["status"], string> = {
  processing: "Processing",
  pending: "Pending",
  succeeded: "Succeeded",
  failed: "Failed",
};

interface Row {
  tx: Transaction;
  job?: Job;
  direction: "in" | "out" | "neutral";
  label: string;
}

/** Describe a ledger entry from the viewer's side. */
function describe(s: AppState, tx: Transaction, me: string): Row {
  const job = s.jobs.find((j) => j.id === tx.jobId);
  const other = getUser(s, tx.userId === me ? tx.counterpartyId : tx.userId)?.displayName ?? "";
  if (tx.type === "payment") {
    return tx.userId === me
      ? { tx, job, direction: "out", label: `Payment to fund job with ${other}` }
      : { tx, job, direction: "neutral", label: `${other} funded the job` };
  }
  if (tx.type === "payout") {
    return tx.userId === me
      ? { tx, job, direction: "in", label: "Payout to your bank" }
      : { tx, job, direction: "neutral", label: `Released to ${other}` };
  }
  return tx.userId === me
    ? { tx, job, direction: "in", label: "Refund to you" }
    : { tx, job, direction: "neutral", label: `Refunded to ${other}` };
}

export function Wallet() {
  const s = useAppState();
  const me = currentUser(s);
  const mode = s.mode === "freelancer" && me.roles.freelancer ? "freelancer" : "client";
  const isClient = mode === "client";
  const [filter, setFilter] = useState<Filter>("all");
  const [open, setOpen] = useState<Row | null>(null);
  const b = deriveBalances(me.id, mode, s.jobs, s.transactions);
  const payout = s.payoutAccounts.find((a) => a.userId === me.id);

  const rows = s.transactions
    .filter((t) => {
      const job = s.jobs.find((j) => j.id === t.jobId);
      return job && (isClient ? job.clientId : job.freelancerId) === me.id;
    })
    .map((t) => describe(s, t, me.id))
    .sort((a, b) => b.tx.createdAt.localeCompare(a.tx.createdAt));

  const shown = rows.filter((r) =>
    filter === "all" ? true : filter === "in" ? r.direction === "in" : filter === "out" ? r.direction === "out" : r.tx.type === filter,
  );

  return (
    <Page>
      <PageHeader
        title={isClient ? "Payments" : "Earnings"}
        description={isClient ? "What you've paid, what's held for active jobs, and refunds." : "Money for your jobs, from funded to paid out."}
        actions={!isClient && <ButtonLink href="/wallet/payouts" variant="secondary"><Landmark />Payout account</ButtonLink>}
      />
      <SimulatedNotice className="mb-6" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Pending settlement" value={formatMoney(b.pendingSettlement)} hint="Confirmed, still settling with the provider" icon={<Hourglass />} />
        <StatTile label={isClient ? "Held for active jobs" : "Held until approval"} value={formatMoney(b.held)} hint="Settled, waiting for approval and release" icon={<Clock />} />
        {isClient ? (
          <>
            <StatTile label="Paid for completed work" value={formatMoney(b.settled)} icon={<Send />} />
            <StatTile label="Refunded to you" value={formatMoney(b.refunded)} icon={<RotateCcw />} />
          </>
        ) : (
          <>
            <StatTile label="Payout in transit" value={formatMoney(b.inTransit)} hint="Requested, being sent by the provider" icon={<Send />} />
            <StatTile label="Paid out to you" value={formatMoney(b.settled)} icon={<WalletIcon />} />
          </>
        )}
      </div>
      <p className="mt-3 text-xs text-muted">Balances are calculated from your job and transaction records, not stored separately.</p>

      {!isClient && (
        <div className="mt-6 flex flex-col gap-3 rounded-card border border-line bg-canvas p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-surface"><Landmark className="size-5" aria-hidden /></span>
            {payout ? (
              <div>
                <p className="font-medium">{payout.bankName} ••••{payout.accountNumberLast4}</p>
                <p className="text-sm text-muted">{payout.accountName}</p>
              </div>
            ) : (
              <div>
                <p className="font-medium">No payout account</p>
                <p className="text-sm text-muted">Add one so approved payments can reach you.</p>
              </div>
            )}
          </div>
          <ButtonLink href="/wallet/payouts" size="sm" variant={payout ? "secondary" : "primary"}>
            {payout ? "Manage" : "Add account"}
          </ButtonLink>
        </div>
      )}

      <Panel title="Transaction history" action={<SimulatedBadge />} className="mt-6" bodyClassName="p-0">
        <div className="border-b border-line px-5 py-3">
          <Tabs
            label="Filter transactions"
            value={filter}
            onChange={setFilter}
            items={[
              { value: "all", label: "All" },
              { value: "in", label: "Incoming" },
              { value: "out", label: "Outgoing" },
              ...(isClient ? [{ value: "refund" as const, label: "Refunds" }] : [{ value: "payout" as const, label: "Payouts" }]),
            ]}
          />
        </div>
        {shown.length === 0 ? (
          <div className="p-5">
            <EmptyState icon={<ReceiptText />} title="No transactions" description="Payments, payouts and refunds for your jobs will appear here." />
          </div>
        ) : (
          <ul className="divide-y divide-line">
            {shown.map((r) => (
              <li key={r.tx.id}>
                <button onClick={() => setOpen(r)} className="flex w-full items-center gap-4 px-5 py-4 text-left hover:bg-surface/60">
                  <span
                    className={cn(
                      "flex size-9 shrink-0 items-center justify-center rounded-full",
                      r.direction === "in" ? "bg-success-soft text-success" : r.direction === "out" ? "bg-surface text-ink" : "bg-surface text-muted",
                    )}
                  >
                    {r.direction === "out" ? <ArrowUpRight className="size-4" /> : <ArrowDownLeft className="size-4" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{r.label}</span>
                    <span className="block truncate text-xs text-muted">
                      {r.job?.title} · {formatDate(r.tx.createdAt, true)}
                    </span>
                  </span>
                  <span className="hidden sm:block">
                    <StatusPill tone={txStatusTone[r.tx.status]}>{txStatusLabel[r.tx.status]}</StatusPill>
                  </span>
                  <span className={cn("shrink-0 text-sm font-medium tabular-nums", r.direction === "in" && "text-success")}>
                    {r.direction === "in" ? "+" : r.direction === "out" ? "−" : ""}
                    {formatMoney(r.tx.amount)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Dialog open={Boolean(open)} onClose={() => setOpen(null)} title="Transaction details" description={open?.label}>
        {open && (
          <dl className="flex flex-col gap-3 text-sm">
            {[
              ["Amount", formatMoney(open.tx.amount)],
              ["Status", <StatusPill key="s" tone={txStatusTone[open.tx.status]}>{txStatusLabel[open.tx.status]}</StatusPill>],
              ["Type", open.tx.type[0].toUpperCase() + open.tx.type.slice(1)],
              ["Reference", <code key="r" className="font-mono text-xs">{open.tx.reference}</code>],
              ["Created", formatDateTime(open.tx.createdAt)],
              ["Last updated", formatDateTime(open.tx.updatedAt)],
              ["Job", open.job ? <Link key="j" href={`/jobs/${open.job.id}`} className="font-medium underline-offset-4 hover:underline">{open.job.title}</Link> : "—"],
              ["Source", <SimulatedBadge key="sim" />],
            ].map(([k, v]) => (
              <div key={k as string} className="flex items-center justify-between gap-4 border-b border-line pb-3 last:border-0">
                <dt className="text-muted">{k}</dt>
                <dd className="text-right">{v}</dd>
              </div>
            ))}
          </dl>
        )}
      </Dialog>
    </Page>
  );
}
