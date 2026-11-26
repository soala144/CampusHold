"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { BadgeCheck, CalendarDays, ChevronLeft, ExternalLink, MapPin, Pencil, Plus, UserX } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/feedback";
import { StatusPill } from "@/components/ui/primitives";
import { ServiceCard, ServiceGrid } from "@/components/services/service-card";
import { availabilityMeta, categoryLabel, experienceLabels } from "@/lib/domain/categories";
import { formatDate, formatMoney } from "@/lib/format";
import { completedJobsCount, useAppState, visibleServices } from "@/lib/store";

export function FreelancerProfile() {
  const { username } = useParams<{ username: string }>();
  const s = useAppState();
  const user = s.users.find((u) => u.username === username);
  const isMe = s.signedIn && user?.id === s.currentUserId;

  if (!user || !user.freelancer || !user.roles.freelancer || (user.status !== "active" && !isMe)) {
    return (
      <div className="container-page py-16">
        <EmptyState
          icon={<UserX />}
          title="Profile not found"
          description="This freelancer may have changed their username or isn't offering services right now."
          action={<ButtonLink href="/explore?tab=freelancers" size="sm">Browse freelancers</ButtonLink>}
        />
      </div>
    );
  }

  const f = user.freelancer;
  const a = availabilityMeta[f.availability];
  const completed = completedJobsCount(s, user.id);
  const services = visibleServices(s).filter((x) => x.freelancerId === user.id);
  const canHire = !isMe && f.availability !== "unavailable";

  return (
    <div className="container-page pt-6 pb-20">
      <Link href="/explore?tab=freelancers" className="mb-6 inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
        <ChevronLeft className="size-4" aria-hidden />
        Freelancers
      </Link>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="flex min-w-0 flex-col gap-10">
          <section className="flex flex-col gap-5 sm:flex-row sm:items-start">
            <Avatar user={user} size="xl" />
            <div className="flex flex-1 flex-col gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-display text-[1.875rem] leading-tight font-medium tracking-[-0.035em]">{user.displayName}</h1>
                <StatusPill tone={a.tone}>{a.label}</StatusPill>
              </div>
              <p className="text-lg text-ink-soft">{f.title}</p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
                <span className="inline-flex items-center gap-1.5"><MapPin className="size-3.5" aria-hidden />{user.location.city}, {user.location.state}</span>
                <span className="inline-flex items-center gap-1.5"><CalendarDays className="size-3.5" aria-hidden />Joined {formatDate(user.joinedAt, true)}</span>
                {user.verified.email && user.verified.phone && (
                  <span className="inline-flex items-center gap-1.5"><BadgeCheck className="size-3.5 text-success" aria-hidden />Email and phone verified</span>
                )}
              </div>
              <p className="mt-2 text-ink-soft">{user.bio}</p>
            </div>
          </section>

          <section>
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-lg font-medium tracking-tight">Services</h2>
              {isMe && <ButtonLink href="/my-services/new" size="sm" variant="secondary"><Plus />New service</ButtonLink>}
            </div>
            {services.length === 0 ? (
              <EmptyState
                title={isMe ? "You haven't listed any services yet" : "No services listed yet"}
                description={isMe ? "Clients find you faster when you offer clear, fixed-price services." : `You can still send ${user.firstName} a custom request.`}
                action={isMe ? <ButtonLink href="/my-services/new" size="sm">Create a service</ButtonLink> : undefined}
              />
            ) : (
              <ServiceGrid className="lg:grid-cols-2 xl:grid-cols-3">
                {services.map((x) => <ServiceCard key={x.id} service={x} freelancer={user} />)}
              </ServiceGrid>
            )}
          </section>

          <section>
            <h2 className="mb-3 text-lg font-medium tracking-tight">About</h2>
            <p className="leading-relaxed whitespace-pre-line text-ink-soft">{f.description}</p>
            <div className="mt-5 flex flex-wrap gap-2">
              {f.skills.map((sk) => <span key={sk} className="rounded-lg border border-line bg-surface px-3 py-1.5 text-sm">{sk}</span>)}
            </div>
          </section>

          {f.portfolio.length > 0 && (
            <section>
              <h2 className="mb-3 text-lg font-medium tracking-tight">Portfolio</h2>
              <ul className="grid gap-2 sm:grid-cols-2">
                {f.portfolio.map((p) => (
                  <li key={p.url}>
                    <a href={p.url} target="_blank" rel="noopener noreferrer nofollow" className="flex items-center justify-between gap-2 rounded-xl border border-line px-4 py-3 text-sm hover:bg-surface">
                      <span className="font-medium">{p.label}</span>
                      <ExternalLink className="size-4 text-muted" aria-hidden />
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <aside className="flex flex-col gap-4 self-start lg:sticky lg:top-24">
          <div className="flex flex-col gap-4 rounded-card border border-line bg-canvas p-5 shadow-card">
            <div>
              <p className="text-sm text-muted">Starting from</p>
              <p className="text-2xl font-medium tracking-[-0.03em] tabular-nums">
                {formatMoney(f.pricing.from)}
                <span className="text-base font-normal text-muted">{f.pricing.type === "hourly" ? " / hour" : " / job"}</span>
              </p>
            </div>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl bg-surface p-3"><dt className="text-xs text-muted">Experience</dt><dd className="mt-0.5 font-medium">{experienceLabels[f.experience]}</dd></div>
              <div className="rounded-xl bg-surface p-3"><dt className="text-xs text-muted">Completed jobs</dt><dd className="mt-0.5 font-medium tabular-nums">{completed}</dd></div>
            </dl>
            <p className="text-sm text-muted">{f.categories.map(categoryLabel).join(" · ")}</p>
            {isMe ? (
              <ButtonLink href="/settings" variant="secondary"><Pencil />Edit profile</ButtonLink>
            ) : canHire ? (
              <ButtonLink href={`/jobs/new?freelancer=${user.username}`}>Send a custom request</ButtonLink>
            ) : (
              <p className="rounded-xl bg-surface px-4 py-3 text-sm text-muted">{user.firstName} isn&rsquo;t taking new work right now.</p>
            )}
          </div>
          <p className="px-1 text-xs text-muted">Payment is confirmed before work starts and released only when you approve the delivery.</p>
        </aside>
      </div>
    </div>
  );
}
