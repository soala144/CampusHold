"use client";

import Link from "next/link";
import { MessagesSquare } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/feedback";
import { Page, PageHeader } from "@/components/app/page-header";
import { cn } from "@/lib/cn";
import { timeAgo } from "@/lib/format";
import { currentUser, otherParty, roleIn, unreadCount, useAppState } from "@/lib/store";
import { JobStatusPill } from "./job-bits";

/**
 * Every job has its own workspace. This page lists those workspaces by latest
 * activity — it's a way in, not a separate inbox.
 */
export function MessagesList() {
  const s = useAppState();
  const me = currentUser(s);
  const jobs = s.jobs
    .filter((j) => roleIn(j, me.id) && j.status !== "draft")
    .sort((a, b) => (b.thread.at(-1)?.createdAt ?? "").localeCompare(a.thread.at(-1)?.createdAt ?? ""));

  return (
    <Page className="max-w-4xl">
      <PageHeader title="Messages" description="Conversations live inside each job's workspace, next to the agreement, payment and deliveries." />
      {jobs.length === 0 ? (
        <EmptyState icon={<MessagesSquare />} title="No conversations yet" description="Messages start once a job request is sent." />
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-card border border-line bg-canvas">
          {jobs.map((j) => {
            const other = otherParty(s, j, me.id)!;
            const last = [...j.thread].reverse().find((t) => t.kind === "message");
            const lastAny = j.thread.at(-1);
            const unread = unreadCount(j, me.id);
            const preview =
              last && last.kind === "message"
                ? `${last.authorId === me.id ? "You: " : ""}${last.body || "Sent an attachment"}`
                : "No messages yet";
            return (
              <li key={j.id}>
                <Link href={`/jobs/${j.id}`} className="flex gap-3 px-5 py-4 hover:bg-surface/60">
                  <Avatar user={other} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className={cn("truncate", unread ? "font-semibold" : "font-medium")}>{other.displayName}</p>
                      <span className="shrink-0 text-xs text-subtle">{lastAny && timeAgo(lastAny.createdAt)}</span>
                    </div>
                    <p className="truncate text-sm text-muted">
                      {j.title} · {roleIn(j, me.id) === "client" ? "Hiring" : "Working"}
                    </p>
                    <div className="mt-1.5 flex items-center justify-between gap-3">
                      <p className={cn("truncate text-sm", unread ? "text-ink" : "text-subtle")}>{preview}</p>
                      <div className="flex shrink-0 items-center gap-2">
                        <JobStatusPill status={j.status} />
                        {unread > 0 && (
                          <span className="rounded-full bg-ink px-1.5 py-0.5 text-[0.6875rem] text-white">{unread}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Page>
  );
}
