"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { Briefcase, CircleDollarSign, Lock, Scale, Search, Users } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button, ButtonLink } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState, SimulatedBadge, SimulatedNotice } from "@/components/ui/feedback";
import { Input, Select } from "@/components/ui/form";
import { StatusPill } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { Page, PageHeader, Panel, StatTile } from "@/components/app/page-header";
import { DisputeRow } from "@/components/disputes/disputes";
import { JobStatusPill, PaymentStatusPill } from "@/components/jobs/job-bits";
import { ACTIVE_STATUSES, jobStatusMeta } from "@/lib/domain/job-machine";
import { HELD_PAYMENT_STATES } from "@/lib/domain/payment";
import type { JobStatus, User } from "@/lib/domain/types";
import { formatDate, formatDateTime, formatMoney, timeAgo } from "@/lib/format";
import { currentUser, getUser, ops, run, useAppState } from "@/lib/store";

/**
 * Admin screens. Hiding them for non-admins here is only a UI convenience:
 * Stage 3 enforces admin permissions on the server for every admin action.
 */
function AdminGate({ children }: { children: ReactNode }) {
  const s = useAppState();
  if (!currentUser(s).isAdmin) {
    return (
      <Page>
        <EmptyState icon={<Lock />} title="Admins only" description="You don't have permission to view this page." action={<ButtonLink href="/dashboard" size="sm">Go to dashboard</ButtonLink>} />
      </Page>
    );
  }
  return <>{children}</>;
}

