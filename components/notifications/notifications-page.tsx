"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  Banknote,
  Bell,
  BadgeCheck,
  CheckCheck,
  CheckCircle2,
  FileUp,
  Handshake,
  Inbox,
  MessageSquare,
  RotateCcw,
  Scale,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/feedback";
import { Tabs } from "@/components/ui/tabs";
import { Page, PageHeader } from "@/components/app/page-header";
import type { NotificationType } from "@/lib/domain/types";
import { cn } from "@/lib/cn";
import { timeAgo } from "@/lib/format";
import { ops, run, useAppState } from "@/lib/store";

const icons: Record<NotificationType, LucideIcon> = {
  job_request: Inbox,
  job_accepted: Handshake,
  payment_confirmed: BadgeCheck,
  new_message: MessageSquare,
  delivery_submitted: FileUp,
  revision_requested: RotateCcw,
  work_approved: CheckCircle2,
  payout_initiated: Banknote,
  dispute_update: Scale,
};

export function NotificationsPage() {
  const s = useAppState();
  const router = useRouter();
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [now] = useState(() => Date.now());
  const mine = s.notifications.filter((n) => n.userId === s.currentUserId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const unread = mine.filter((n) => !n.read).length;
  const shown = filter === "unread" ? mine.filter((n) => !n.read) : mine;
  const dayAgo = now - 86_400_000;
  const groups = [
    { title: "Today", items: shown.filter((n) => Date.parse(n.createdAt) >= dayAgo) },
    { title: "Earlier", items: shown.filter((n) => Date.parse(n.createdAt) < dayAgo) },
  ].filter((g) => g.items.length);

  return (
    <Page className="max-w-3xl">
      <PageHeader
        title="Notifications"
        actions={
          <Button variant="secondary" size="sm" disabled={!unread} onClick={() => run(ops.markNotificationsRead(s.currentUserId))}>
            <CheckCheck />
            Mark all as read
          </Button>
        }
      />
      <Tabs
        label="Filter notifications"
        value={filter}
        onChange={setFilter}
        items={[
          { value: "all", label: "All", count: mine.length },
          { value: "unread", label: "Unread", count: unread },
        ]}
        className="mb-6"
      />
      {groups.length === 0 ? (
        <EmptyState icon={<Bell />} title={filter === "unread" ? "You're all caught up" : "No notifications yet"} />
      ) : (
        <div className="flex flex-col gap-6">
          {groups.map((g) => (
            <section key={g.title}>
              <h2 className="mb-2 text-sm font-medium text-muted">{g.title}</h2>
              <ul className="divide-y divide-line overflow-hidden rounded-card border border-line bg-canvas">
                {g.items.map((n) => {
                  const Icon = icons[n.type];
                  return (
                    <li key={n.id}>
                      <button
                        onClick={() => {
                          run(ops.markNotificationsRead(s.currentUserId, [n.id]));
                          router.push(n.href);
                        }}
                        className={cn("flex w-full gap-4 px-5 py-4 text-left hover:bg-surface/60", !n.read && "bg-accent/10")}
                      >
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-surface">
                          <Icon className="size-4" aria-hidden />
                        </span>
                        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                          <span className="flex items-center gap-2 text-sm font-medium">
                            {n.title}
                            {!n.read && <span className="size-1.5 rounded-full bg-ink" aria-label="Unread" />}
                          </span>
                          <span className="text-sm text-muted">{n.body}</span>
                        </span>
                        <span className="shrink-0 text-xs text-subtle">{timeAgo(n.createdAt)}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </Page>
  );
}
