"use client";

import {
  AlertTriangle,
  BadgeCheck,
  Ban,
  Banknote,
  CheckCircle2,
  CircleDollarSign,
  Clock,
  FilePlus2,
  FileUp,
  Flag,
  Handshake,
  Hourglass,
  Play,
  RotateCcw,
  Scale,
  Send,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import type { Job, JobEventType, ThreadItem, User } from "@/lib/domain/types";
import { cn } from "@/lib/cn";
import { formatDate, formatTime } from "@/lib/format";
import { AttachmentChip } from "./attachments";

const eventMeta: Record<JobEventType, { label: string; icon: LucideIcon; tone: string }> = {
  job_created: { label: "Job created", icon: FilePlus2, tone: "text-muted" },
  job_sent: { label: "Job request sent", icon: Send, tone: "text-muted" },
  job_accepted: { label: "Job accepted", icon: Handshake, tone: "text-info" },
  job_declined: { label: "Job declined", icon: XCircle, tone: "text-danger" },
  payment_initiated: { label: "Payment initiated", icon: Clock, tone: "text-warning" },
  payment_confirmed: { label: "Payment confirmed", icon: BadgeCheck, tone: "text-success" },
  payment_failed: { label: "Payment failed", icon: XCircle, tone: "text-danger" },
  funds_settled: { label: "Funds settled with provider", icon: CircleDollarSign, tone: "text-success" },
  work_started: { label: "Work started", icon: Play, tone: "text-info" },
  delivery_submitted: { label: "Delivery submitted", icon: FileUp, tone: "text-ink" },
  revision_requested: { label: "Revision requested", icon: RotateCcw, tone: "text-warning" },
  work_approved: { label: "Work approved", icon: CheckCircle2, tone: "text-success" },
  release_queued: { label: "Payment release queued", icon: Hourglass, tone: "text-muted" },
  release_requested: { label: "Payment release requested", icon: Banknote, tone: "text-ink" },
  transfer_failed: { label: "Transfer failed", icon: AlertTriangle, tone: "text-danger" },
  transfer_completed: { label: "Transfer completed", icon: Banknote, tone: "text-success" },
  job_completed: { label: "Job completed", icon: Flag, tone: "text-success" },
  dispute_opened: { label: "Dispute opened", icon: Scale, tone: "text-danger" },
  dispute_resolved: { label: "Dispute resolved", icon: Scale, tone: "text-ink" },
  job_cancelled: { label: "Job cancelled", icon: Ban, tone: "text-muted" },
};

export function Thread({ job, users, viewerId }: { job: Job; users: User[]; viewerId: string }) {
  const byId = (id?: string) => users.find((u) => u.id === id);
  const dayOf = (i: number) => formatDate(job.thread[i].createdAt, true);

  return (
    <ol className="flex flex-col gap-4" aria-label="Job conversation and events">
      {job.thread.map((item, i) => {
        const day = dayOf(i);
        const showDay = i === 0 || dayOf(i - 1) !== day;
        return (
          <li key={item.id} className="flex flex-col gap-4">
            {showDay && (
              <p className="text-center text-xs font-medium text-subtle" aria-label={`Messages from ${day}`}>
                {day}
              </p>
            )}
            {item.kind === "event" ? (
              <EventItem item={item} actor={byId(item.actorId)} viewerId={viewerId} />
            ) : (
              <MessageItem item={item} author={byId(item.authorId)} mine={item.authorId === viewerId} />
            )}
          </li>
        );
      })}
    </ol>
  );
}

function EventItem({
  item,
  actor,
  viewerId,
}: {
  item: Extract<ThreadItem, { kind: "event" }>;
  actor?: User;
  viewerId: string;
}) {
  const m = eventMeta[item.event];
  const Icon = m.icon;
  const who = actor ? (actor.id === viewerId ? "You" : actor.firstName) : null;
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="flex w-full items-center gap-3">
        <span className="h-px flex-1 bg-line" />
        <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 text-xs">
          <Icon className={cn("size-3.5", m.tone)} aria-hidden />
          <span className="font-medium text-ink">{m.label}</span>
          {who && <span className="text-muted">· {who}</span>}
          <span className="text-subtle">{formatTime(item.createdAt)}</span>
        </span>
        <span className="h-px flex-1 bg-line" />
      </div>
      {item.note && <p className="max-w-md rounded-xl bg-surface px-3.5 py-2 text-center text-sm text-ink-soft">{item.note}</p>}
    </div>
  );
}

function MessageItem({
  item,
  author,
  mine,
}: {
  item: Extract<ThreadItem, { kind: "message" }>;
  author?: User;
  mine: boolean;
}) {
  return (
    <div className={cn("flex gap-2.5", mine && "flex-row-reverse")}>
      {author && !mine && <Avatar user={author} size="sm" className="mt-5" />}
      <div className={cn("flex max-w-[85%] flex-col gap-1 sm:max-w-[75%]", mine && "items-end")}>
        <p className="text-xs text-subtle">
          <span className="font-medium text-muted">{mine ? "You" : author?.displayName}</span> · {formatTime(item.createdAt)}
        </p>
        {item.body && (
          <p
            className={cn(
              "rounded-2xl px-4 py-2.5 text-[0.9375rem] leading-relaxed whitespace-pre-wrap",
              mine ? "rounded-tr-md bg-ink text-white" : "rounded-tl-md bg-surface text-ink",
            )}
          >
            {item.body}
          </p>
        )}
        {item.attachments.length > 0 && (
          <div className={cn("flex flex-wrap gap-1.5", mine && "justify-end")}>
            {item.attachments.map((f) => (
              <AttachmentChip key={f.id} file={f} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
