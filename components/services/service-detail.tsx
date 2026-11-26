"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { BadgeCheck, Check, ChevronRight, Clock, FileSearch, MapPin, Pencil, RotateCcw, ShieldCheck } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { ButtonLink } from "@/components/ui/button";
import { Alert, EmptyState } from "@/components/ui/feedback";
import { StatusPill } from "@/components/ui/primitives";
import { availabilityMeta, categoryLabel } from "@/lib/domain/categories";
import { cn } from "@/lib/cn";
import { formatDate, formatMoney } from "@/lib/format";
import { completedJobsCount, getUser, serviceStats, useAppState, visibleServices } from "@/lib/store";
import { ServiceCard, ServiceCover, ServiceGrid } from "./service-card";

export function ServiceDetail() {
  const { id } = useParams<{ id: string }>();
  const s = useAppState();
  const svc = s.services.find((x) => x.id === id);
  const freelancer = svc && getUser(s, svc.freelancerId);
  const [pkgId, setPkgId] = useState<string | null>(null);

  const isOwner = Boolean(svc && s.signedIn && svc.freelancerId === s.currentUserId);
  if (!svc || !freelancer || (svc.status === "draft" && !isOwner)) {
    return (
      <div className="container-page py-16">
        <EmptyState
          icon={<FileSearch />}
          title="Service not found"
          description="It may have been removed by the freelancer."
          action={<ButtonLink href="/explore" size="sm">Explore services</ButtonLink>}
        />
      </div>
    );
  }

  const pkg = svc.packages.find((p) => p.id === pkgId) ?? svc.packages[Math.min(1, svc.packages.length - 1)];
  const f = freelancer.freelancer!;
  const takingWork = svc.status === "active" && freelancer.status === "active" && f.availability !== "unavailable";
  const stats = serviceStats(s, svc.id);
  const more = visibleServices(s).filter((x) => x.freelancerId === freelancer.id && x.id !== svc.id).slice(0, 3);
  const a = availabilityMeta[f.availability];

  return (
    <div className="container-page pt-6 pb-28 lg:pb-20">
      <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-1 text-sm text-muted">
        <Link href="/explore" className="hover:text-ink">Explore</Link>
        <ChevronRight className="size-3.5" aria-hidden />
        <Link href={`/explore?category=${svc.category}`} className="hover:text-ink">{categoryLabel(svc.category)}</Link>
      </nav>

      {isOwner && (
        <Alert
          tone={svc.status === "active" ? "info" : "warning"}
          className="mb-6"
          title={svc.status === "active" ? "This is your service" : `This service is ${svc.status === "paused" ? "paused" : "a draft"}`}
          action={<ButtonLink href={`/my-services/${svc.id}/edit`} size="sm" variant="secondary"><Pencil />Edit</ButtonLink>}
        >
          {svc.status === "active" ? "This is what clients see." : "Clients can't request it until you publish it."}
        </Alert>
      )}

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_23rem]">
        <div className="flex min-w-0 flex-col gap-8">
          <div className="flex flex-col gap-4">
            <h1 className="font-display text-[1.875rem] leading-tight font-medium tracking-[-0.035em] text-balance md:text-[2.25rem]">
              {svc.title}
            </h1>
            <Link href={`/freelancers/${freelancer.username}`} className="flex items-center gap-3 self-start rounded-xl pr-3 hover:bg-surface">
              <Avatar user={freelancer} />
              <span>
                <span className="block font-medium">{freelancer.displayName}</span>
                <span className="block text-sm text-muted">
                  {f.title} · {completedJobsCount(s, freelancer.id)} completed on CampusHold
                </span>
              </span>
            </Link>
          </div>

          <ServiceCover
            service={svc}
            size="lg"
            priority
            sizes="(min-width: 1024px) 60vw, 100vw"
            className="aspect-[4/3] rounded-panel border border-line sm:aspect-[16/9]"
          />

          <section>
            <h2 className="mb-3 text-lg font-medium tracking-tight">About this service</h2>
            <p className="text-[1.0625rem] text-ink-soft">{svc.summary}</p>
            <p className="mt-4 leading-relaxed whitespace-pre-line text-ink-soft">{svc.description}</p>
            {svc.tags.length > 0 && (
              <div className="mt-5 flex flex-wrap gap-2">
                {svc.tags.map((t) => <span key={t} className="rounded-lg bg-surface px-2.5 py-1 text-sm text-muted">{t}</span>)}
              </div>
            )}
          </section>

          {svc.packages.length > 1 && (
            <section>
              <h2 className="mb-3 text-lg font-medium tracking-tight">Compare packages</h2>
              <div className="overflow-x-auto rounded-card border border-line">
                <table className="w-full min-w-[32rem] text-sm">
                  <thead>
                    <tr className="border-b border-line bg-surface/60 text-left">
                      <th className="px-4 py-3 font-medium text-muted">Package</th>
                      {svc.packages.map((p) => <th key={p.id} className="px-4 py-3 font-medium">{p.name}</th>)}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    <tr><td className="px-4 py-3 text-muted">Price</td>{svc.packages.map((p) => <td key={p.id} className="px-4 py-3 font-medium tabular-nums">{formatMoney(p.price)}</td>)}</tr>
                    <tr><td className="px-4 py-3 text-muted">Delivery</td>{svc.packages.map((p) => <td key={p.id} className="px-4 py-3">{p.deliveryDays} days</td>)}</tr>
                    <tr><td className="px-4 py-3 text-muted">Revisions</td>{svc.packages.map((p) => <td key={p.id} className="px-4 py-3">{p.revisions}</td>)}</tr>
                    <tr>
                      <td className="px-4 py-3 align-top text-muted">Included</td>
                      {svc.packages.map((p) => (
                        <td key={p.id} className="px-4 py-3 align-top">
                          <ul className="flex flex-col gap-1.5">
                            {p.features.map((x) => <li key={x} className="flex gap-1.5"><Check className="mt-0.5 size-3.5 shrink-0 text-success" aria-hidden />{x}</li>)}
                          </ul>
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {svc.faq.length > 0 && (
            <section>
              <h2 className="mb-1 text-lg font-medium tracking-tight">Questions</h2>
              <div className="divide-y divide-line border-y border-line">
                {svc.faq.map((x) => (
                  <details key={x.q} className="group">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 font-medium [&::-webkit-details-marker]:hidden">
                      {x.q}
                      <ChevronRight className="size-4 shrink-0 text-muted transition-transform group-open:rotate-90" aria-hidden />
                    </summary>
                    <p className="pb-4 text-muted">{x.a}</p>
                  </details>
                ))}
              </div>
            </section>
          )}

          <section className="rounded-card border border-line p-5">
            <h2 className="mb-4 text-lg font-medium tracking-tight">About {freelancer.firstName}</h2>
            <div className="flex items-start gap-4">
              <Avatar user={freelancer} size="lg" />
              <div className="flex flex-col gap-1.5">
                <p className="font-medium">{freelancer.displayName}</p>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
                  <span className="inline-flex items-center gap-1"><MapPin className="size-3.5" aria-hidden />{freelancer.location.city}</span>
                  <span>Member since {formatDate(freelancer.joinedAt, true)}</span>
                  {freelancer.verified.email && freelancer.verified.phone && (
                    <span className="inline-flex items-center gap-1"><BadgeCheck className="size-3.5 text-success" aria-hidden />Email and phone verified</span>
                  )}
                </div>
                <p className="mt-1 text-ink-soft">{freelancer.bio}</p>
                <Link href={`/freelancers/${freelancer.username}`} className="mt-1 text-sm font-medium underline-offset-4 hover:underline">View full profile</Link>
              </div>
            </div>
          </section>
        </div>

        {/* Order panel */}
        <aside className="flex flex-col gap-4 self-start lg:sticky lg:top-24">
          <div className="overflow-hidden rounded-card border border-line bg-canvas shadow-card">
            {svc.packages.length > 1 && (
              <div role="tablist" aria-label="Packages" className="grid border-b border-line" style={{ gridTemplateColumns: `repeat(${svc.packages.length}, 1fr)` }}>
                {svc.packages.map((p) => (
                  <button
                    key={p.id}
                    role="tab"
                    aria-selected={p.id === pkg.id}
                    onClick={() => setPkgId(p.id)}
                    className={cn("border-b-2 px-2 py-3 text-sm transition-colors", p.id === pkg.id ? "border-ink font-medium" : "border-transparent text-muted hover:text-ink")}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            )}
            <div className="flex flex-col gap-4 p-5">
              <div className="flex items-baseline justify-between gap-3">
                <p className="font-medium">{svc.packages.length > 1 ? pkg.name : "Price"}</p>
                <p className="text-2xl font-medium tracking-[-0.03em] tabular-nums">{formatMoney(pkg.price)}</p>
              </div>
              {pkg.description && <p className="text-sm text-muted">{pkg.description}</p>}
              <div className="flex gap-4 text-sm">
                <span className="inline-flex items-center gap-1.5"><Clock className="size-4 text-muted" aria-hidden />{pkg.deliveryDays}-day delivery</span>
                <span className="inline-flex items-center gap-1.5"><RotateCcw className="size-4 text-muted" aria-hidden />{pkg.revisions} {pkg.revisions === 1 ? "revision" : "revisions"}</span>
              </div>
              <ul className="flex flex-col gap-2 text-sm">
                {pkg.features.map((x) => <li key={x} className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />{x}</li>)}
              </ul>
              {isOwner ? (
                <ButtonLink href={`/my-services/${svc.id}/edit`} variant="secondary">Edit service</ButtonLink>
              ) : takingWork ? (
                <ButtonLink href={`/services/${svc.id}/request?package=${pkg.id}`} size="lg">Request this service</ButtonLink>
              ) : (
                <p className="rounded-xl bg-surface px-4 py-3 text-sm text-muted">
                  {svc.status !== "active" ? "This service isn't taking requests right now." : `${freelancer.firstName} isn't taking new work right now.`}
                </p>
              )}
              {!isOwner && takingWork && (
                <Link href={`/jobs/new?freelancer=${freelancer.username}`} className="text-center text-sm text-muted hover:text-ink">
                  Need something different? Send a custom request
                </Link>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-3 rounded-card border border-line bg-surface p-5 text-sm">
            <p className="flex items-center gap-2 font-medium"><ShieldCheck className="size-4 text-success" aria-hidden />How payment works</p>
            <ol className="flex flex-col gap-1.5 text-muted">
              <li>1. {freelancer.firstName} reviews your request and accepts it.</li>
              <li>2. You pay. We confirm the payment before work starts.</li>
              <li>3. You approve the delivery, or ask for a revision.</li>
              <li>4. Payment is released only after you approve.</li>
            </ol>
          </div>
          <div className="flex items-center justify-between px-1 text-xs text-muted">
            <StatusPill tone={a.tone}>{a.label}</StatusPill>
            <span>{stats.completed} completed through this service</span>
          </div>
        </aside>
      </div>

      {/* Mobile: keep the price and main action in reach */}
      {!isOwner && takingWork && (
        <div className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-between gap-3 border-t border-line bg-canvas/95 px-5 py-3 backdrop-blur lg:hidden">
          <div>
            <p className="text-xs text-muted">{svc.packages.length > 1 ? pkg.name : "Price"} · {pkg.deliveryDays} days</p>
            <p className="font-medium tabular-nums">{formatMoney(pkg.price)}</p>
          </div>
          <ButtonLink href={`/services/${svc.id}/request?package=${pkg.id}`}>Request</ButtonLink>
        </div>
      )}

      {more.length > 0 && (
        <section className="mt-16">
          <h2 className="mb-4 text-lg font-medium tracking-tight">More from {freelancer.firstName}</h2>
          <ServiceGrid className="lg:grid-cols-3 xl:grid-cols-3">
            {more.map((x) => <ServiceCard key={x.id} service={x} freelancer={freelancer} />)}
          </ServiceGrid>
        </section>
      )}
    </div>
  );
}
