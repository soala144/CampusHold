"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Check, FileSearch, Lock, MessagesSquare, Package } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { ButtonLink } from "@/components/ui/button";
import { Alert, EmptyState, SimulatedBadge } from "@/components/ui/feedback";
import { Tabs } from "@/components/ui/tabs";
import { Page, PageHeader, Panel } from "@/components/app/page-header";
import { jobLifecycle, jobStatusMeta, lifecycleIndex } from "@/lib/domain/job-machine";
import { nextActionFor } from "@/lib/domain/next-action";
import { paymentStatusMeta } from "@/lib/domain/payment";
import { categoryLabel } from "@/lib/domain/categories";
import type { Job, User } from "@/lib/domain/types";
import { cn } from "@/lib/cn";
import { formatDateTime, formatMoney } from "@/lib/format";
import { currentUser, ops, otherParty, roleIn, run, useAppState } from "@/lib/store";
import { AttachmentChip } from "./attachments";
import { Composer } from "./composer";
import { DeadlineText, JobStatusPill, PaymentStatusPill } from "./job-bits";
import { JobActions } from "./job-actions";
import { SimulationPanel } from "./simulation-panel";
import { Thread } from "./thread";

type View = "conversation" | "deliveries" | "brief";

export function JobWorkspace() {
  const { id } = useParams<{ id: string }>();
  const s = useAppState();
  const me = currentUser(s);
  const job = s.jobs.find((j) => j.id === id);
  const role = job ? roleIn(job, me.id) : null;
  const [view, setView] = useState<View>("conversation");
  const endRef = useRef<HTMLDivElement>(null);
  const threadLength = job?.thread.length ?? 0;

  // Mark as read and keep the newest item in view.
  useEffect(() => {
    if (!job || !role) return;
    run(ops.markJobRead(job.id, me.id));
    endRef.current?.scrollIntoView({ block: "end" });
  }, [job, role, me.id, threadLength]);

  if (!job) {
    return (
      <Page>
        <EmptyState
          icon={<FileSearch />}
          title="Job not found"
          description="It may have been removed, or the link is wrong."
          action={<ButtonLink href="/jobs" size="sm">Back to jobs</ButtonLink>}
        />
      </Page>
    );
  }

  if (!role) {
    return (
      <Page>
        <EmptyState
          icon={<Lock />}
          title="You don't have access to this job"
          description="Only the client and freelancer on a job can open its workspace."
          action={<ButtonLink href="/jobs" size="sm">Back to jobs</ButtonLink>}
        />
      </Page>
    );
  }

  const other = otherParty(s, job, me.id)!;
  const next = nextActionFor(job, role);
  const closed = job.status === "completed" || job.status === "cancelled";

  return (
    <Page wide>
      <PageHeader
        back={{ href: "/jobs", label: "All jobs" }}
        eyebrow={
          <div className="flex flex-wrap items-center gap-2">
            <JobStatusPill status={job.status} />
            <span className="text-sm text-muted">
              {categoryLabel(job.category)} · {role === "client" ? "You're hiring" : "You're working"}
            </span>
          </div>
        }
        title={job.title}
      />

      <div
        className={cn(
          "mb-6 flex flex-col gap-4 rounded-card border p-4 sm:flex-row sm:items-center sm:justify-between",
          next.owner === "you" ? "border-ink/15 bg-canvas shadow-card" : "border-line bg-surface",
        )}
      >
        <div className="flex items-center gap-3">
          <span
            aria-hidden
            className={cn(
              "size-2.5 shrink-0 rounded-full",
              next.owner === "you" ? "bg-accent-strong" : job.status === "disputed" ? "bg-danger" : "bg-subtle",
            )}
          />
          <div>
            <p className="font-medium tracking-tight">{next.message}</p>
            {jobStatusMeta[job.status].hint !== next.message && (
              <p className="text-sm text-muted">{jobStatusMeta[job.status].hint}</p>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:items-end">
          <JobActions job={job} role={role} userId={me.id} />
          {job.status === "disputed" && job.disputeId && (
            <ButtonLink href={`/disputes/${job.disputeId}`} size="sm" variant="secondary">
              View dispute
            </ButtonLink>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="flex min-w-0 flex-col gap-4">
          <Tabs
            label="Workspace sections"
            value={view}
            onChange={setView}
            items={[
              { value: "conversation", label: "Conversation" },
              { value: "deliveries", label: "Deliveries", count: job.submissions.length },
              { value: "brief", label: "Brief" },
            ]}
          />

          {view === "conversation" && (
            <section className="flex flex-col overflow-hidden rounded-card border border-line bg-canvas" aria-label="Conversation">
              <div className="flex items-center gap-3 border-b border-line px-5 py-3">
                <Avatar user={other} size="sm" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{other.displayName}</p>
                  <p className="truncate text-xs text-muted">{role === "client" ? other.freelancer?.title : other.client?.organisationName ?? "Client"}</p>
                </div>
              </div>
              <div className="max-h-[60vh] min-h-80 overflow-y-auto px-4 py-5 sm:px-6" tabIndex={0} aria-label="Messages">
                <Thread job={job} users={s.users} viewerId={me.id} />
                <div ref={endRef} />
              </div>
              {closed ? (
                <p className="flex items-center justify-center gap-2 border-t border-line bg-surface px-4 py-4 text-sm text-muted">
                  <Lock className="size-3.5" aria-hidden />
                  This job is closed. The conversation is kept for your records.
                </p>
              ) : (
                <Composer jobId={job.id} authorId={me.id} />
              )}
            </section>
          )}

          {view === "deliveries" && <Deliveries job={job} freelancer={s.users.find((u) => u.id === job.freelancerId)!} />}
          {view === "brief" && <Brief job={job} />}
        </div>

        <aside className="flex flex-col gap-4">
          <Panel title="Agreement">
            <dl className="flex flex-col gap-3 text-sm">
              {job.serviceId && (
                <Row label="From service">
                  <Link href={`/services/${job.serviceId}`} className="font-medium hover:underline">
                    {job.packageName ?? "View"}
                  </Link>
                </Row>
              )}
              <Row label="Agreed price">
                <span className="font-medium tabular-nums">{formatMoney(job.budget)}</span>
              </Row>
              <Row label="Deadline">
                <DeadlineText job={job} />
              </Row>
              <Row label="Revisions">
                {job.revisionsUsed} of {job.revisionsAllowed} used
              </Row>
              <Row label={role === "client" ? "Freelancer" : "Client"}>
                <Link href={role === "client" ? `/freelancers/${other.username}` : "#"} className="font-medium hover:underline">
                  {other.displayName}
                </Link>
              </Row>
            </dl>
            <p className="mt-4 mb-2 text-xs font-medium text-muted">Deliverables</p>
            <ul className="flex flex-col gap-1.5 text-sm">
              {job.deliverables.map((d) => (
                <li key={d.id} className="flex items-start gap-2">
                  <Check className={cn("mt-0.5 size-4 shrink-0", job.status === "completed" ? "text-success" : "text-subtle")} aria-hidden />
                  {d.title}
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title="Payment" action={<SimulatedBadge />}>
            <PaymentStatusPill status={job.paymentStatus} />
            <p className="mt-3 text-sm text-muted">{paymentStatusMeta[job.paymentStatus].hint}</p>
            {job.status === "disputed" && (
              <Alert tone="danger" className="mt-3">
                Release is paused while the dispute is open.
              </Alert>
            )}
          </Panel>

          <Panel title="Progress">
            <Progress job={job} />
          </Panel>

          <SimulationPanel job={job} />
        </aside>
      </div>
    </Page>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-muted">{label}</dt>
      <dd className="text-right">{children}</dd>
    </div>
  );
}

function Progress({ job }: { job: Job }) {
  const idx = lifecycleIndex(job.status);
  const side = job.status === "disputed" || job.status === "cancelled" || job.status === "revision_requested";
  return (
    <ol className="flex flex-col gap-0">
      {jobLifecycle.map((st, i) => {
        const done = idx > i || job.status === "completed";
        const current = idx === i && job.status !== "completed";
        return (
          <li key={st} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span
                className={cn(
                  "flex size-5 items-center justify-center rounded-full border text-[0.625rem]",
                  done ? "border-ink bg-ink text-white" : current ? "border-ink bg-accent" : "border-line-strong bg-canvas",
                )}
              >
                {done && <Check className="size-3" aria-hidden />}
              </span>
              {i < jobLifecycle.length - 1 && <span className={cn("w-px flex-1", done ? "bg-ink" : "bg-line")} style={{ minHeight: 14 }} />}
            </div>
            <span className={cn("pb-3 text-sm", current ? "font-medium" : done ? "text-ink-soft" : "text-subtle")}>
              {jobStatusMeta[st].label}
              {current && side && <span className="ml-1.5 text-xs text-muted">({jobStatusMeta[job.status].label})</span>}
            </span>
          </li>
        );
      })}
      {(job.status === "disputed" || job.status === "cancelled") && (
        <li className="mt-1 rounded-xl bg-surface px-3 py-2 text-sm text-muted">Currently: {jobStatusMeta[job.status].label}</li>
      )}
    </ol>
  );
}

function Deliveries({ job, freelancer }: { job: Job; freelancer: User }) {
  if (job.submissions.length === 0) {
    return (
      <EmptyState
        icon={<Package />}
        title="No deliveries yet"
        description="When the freelancer submits work, it appears here with their notes and files."
      />
    );
  }
  return (
    <div className="flex flex-col gap-3">
      {[...job.submissions].reverse().map((sub, i) => (
        <article key={sub.id} className="rounded-card border border-line bg-canvas p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Avatar user={freelancer} size="xs" />
              <p className="text-sm font-medium">
                Delivery {job.submissions.length - i}
                {i === 0 && <span className="ml-2 rounded-full bg-accent px-2 py-0.5 text-xs text-accent-ink">Latest</span>}
              </p>
            </div>
            <p className="text-xs text-muted">{formatDateTime(sub.createdAt)}</p>
          </div>
          <p className="text-ink-soft">{sub.note}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {sub.files.map((f) => (
              <AttachmentChip key={f.id} file={f} />
            ))}
          </div>
        </article>
      ))}
    </div>
  );
}

function Brief({ job }: { job: Job }) {
  return (
    <Panel title="Job brief">
      <div className="flex flex-col gap-5">
        <p className="leading-relaxed whitespace-pre-line text-ink-soft">{job.description}</p>
        {job.skills.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-medium text-muted">Skills</p>
            <div className="flex flex-wrap gap-1.5">
              {job.skills.map((sk) => (
                <span key={sk} className="rounded-lg bg-surface px-2.5 py-1 text-sm">
                  {sk}
                </span>
              ))}
            </div>
          </div>
        )}
        {job.attachments.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-medium text-muted">Attachments</p>
            <div className="flex flex-wrap gap-2">
              {job.attachments.map((f) => (
                <AttachmentChip key={f.id} file={f} />
              ))}
            </div>
          </div>
        )}
        <p className="flex items-center gap-2 text-xs text-muted">
          <MessagesSquare className="size-3.5" aria-hidden />
          Created {formatDateTime(job.createdAt)}
        </p>
      </div>
    </Panel>
  );
}
