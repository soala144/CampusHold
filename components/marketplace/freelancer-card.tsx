"use client";

import Link from "next/link";
import { MapPin } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { StatusPill } from "@/components/ui/primitives";
import { availabilityMeta, experienceLabels } from "@/lib/domain/categories";
import type { User } from "@/lib/domain/types";
import { formatMoney } from "@/lib/format";

export function FreelancerCard({ user, completed }: { user: User; completed: number }) {
  const f = user.freelancer!;
  const a = availabilityMeta[f.availability];
  return (
    <Link
      href={`/freelancers/${user.username}`}
      className="group flex flex-col gap-4 rounded-card border border-line bg-canvas p-5 transition-shadow hover:shadow-card"
    >
      <div className="flex items-start gap-3">
        <Avatar user={user} size="lg" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium tracking-tight group-hover:underline group-hover:underline-offset-4">
            {user.displayName}
          </p>
          <p className="truncate text-sm text-muted">{f.title}</p>
          <p className="mt-1 flex items-center gap-1 text-xs text-subtle">
            <MapPin className="size-3" aria-hidden />
            {user.location.city}, {user.location.state}
          </p>
        </div>
      </div>
      <p className="line-clamp-2 text-sm text-ink-soft">{f.description}</p>
      <div className="flex flex-wrap gap-1.5">
        {f.skills.slice(0, 4).map((s) => (
          <span key={s} className="rounded-lg bg-surface px-2 py-1 text-xs text-muted">
            {s}
          </span>
        ))}
        {f.skills.length > 4 && <span className="px-1 py-1 text-xs text-subtle">+{f.skills.length - 4}</span>}
      </div>
      <div className="mt-auto flex items-center justify-between gap-2 border-t border-line pt-4 text-sm">
        <div>
          <p className="font-medium tabular-nums">
            From {formatMoney(f.pricing.from)}
            <span className="font-normal text-muted">{f.pricing.type === "hourly" ? "/hr" : ""}</span>
          </p>
          <p className="text-xs text-muted">
            {experienceLabels[f.experience]} · {completed} completed on CampusHold
          </p>
        </div>
        <StatusPill tone={a.tone}>{a.label}</StatusPill>
      </div>
    </Link>
  );
}
