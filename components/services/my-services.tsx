"use client";

import Link from "next/link";
import { useState } from "react";
import { Eye, Pause, Pencil, Play, Plus, Store, Trash2 } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Alert, EmptyState } from "@/components/ui/feedback";
import { StatusPill, type Tone } from "@/components/ui/primitives";
import { Tabs } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/toast";
import { Page, PageHeader } from "@/components/app/page-header";
import type { Service, ServiceStatus } from "@/lib/domain/types";
import { categoryLabel } from "@/lib/domain/categories";
import { formatDate, formatMoney } from "@/lib/format";
import { currentUser, ops, run, serviceStats, startingPrice, useAppState } from "@/lib/store";
import { ServiceCover } from "./service-card";

const statusMeta: Record<ServiceStatus, { label: string; tone: Tone }> = {
  active: { label: "Live", tone: "success" },
  paused: { label: "Paused", tone: "warning" },
  draft: { label: "Draft", tone: "neutral" },
};

export function MyServices() {
  const s = useAppState();
  const me = currentUser(s);
  const toast = useToast();
  const [filter, setFilter] = useState<"all" | ServiceStatus>("all");
  const [deleting, setDeleting] = useState<Service | null>(null);
  const mine = s.services.filter((x) => x.freelancerId === me.id).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const shown = filter === "all" ? mine : mine.filter((x) => x.status === filter);
  const count = (st: ServiceStatus) => mine.filter((x) => x.status === st).length;

  if (!me.roles.freelancer) {
    return (
      <Page className="max-w-3xl">
        <PageHeader title="My services" />
        <Alert tone="info" title="Services are for freelancers" action={<ButtonLink href="/settings" size="sm">Open settings</ButtonLink>}>
          Turn on &ldquo;Offer services&rdquo; to list what you do.
        </Alert>
      </Page>
    );
  }

  function setStatus(svc: Service, status: ServiceStatus) {
    const r = run(ops.setServiceStatus(svc.id, me.id, status));
    if (r.ok) toast.success(status === "active" ? "Service is live" : "Service paused");
    else toast.error(r.error);
  }

  return (
    <Page>
      <PageHeader
        title="My services"
        description="Fixed-price services clients can request directly. Each request becomes a job with the scope already agreed."
        actions={<ButtonLink href="/my-services/new"><Plus />New service</ButtonLink>}
      />
      {mine.length > 0 && (
        <Tabs
          label="Filter services"
          value={filter}
          onChange={setFilter}
          className="mb-5"
          items={[
            { value: "all", label: "All", count: mine.length },
            { value: "active", label: "Live", count: count("active") },
            { value: "paused", label: "Paused", count: count("paused") },
            { value: "draft", label: "Drafts", count: count("draft") },
          ]}
        />
      )}

      {mine.length === 0 ? (
        <EmptyState
          icon={<Store />}
          title="List your first service"
          description="Describe what you offer, set up to three packages with clear prices and delivery times, and clients can request it in a couple of clicks."
          action={<ButtonLink href="/my-services/new" size="sm">Create a service</ButtonLink>}
        />
      ) : shown.length === 0 ? (
        <EmptyState title="Nothing here" description="No services with this status." />
      ) : (
        <ul className="flex flex-col gap-3">
          {shown.map((svc) => {
            const st = serviceStats(s, svc.id);
            const m = statusMeta[svc.status];
            return (
              <li key={svc.id} className="flex flex-col gap-4 rounded-card border border-line bg-canvas p-4 sm:flex-row sm:items-center">
                <ServiceCover service={svc} sizes="(min-width: 640px) 144px, 100vw" className="aspect-[16/10] w-full shrink-0 rounded-xl sm:w-36" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusPill tone={m.tone}>{m.label}</StatusPill>
                    <span className="text-xs text-muted">{categoryLabel(svc.category)} · updated {formatDate(svc.updatedAt)}</span>
                  </div>
                  <p className="mt-1.5 truncate font-medium tracking-tight">{svc.title}</p>
                  <p className="text-sm text-muted">
                    From {formatMoney(startingPrice(svc))} · {svc.packages.length} {svc.packages.length === 1 ? "package" : "packages"} · {st.requests} {st.requests === 1 ? "request" : "requests"} · {st.completed} completed
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <ButtonLink href={`/services/${svc.id}`} size="sm" variant="ghost" aria-label="View public page"><Eye />View</ButtonLink>
                  <ButtonLink href={`/my-services/${svc.id}/edit`} size="sm" variant="secondary"><Pencil />Edit</ButtonLink>
                  {svc.status === "active" ? (
                    <Button size="sm" variant="ghost" onClick={() => setStatus(svc, "paused")}><Pause />Pause</Button>
                  ) : svc.status === "paused" ? (
                    <Button size="sm" variant="ghost" onClick={() => setStatus(svc, "active")}><Play />Resume</Button>
                  ) : null}
                  <Button size="sm" variant="ghost" aria-label={`Delete ${svc.title}`} onClick={() => setDeleting(svc)}><Trash2 /></Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <p className="mt-6 text-sm text-muted">
        Tip: pausing hides a service from clients without losing it. Requests already sent aren&rsquo;t affected.{" "}
        <Link href="/explore" className="font-medium text-ink underline-offset-4 hover:underline">See how clients browse</Link>
      </p>

      <Dialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        title="Delete this service?"
        description="It will be removed from Explore and your profile. Jobs already requested keep their agreed details."
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleting(null)}>Cancel</Button>
            <Button
              onClick={() => {
                const r = run(ops.deleteService(deleting!.id, me.id));
                setDeleting(null);
                if (r.ok) toast.success("Service deleted");
                else toast.error(r.error);
              }}
            >
              Delete
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted">Consider pausing instead if you might offer it again.</p>
      </Dialog>
    </Page>
  );
}
