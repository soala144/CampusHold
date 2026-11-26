"use client";

import Link from "next/link";
import { CalendarDays, ChevronRight } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { StatusPill } from "@/components/ui/primitives";
import { jobStatusMeta } from "@/lib/domain/job-machine";
import { paymentStatusMeta } from "@/lib/domain/payment";
import type { Job, JobStatus, PaymentStatus, User } from "@/lib/domain/types";
import { cn } from "@/lib/cn";
import { daysUntil, formatDate, formatMoney } from "@/lib/format";
import { unreadCount } from "@/lib/store";

export function JobStatusPill({ status, className }: { status: JobStatus; className?: string }) {
  const m = jobStatusMeta[status];
  return (
    <StatusPill tone={m.tone} className={className}>
      {m.label}
    </StatusPill>
  );
}

export function PaymentStatusPill({ status, className }: { status: PaymentStatus; className?: string }) {
  const m = paymentStatusMeta[status];
  return (
    <StatusPill tone={m.tone} className={className}>
      {m.label}
    </StatusPill>
  );
}

export function DeadlineText({ job, className }: { job: Job; className?: string }) {
  const days = daysUntil(job.deadline);
  const closed = job.status === "completed" || job.status === "cancelled";
  const overdue = !closed && days < 0;
  return (
    <span className={cn("inline-flex items-center gap-1.5", overdue ? "text-danger" : "text-muted", className)}>
      <CalendarDays className="size-3.5" aria-hidden />
      {formatDate(job.deadline)}
      {!closed && (
        <span className="text-subtle">
          · {overdue ? `${-days}d overdue` : days === 0 ? "today" : `${days}d left`}
        </span>
      )}
    </span>
  );
}

/** Row used in job lists across dashboards and the jobs page. */
export function JobRow({ job, other, viewerId, roleLabel }: { job: Job; other?: User; viewerId: string; roleLabel?: string }) {
  const unread = unreadCount(job, viewerId);
  return (
    <Link
      href={`/jobs/${job.id}`}
      className="group flex flex-col gap-3 px-5 py-4 transition-colors hover:bg-surface/60 sm:flex-row sm:items-center sm:gap-5"
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        {other && <Avatar user={other} size="sm" />}
        <div className="min-w-0">
          <p className="flex items-center gap-2 truncate font-medium tracking-tight">
            <span className="truncate">{job.title}</span>
            {unread > 0 && (
              <span className="shrink-0 rounded-full bg-ink px-1.5 py-0.5 text-[0.6875rem] text-white" aria-label={`${unread} unread`}>
                {unread}
              </span>
            )}
          </p>
          <p className="truncate text-sm text-muted">
            {roleLabel ? `${roleLabel} ` : ""}
            {other?.displayName}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm sm:justify-end">
        <DeadlineText job={job} />
        <span className="font-medium tabular-nums">{formatMoney(job.budget)}</span>
        <JobStatusPill status={job.status} />
        <ChevronRight className="hidden size-4 text-subtle group-hover:text-ink sm:block" aria-hidden />
      </div>
    </Link>
  );
}
