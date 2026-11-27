"use client";

import Image, { type ImageLoader } from "next/image";
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import {
  Camera,
  ChartNoAxesColumn,
  Clapperboard,
  Clock,
  Code2,
  GraduationCap,
  Megaphone,
  Palette,
  PenLine,
  type LucideIcon,
} from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import type { CategoryId, Service, User } from "@/lib/domain/types";
import { categoryLabel } from "@/lib/domain/categories";
import { cn } from "@/lib/cn";
import { formatMoney } from "@/lib/format";
import { fastestDelivery, startingPrice } from "@/lib/store";

export const categoryVisual: Record<CategoryId, { icon: LucideIcon; hue: number }> = {
  design: { icon: Palette, hue: 340 },
  development: { icon: Code2, hue: 250 },
  writing: { icon: PenLine, hue: 30 },
  video: { icon: Clapperboard, hue: 10 },
  photography: { icon: Camera, hue: 200 },
  marketing: { icon: Megaphone, hue: 300 },
  research: { icon: ChartNoAxesColumn, hue: 160 },
  tutoring: { icon: GraduationCap, hue: 90 },
};

/** Serve images straight from Unsplash's CDN at the size the layout needs. */
const unsplashLoader: ImageLoader = ({ src, width, quality }) =>
  `${src}?w=${width}&q=${quality ?? 75}&auto=format&fit=crop`;

/** Stable pseudo-random aspect for services without a photo, so masonry still varies. */
function placeholderAspect(id: string) {
  const n = [...id].reduce((a, c) => a + c.charCodeAt(0), 0);
  return [1.25, 0.8, 1, 0.75, 1.33][n % 5];
}

/**
 * Service cover: the photo when there is one, otherwise a plain category cover.
 * Fills its parent, which must set the size (and `relative`).
 */
export function ServiceCover({
  service,
  className,
  size = "md",
  sizes = "(min-width: 1280px) 25vw, (min-width: 640px) 50vw, 50vw",
  priority = false,
  style,
}: {
  service: Pick<Service, "category" | "cover">;
  style?: CSSProperties;
  className?: string;
  size?: "md" | "lg";
  sizes?: string;
  priority?: boolean;
}) {
  if (service.cover) {
    return (
      <div className={cn("relative overflow-hidden bg-surface", className)} style={style}>
        <Image
          {...(service.cover.url.startsWith("https://images.unsplash.com/") ? { loader: unsplashLoader } : { unoptimized: true })}
          src={service.cover.url}
          alt={service.cover.alt}
          fill
          sizes={sizes}
          priority={priority}
          className="object-cover"
        />
      </div>
    );
  }
  const v = categoryVisual[service.category];
  const Icon = v.icon;
  return (
    <div
      className={cn("relative flex items-center justify-center overflow-hidden", className)}
      style={{ backgroundColor: `oklch(0.965 0.02 ${v.hue})`, ...style }}
    >
      <div
        aria-hidden
        className="absolute inset-0 opacity-60 [background-image:radial-gradient(currentColor_1px,transparent_1px)] [background-size:18px_18px]"
        style={{ color: `oklch(0.85 0.04 ${v.hue})` }}
      />
      <span
        className={cn(
          "relative flex items-center justify-center rounded-2xl bg-white/80 shadow-card",
          size === "lg" ? "size-20" : "size-14",
        )}
        style={{ color: `oklch(0.45 0.09 ${v.hue})` }}
      >
        <Icon className={size === "lg" ? "size-9" : "size-6"} aria-hidden />
      </span>
    </div>
  );
}

/**
 * Grid for service cards.
 * Phones: a tight, near edge-to-edge two-column masonry feed (Pinterest-style)
 * where every photo keeps its natural shape. Tablet and up: a regular grid.
 */
export function ServiceGrid({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "-mx-3.5 columns-2 gap-2 [&>*]:mb-4 [&>*]:break-inside-avoid",
        "sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-5 sm:[&>*]:mb-0 lg:grid-cols-3 xl:grid-cols-4",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function ServiceCard({ service, freelancer }: { service: Service; freelancer: User }) {
  const days = fastestDelivery(service);
  const aspect = service.cover?.aspect ?? placeholderAspect(service.id);
  const from = service.packages.length > 1 ? "From " : "";
  return (
    <Link
      href={`/services/${service.id}`}
      className="group flex flex-col sm:overflow-hidden sm:rounded-card sm:border sm:border-line sm:bg-canvas sm:transition-shadow sm:hover:shadow-float"
    >
      {/* Natural photo shape on phones (masonry); uniform crop from tablet up */}
      <ServiceCover
        service={service}
        style={{ "--ar": String(aspect) } as CSSProperties}
        className="aspect-(--ar) rounded-[1.125rem] sm:aspect-[16/10] sm:rounded-none sm:border-b sm:border-line"
      />

      {/* Phone: one short caption under the image, like a pin */}
      <div className="flex flex-col gap-0.5 px-1.5 pt-2 sm:hidden">
        <p className="truncate text-[0.8125rem] leading-snug font-medium">{service.title}</p>
        <p className="truncate text-xs text-muted">
          <span className="font-medium text-ink tabular-nums">
            {from}
            {formatMoney(startingPrice(service))}
          </span>
          {" · "}
          {freelancer.firstName}
        </p>
      </div>

      {/* Tablet and up: full card */}
      <div className="hidden flex-1 flex-col gap-3 p-4 sm:flex">
        <div className="flex items-center gap-2">
          <Avatar user={freelancer} size="xs" />
          <span className="truncate text-sm font-medium">{freelancer.displayName}</span>
          <span className="ml-auto shrink-0 text-xs text-subtle">{categoryLabel(service.category)}</span>
        </div>
        <p className="line-clamp-2 leading-snug font-medium tracking-tight group-hover:underline group-hover:underline-offset-4">
          {service.title}
        </p>
        <div className="mt-auto flex items-end justify-between gap-2 border-t border-line pt-3">
          <span className="inline-flex items-center gap-1 text-xs text-muted">
            <Clock className="size-3.5" aria-hidden />
            {days} {days === 1 ? "day" : "days"}
            {service.packages.length > 1 ? " or more" : ""}
          </span>
          <span className="text-right">
            <span className="block text-[0.6875rem] text-subtle">{from ? "From" : "Price"}</span>
            <span className="font-medium tabular-nums">{formatMoney(startingPrice(service))}</span>
          </span>
        </div>
      </div>
    </Link>
  );
}
