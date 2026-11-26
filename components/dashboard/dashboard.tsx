"use client";

import Link from "next/link";
import { ArrowRight, Bell, Store, Briefcase, CircleDollarSign, Clock, Inbox, Landmark, Plus, Search, Send } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { Alert, EmptyState, SimulatedBadge } from "@/components/ui/feedback";
import { Avatar } from "@/components/ui/avatar";
import { JobRow, JobStatusPill } from "@/components/jobs/job-bits";
import { Page, PageHeader, Panel, StatTile } from "@/components/app/page-header";
import { ACTIVE_STATUSES } from "@/lib/domain/job-machine";
import { nextActionFor } from "@/lib/domain/next-action";
import { deriveBalances } from "@/lib/domain/payment";
import { formatMoney, timeAgo } from "@/lib/format";
import { currentUser, jobsFor, otherParty, serviceStats, startingPrice, useAppState } from "@/lib/store";

function greeting() {
  const h = Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hourCycle: "h23", timeZone: "Africa/Lagos" }).format(new Date()));
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

export function Dashboard() {
  const s = useAppState();
  const me = currentUser(s);
  const mode = me.roles.client && me.roles.freelancer ? s.mode : me.roles.freelancer ? "freelancer" : "client";
  const isClient = mode === "client";
  const jobs = jobsFor(s, me.id, mode);
  const active = jobs.filter((j) => ACTIVE_STATUSES.includes(j.status));
  const attention = jobs
    .map((j) => ({ job: j, action: nextActionFor(j, mode) }))
    .filter((x) => x.action.owner === "you");
  const balances = deriveBalances(me.id, mode, s.jobs, s.transactions);
  const payout = s.payoutAccounts.find((a) => a.userId === me.id);
  const notes = s.notifications.filter((n) => n.userId === me.id).slice(0, 5);

  return (
    <Page>
      <PageHeader
        eyebrow={<span className="text-sm text-muted">{isClient ? "Hiring" : "Working"} dashboard</span>}
        title={`${greeting()}, ${me.firstName}`}
        description={
          attention.length
            ? `${attention.length} ${attention.length === 1 ? "job needs" : "jobs need"} your attention.`
            : "You're all caught up."
        }
        actions={
          isClient ? (
            <>
              <ButtonLink href="/explore" variant="secondary">
                <Search />
                Explore services
              </ButtonLink>
              <ButtonLink href="/jobs/new">
                <Plus />
                Post a job
              </ButtonLink>
            </>
          ) : (
            <ButtonLink href={`/freelancers/${me.username}`} variant="secondary">
              View my profile
            </ButtonLink>
          )
        }
      />

      {!isClient && !payout && (
        <Alert
          tone="warning"
          title="Add a payout account"
          className="mb-6"
          action={<ButtonLink href="/wallet/payouts" size="sm">Set up</ButtonLink>}
        >
          You&rsquo;ll need a bank account on file before any payout can be sent to you.
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Active jobs" value={active.length} icon={<Briefcase />} />
        {isClient ? (
          <>
            <StatTile label="Awaiting response" value={jobs.filter((j) => j.status === "pending_response").length} icon={<Send />} />
            <StatTile
              label="Committed to active jobs"
              value={formatMoney(balances.pendingSettlement + balances.held)}
              hint={<SimulatedBadge />}
              icon={<CircleDollarSign />}
            />
            <StatTile label="Paid for completed work" value={formatMoney(balances.settled)} hint={<SimulatedBadge />} icon={<Landmark />} />
          </>
        ) : (
          <>
            <StatTile label="New requests" value={jobs.filter((j) => j.status === "pending_response").length} icon={<Inbox />} />
            <StatTile
              label="Funded, not yet released"
              value={formatMoney(balances.pendingSettlement + balances.held)}
              hint={<SimulatedBadge />}
              icon={<Clock />}
            />
            <StatTile label="Paid out to you" value={formatMoney(balances.settled)} hint={<SimulatedBadge />} icon={<Landmark />} />
          </>
        )}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="flex flex-col gap-6">
          <Panel title="Needs your attention" bodyClassName="p-0">
            {attention.length === 0 ? (
              <div className="p-5">
                <EmptyState title="Nothing to do right now" description="We'll let you know when a job needs you." />
              </div>
            ) : (
              <ul className="divide-y divide-line">
                {attention.map(({ job, action }) => {
                  const other = otherParty(s, job, me.id);
                  return (
                    <li key={job.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center">
                      <div className="flex min-w-0 flex-1 items-center gap-3">
                        {other && <Avatar user={other} size="sm" />}
                        <div className="min-w-0">
                          <p className="truncate font-medium tracking-tight">{job.title}</p>
                          <p className="truncate text-sm text-muted">{action.message}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <JobStatusPill status={job.status} />
                        <ButtonLink href={action.href!} size="sm">
                          {action.cta}
                        </ButtonLink>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>

          <Panel
            title={isClient ? "Your jobs" : "Your work"}
            action={
              <Link href="/jobs" className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
                View all <ArrowRight className="size-3.5" />
              </Link>
            }
            bodyClassName="p-0"
          >
            {jobs.length === 0 ? (
              <div className="p-5">
                <EmptyState
                  icon={<Briefcase />}
                  title={isClient ? "No jobs yet" : "No jobs yet"}
                  description={isClient ? "Browse services and send your first request." : "Complete your profile so clients can find you."}
                  action={isClient ? <ButtonLink href="/explore" size="sm">Explore services</ButtonLink> : <ButtonLink href="/settings" size="sm">Edit profile</ButtonLink>}
                />
              </div>
            ) : (
              <div className="divide-y divide-line">
                {jobs.slice(0, 5).map((j) => (
                  <JobRow key={j.id} job={j} other={otherParty(s, j, me.id)} viewerId={me.id} roleLabel={isClient ? "With" : "For"} />
                ))}
              </div>
            )}
          </Panel>
        </div>

        <div className="flex flex-col gap-6 self-start">
          {!isClient && <ServicesPanel />}
          <Panel
            title="Recent activity"
            action={
              <Link href="/notifications" className="text-sm text-muted hover:text-ink">
                All
              </Link>
            }
            bodyClassName="p-0"
          >
            {notes.length === 0 ? (
              <div className="p-5">
                <EmptyState icon={<Bell />} title="No activity yet" />
              </div>
            ) : (
              <ul className="divide-y divide-line">
                {notes.map((n) => (
                  <li key={n.id}>
                    <Link href={n.href} className="flex gap-3 px-5 py-3.5 hover:bg-surface/60">
                      <span
                        aria-hidden
                        className={`mt-1.5 size-1.5 shrink-0 rounded-full ${n.read ? "bg-transparent" : "bg-ink"}`}
                      />
                      <span className="flex min-w-0 flex-col gap-0.5">
                        <span className="text-sm font-medium">{n.title}</span>
                        <span className="line-clamp-2 text-xs text-muted">{n.body}</span>
                        <span className="text-xs text-subtle">{timeAgo(n.createdAt)}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </Page>
  );
}

function ServicesPanel() {
  const s = useAppState();
  const me = currentUser(s);
  const mine = s.services.filter((x) => x.freelancerId === me.id);
  return (
    <Panel
      title="Your services"
      action={
        <Link href="/my-services" className="text-sm text-muted hover:text-ink">
          Manage
        </Link>
      }
      bodyClassName="p-0"
    >
      {mine.length === 0 ? (
        <div className="p-5">
          <EmptyState
            icon={<Store />}
            title="No services yet"
            description="List a fixed-price service so clients can request you directly."
            action={<ButtonLink href="/my-services/new" size="sm">Create a service</ButtonLink>}
          />
        </div>
      ) : (
        <ul className="divide-y divide-line">
          {mine.map((svc) => {
            const st = serviceStats(s, svc.id);
            return (
              <li key={svc.id}>
                <Link href={`/my-services/${svc.id}/edit`} className="flex flex-col gap-0.5 px-5 py-3.5 hover:bg-surface/60">
                  <span className="truncate text-sm font-medium">{svc.title}</span>
                  <span className="text-xs text-muted">
                    {svc.status === "active" ? "Live" : svc.status === "paused" ? "Paused" : "Draft"} · from {formatMoney(startingPrice(svc))} · {st.requests} {st.requests === 1 ? "request" : "requests"}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}