function Table({ head, children }: { head: string[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-card border border-line bg-canvas">
      <table className="w-full min-w-[42rem] text-sm">
        <thead className="border-b border-line bg-surface/60 text-left text-xs text-muted">
          <tr>{head.map((h) => <th key={h} className="px-4 py-3 font-medium">{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-line">{children}</tbody>
      </table>
    </div>
  );
}

/* ---------- Overview ---------- */

export function AdminOverview() {
  const s = useAppState();
  const active = s.jobs.filter((j) => ACTIVE_STATUSES.includes(j.status));
  const held = s.jobs.filter((j) => HELD_PAYMENT_STATES.includes(j.paymentStatus)).reduce((n, j) => n + j.budget, 0);
  const openDisputes = s.disputes.filter((d) => d.status !== "resolved");
  const byStatus = (Object.keys(jobStatusMeta) as JobStatus[])
    .map((st) => ({ st, n: s.jobs.filter((j) => j.status === st).length }))
    .filter((x) => x.n > 0);
  const max = Math.max(...byStatus.map((x) => x.n), 1);

  return (
    <AdminGate>
      <Page wide>
        <PageHeader eyebrow={<span className="text-sm text-muted">Administration</span>} title="Platform overview" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile label="Users" value={s.users.length} hint={`${s.users.filter((u) => u.status === "suspended").length} suspended`} icon={<Users />} />
          <StatTile label="Active jobs" value={active.length} hint={`${s.jobs.length} total`} icon={<Briefcase />} />
          <StatTile label="Funds held for jobs" value={formatMoney(held)} hint={<SimulatedBadge />} icon={<CircleDollarSign />} />
          <StatTile label="Open disputes" value={openDisputes.length} icon={<Scale />} />
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <Panel title="Jobs by status">
            <ul className="flex flex-col gap-2.5">
              {byStatus.map(({ st, n }) => (
                <li key={st} className="grid grid-cols-[9.5rem_1fr_2rem] items-center gap-3 text-sm">
                  <span className="truncate text-muted">{jobStatusMeta[st].label}</span>
                  <span className="h-2 overflow-hidden rounded-full bg-surface">
                    <span className="block h-full rounded-full bg-ink" style={{ width: `${(n / max) * 100}%` }} />
                  </span>
                  <span className="text-right tabular-nums">{n}</span>
                </li>
              ))}
            </ul>
          </Panel>
          <Panel title="Audit log" bodyClassName="p-0">
            <ul className="divide-y divide-line">
              {s.audit.slice(0, 8).map((a) => (
                <li key={a.id} className="flex items-start justify-between gap-3 px-5 py-3 text-sm">
                  <span>
                    <span className="font-medium">{a.action}</span>
                    <span className="text-muted"> · {a.target}</span>
                    <span className="block text-xs text-subtle">
                      by {a.actorId === "system" ? "System" : a.actorId === "admin" ? "Admin" : getUser(s, a.actorId)?.displayName}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs text-subtle">{timeAgo(a.createdAt)}</span>
                </li>
              ))}
            </ul>
          </Panel>
        </div>

        {openDisputes.length > 0 && (
          <Panel title="Disputes needing attention" className="mt-6" bodyClassName="p-0">
            <ul className="divide-y divide-line">
              {openDisputes.map((d) => <DisputeRow key={d.id} d={d} s={s} href={`/admin/disputes/${d.id}`} />)}
            </ul>
          </Panel>
        )}
      </Page>
    </AdminGate>
  );
}

/* ---------- Users ---------- */

export function AdminUsers() {
  const s = useAppState();
  const toast = useToast();
  const [q, setQ] = useState("");
  const [role, setRole] = useState<"all" | "client" | "freelancer">("all");
  const [target, setTarget] = useState<User | null>(null);
  const term = q.trim().toLowerCase();
  const users = s.users.filter(
    (u) =>
      (role === "all" || u.roles[role]) &&
      (!term || u.displayName.toLowerCase().includes(term) || u.email.toLowerCase().includes(term)),
  );

  return (
    <AdminGate>
      <Page wide>
        <PageHeader title="Users" description="Clients and freelancers on CampusHold." />
        <div className="mb-4 flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-subtle" aria-hidden />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or email" aria-label="Search users" className="h-10 pl-10" />
          </div>
          <Select value={role} onChange={(e) => setRole(e.target.value as typeof role)} aria-label="Role" className="h-10 sm:w-48">
            <option value="all">All roles</option>
            <option value="client">Clients</option>
            <option value="freelancer">Freelancers</option>
          </Select>
        </div>
        <Table head={["User", "Roles", "Verified", "Joined", "Jobs", "Status", ""]}>
          {users.map((u) => (
            <tr key={u.id}>
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <Avatar user={u} size="sm" />
                  <div>
                    <p className="font-medium">{u.displayName}</p>
                    <p className="text-xs text-muted">{u.email}</p>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3 text-muted">{[u.roles.client && "Client", u.roles.freelancer && "Freelancer", u.isAdmin && "Admin"].filter(Boolean).join(", ")}</td>
              <td className="px-4 py-3 text-muted">{[u.verified.email && "Email", u.verified.phone && "Phone"].filter(Boolean).join(", ") || "—"}</td>
              <td className="px-4 py-3 text-muted">{formatDate(u.joinedAt, true)}</td>
              <td className="px-4 py-3 tabular-nums">{s.jobs.filter((j) => j.clientId === u.id || j.freelancerId === u.id).length}</td>
              <td className="px-4 py-3"><StatusPill tone={u.status === "active" ? "success" : "danger"}>{u.status === "active" ? "Active" : "Suspended"}</StatusPill></td>
              <td className="px-4 py-3 text-right">
                {u.id !== s.currentUserId && (
                  <Button size="sm" variant="ghost" onClick={() => setTarget(u)}>
                    {u.status === "active" ? "Suspend" : "Reactivate"}
                  </Button>
                )}
              </td>
            </tr>
          ))}
        </Table>
        <Dialog
          open={Boolean(target)}
          onClose={() => setTarget(null)}
          title={target?.status === "active" ? `Suspend ${target?.displayName}?` : `Reactivate ${target?.displayName}?`}
          description={target?.status === "active" ? "They won't be able to log in, send or accept jobs. Active jobs stay open for review." : "They'll regain full access."}
          footer={
            <>
              <Button variant="ghost" onClick={() => setTarget(null)}>Cancel</Button>
              <Button
                onClick={() => {
                  run(ops.setUserStatus(target!.id, target!.status === "active" ? "suspended" : "active"));
                  toast.success(target!.status === "active" ? "User suspended" : "User reactivated");
                  setTarget(null);
                }}
              >
                Confirm
              </Button>
            </>
          }
        >
          <p className="text-sm text-muted">This action is recorded in the audit log.</p>
        </Dialog>
      </Page>
    </AdminGate>
  );
}

/* ---------- Jobs ---------- */

export function AdminJobs() {
  const s = useAppState();
  const [status, setStatus] = useState<JobStatus | "all">("all");
  const jobs = s.jobs.filter((j) => status === "all" || j.status === status).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return (
    <AdminGate>
      <Page wide>
        <PageHeader title="Jobs" description="Every job on the platform and its payment state." />
        <Select value={status} onChange={(e) => setStatus(e.target.value as JobStatus | "all")} aria-label="Status" className="mb-4 h-10 sm:w-60">
          <option value="all">All statuses</option>
          {(Object.keys(jobStatusMeta) as JobStatus[]).map((st) => <option key={st} value={st}>{jobStatusMeta[st].label}</option>)}
        </Select>
        {jobs.length === 0 ? (
          <EmptyState icon={<Briefcase />} title="No jobs with this status" />
        ) : (
          <Table head={["Job", "Client", "Freelancer", "Amount", "Status", "Payment", "Updated"]}>
            {jobs.map((j) => (
              <tr key={j.id}>
                <td className="max-w-64 truncate px-4 py-3 font-medium">{j.title}</td>
                <td className="px-4 py-3 text-muted">{getUser(s, j.clientId)?.displayName}</td>
                <td className="px-4 py-3 text-muted">{getUser(s, j.freelancerId)?.displayName}</td>
                <td className="px-4 py-3 tabular-nums">{formatMoney(j.budget)}</td>
                <td className="px-4 py-3"><JobStatusPill status={j.status} /></td>
                <td className="px-4 py-3"><PaymentStatusPill status={j.paymentStatus} /></td>
                <td className="px-4 py-3 text-xs text-muted">{formatDate(j.updatedAt)}</td>
              </tr>
            ))}
          </Table>
        )}
      </Page>
    </AdminGate>
  );
}

/* ---------- Transactions ---------- */

export function AdminTransactions() {
  const s = useAppState();
  const [type, setType] = useState<"all" | "payment" | "payout" | "refund">("all");
  const txs = s.transactions.filter((t) => type === "all" || t.type === type).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const ok = (t: (typeof s.transactions)[number]["type"]) => s.transactions.filter((x) => x.type === t && x.status === "succeeded").reduce((n, x) => n + x.amount, 0);
  const collected = ok("payment");
  const paidOut = ok("payout");
  const refunded = ok("refund");
  const held = s.jobs.filter((j) => HELD_PAYMENT_STATES.includes(j.paymentStatus)).reduce((n, j) => n + j.budget, 0);
  const diff = collected - paidOut - refunded - held;

  return (
    <AdminGate>
      <Page wide>
        <PageHeader title="Transactions" description="Ledger entries across the platform." />
        <SimulatedNotice className="mb-6" />
        <Panel title="Reconciliation" className="mb-6">
          <div className="grid gap-4 text-sm sm:grid-cols-5">
            {[
              ["Payments collected", collected],
              ["Paid out", paidOut],
              ["Refunded", refunded],
              ["Held for active jobs", held],
            ].map(([k, v]) => (
              <div key={k as string}>
                <p className="text-muted">{k}</p>
                <p className="mt-1 text-lg font-medium tabular-nums">{formatMoney(v as number)}</p>
              </div>
            ))}
            <div>
              <p className="text-muted">Difference</p>
              <p className={`mt-1 text-lg font-medium tabular-nums ${diff === 0 ? "text-success" : "text-danger"}`}>{formatMoney(diff)}</p>
            </div>
          </div>
          <p className="mt-4 text-xs text-muted">
            Collected − paid out − refunded − held should be zero. In Stage 4 this is also checked against the provider&rsquo;s own records.
          </p>
        </Panel>
        <Select value={type} onChange={(e) => setType(e.target.value as typeof type)} aria-label="Type" className="mb-4 h-10 sm:w-48">
          <option value="all">All types</option>
          <option value="payment">Payments</option>
          <option value="payout">Payouts</option>
          <option value="refund">Refunds</option>
        </Select>
        <Table head={["Reference", "Type", "Job", "From / to", "Amount", "Status", "Created"]}>
          {txs.map((t) => {
            const job = s.jobs.find((j) => j.id === t.jobId);
            return (
              <tr key={t.id}>
                <td className="px-4 py-3 font-mono text-xs">{t.reference}</td>
                <td className="px-4 py-3 capitalize">{t.type}</td>
                <td className="max-w-56 truncate px-4 py-3 text-muted">{job?.title}</td>
                <td className="px-4 py-3 text-muted">
                  {t.type === "payment" ? `${getUser(s, t.userId)?.displayName} →` : `→ ${getUser(s, t.userId)?.displayName}`}
                </td>
                <td className="px-4 py-3 tabular-nums">{formatMoney(t.amount)}</td>
                <td className="px-4 py-3">
                  <StatusPill tone={t.status === "succeeded" ? "success" : t.status === "failed" ? "danger" : "warning"}>{t.status}</StatusPill>
                </td>
                <td className="px-4 py-3 text-xs text-muted">{formatDateTime(t.createdAt)}</td>
              </tr>
            );
          })}
        </Table>
      </Page>
    </AdminGate>
  );
}

/* ---------- Disputes ---------- */

export function AdminDisputes() {
  const s = useAppState();
  const sorted = [...s.disputes].sort((a, b) => Number(a.status === "resolved") - Number(b.status === "resolved"));
  return (
    <AdminGate>
      <Page className="max-w-5xl">
        <PageHeader title="Disputes" description="Review the job history, hear both sides and resolve." />
        {sorted.length === 0 ? (
          <EmptyState icon={<Scale />} title="No disputes" />
        ) : (
          <ul className="divide-y divide-line overflow-hidden rounded-card border border-line bg-canvas">
            {sorted.map((d) => <DisputeRow key={d.id} d={d} s={s} href={`/admin/disputes/${d.id}`} />)}
          </ul>
        )}
        <p className="mt-4 text-sm text-muted">
          Looking for a job? <Link href="/admin/jobs" className="font-medium text-ink underline-offset-4 hover:underline">Browse all jobs</Link>
        </p>
      </Page>
    </AdminGate>
  );
}
