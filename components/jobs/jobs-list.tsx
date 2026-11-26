"use client";

import { Briefcase, Plus, Search } from "lucide-react";
import { useState } from "react";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/feedback";
import { Input } from "@/components/ui/form";
import { Tabs } from "@/components/ui/tabs";
import { Page, PageHeader } from "@/components/app/page-header";
import { ACTIVE_STATUSES } from "@/lib/domain/job-machine";
import type { Job } from "@/lib/domain/types";
import { currentUser, jobsFor, otherParty, useAppState } from "@/lib/store";
import { JobRow } from "./job-bits";

type Filter = "active" | "requests" | "drafts" | "closed" | "all";

const filters: Record<Filter, (j: Job) => boolean> = {
  active: (j) => ACTIVE_STATUSES.includes(j.status),
  requests: (j) => j.status === "pending_response",
  drafts: (j) => j.status === "draft",
  closed: (j) => j.status === "completed" || j.status === "cancelled",
  all: () => true,
};

export function JobsList() {
  const s = useAppState();
  const me = currentUser(s);
  const isClient = s.mode === "client" || !me.roles.freelancer;
  const mode = isClient ? "client" : "freelancer";
  const [filter, setFilter] = useState<Filter>("active");
  const [q, setQ] = useState("");
  const jobs = jobsFor(s, me.id, mode);
  const term = q.trim().toLowerCase();
  const shown = jobs.filter(filters[filter]).filter((j) => !term || j.title.toLowerCase().includes(term) || otherParty(s, j, me.id)?.displayName.toLowerCase().includes(term));
  const count = (f: Filter) => jobs.filter(filters[f]).length;

  const tabs: { value: Filter; label: string; count: number }[] = [
    { value: "active", label: "Active", count: count("active") },
    { value: "requests", label: isClient ? "Awaiting response" : "Requests", count: count("requests") },
    ...(isClient ? [{ value: "drafts" as const, label: "Drafts", count: count("drafts") }] : []),
    { value: "closed", label: "Closed", count: count("closed") },
    { value: "all", label: "All", count: jobs.length },
  ];

  return (
    <Page>
      <PageHeader
        title={isClient ? "My jobs" : "Jobs & requests"}
        description={isClient ? "Jobs you've sent to freelancers." : "Work clients have sent you."}
        actions={isClient && <ButtonLink href="/jobs/new"><Plus />Post a job</ButtonLink>}
      />
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <Tabs label="Filter jobs" value={filter} onChange={setFilter} items={tabs} />
        <div className="relative md:w-72">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-subtle" aria-hidden />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search jobs" aria-label="Search jobs" className="h-10 rounded-full pl-10" />
        </div>
      </div>
      {shown.length === 0 ? (
        <EmptyState
          icon={<Briefcase />}
          title={term ? "No jobs match your search" : "Nothing here yet"}
          description={
            term
              ? "Try a different search."
              : isClient
                ? "Browse services and send a request to get started."
                : "New requests from clients will show up here."
          }
          action={!term && isClient && <ButtonLink href="/explore" size="sm">Explore services</ButtonLink>}
        />
      ) : (
        <div className="divide-y divide-line overflow-hidden rounded-card border border-line bg-canvas">
          {shown.map((j) => (
            <JobRow key={j.id} job={j} other={otherParty(s, j, me.id)} viewerId={me.id} roleLabel={isClient ? "With" : "For"} />
          ))}
        </div>
      )}
    </Page>
  );
}
