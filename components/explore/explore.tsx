"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { ArrowRight, Search, SearchX, X } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/feedback";
import { Input, Select } from "@/components/ui/form";
import { Tabs } from "@/components/ui/tabs";
import { FreelancerCard } from "@/components/marketplace/freelancer-card";
import { ServiceCard, ServiceGrid, categoryVisual } from "@/components/services/service-card";
import { categories } from "@/lib/domain/categories";
import type { CategoryId, Service } from "@/lib/domain/types";
import { cn } from "@/lib/cn";
import { completedJobsCount, fastestDelivery, getUser, startingPrice, useAppState, visibleServices } from "@/lib/store";

type Tab = "services" | "freelancers";
type Sort = "recommended" | "price_low" | "price_high" | "fastest" | "newest";
type Budget = "any" | "u20" | "20to50" | "50to100" | "100plus";
type Delivery = "any" | "3" | "7" | "14";

const budgets: Record<Budget, { label: string; test: (kobo: number) => boolean }> = {
  any: { label: "Any budget", test: () => true },
  u20: { label: "Under ₦20,000", test: (k) => k < 2_000_000 },
  "20to50": { label: "₦20,000 – ₦50,000", test: (k) => k >= 2_000_000 && k <= 5_000_000 },
  "50to100": { label: "₦50,000 – ₦100,000", test: (k) => k > 5_000_000 && k <= 10_000_000 },
  "100plus": { label: "Over ₦100,000", test: (k) => k > 10_000_000 },
};

const isCategory = (v: string | null): v is CategoryId => categories.some((c) => c.id === v);

export function Explore() {
  const s = useAppState();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  // URL holds the shareable bits (tab, category, search).
  const tab: Tab = params.get("tab") === "freelancers" ? "freelancers" : "services";
  const rawCat = params.get("category");
  const cat: CategoryId | "all" = isCategory(rawCat) ? rawCat : "all";
  const [q, setQ] = useState(params.get("q") ?? "");
  const [budget, setBudget] = useState<Budget>("any");
  const [delivery, setDelivery] = useState<Delivery>("any");
  const [sort, setSort] = useState<Sort>("recommended");

  function setParam(key: string, value: string | null) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    router.replace(`${pathname}${next.size ? `?${next}` : ""}`, { scroll: false });
  }

  const term = q.trim().toLowerCase();
  const services = useMemo(() => visibleServices(s).filter((svc) => svc.freelancerId !== s.currentUserId || !s.signedIn), [s]);

  const filteredServices = useMemo(() => {
    const list = services.filter((svc) => {
      const u = getUser(s, svc.freelancerId)!;
      if (cat !== "all" && svc.category !== cat) return false;
      if (!budgets[budget].test(startingPrice(svc))) return false;
      if (delivery !== "any" && fastestDelivery(svc) > Number(delivery)) return false;
      if (!term) return true;
      return [svc.title, svc.summary, u.displayName, ...svc.tags].some((t) => t.toLowerCase().includes(term));
    });
    const sorted = [...list];
    const avail = (svc: Service) => ({ available: 0, limited: 1, unavailable: 2 })[getUser(s, svc.freelancerId)!.freelancer!.availability];
    if (sort === "recommended") sorted.sort((a, b) => avail(a) - avail(b));
    if (sort === "price_low") sorted.sort((a, b) => startingPrice(a) - startingPrice(b));
    if (sort === "price_high") sorted.sort((a, b) => startingPrice(b) - startingPrice(a));
    if (sort === "fastest") sorted.sort((a, b) => fastestDelivery(a) - fastestDelivery(b));
    if (sort === "newest") sorted.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return sorted;
  }, [s, services, cat, budget, delivery, sort, term]);

  const freelancers = useMemo(
    () =>
      s.users.filter((u) => {
        const f = u.freelancer;
        if (!f || !u.roles.freelancer || u.status !== "active") return false;
        if (s.signedIn && u.id === s.currentUserId) return false;
        if (cat !== "all" && !f.categories.includes(cat)) return false;
        if (!term) return true;
        return [u.displayName, f.title, f.description, ...f.skills].some((t) => t.toLowerCase().includes(term));
      }),
    [s, cat, term],
  );

  const browsing = tab === "services" && !term && cat === "all" && budget === "any" && delivery === "any";
  const filtersActive = Boolean(term) || cat !== "all" || budget !== "any" || delivery !== "any";
  const clearAll = () => {
    setQ("");
    setBudget("any");
    setDelivery("any");
    router.replace(tab === "freelancers" ? `${pathname}?tab=freelancers` : pathname, { scroll: false });
  };
  const card = (svc: Service) => <ServiceCard key={svc.id} service={svc} freelancer={getUser(s, svc.freelancerId)!} />;

  return (
    <div className="container-page pt-5 pb-20 md:pt-12">
      <div className="flex max-w-3xl flex-col gap-3">
        <h1 className="font-display text-[1.625rem] leading-tight font-medium tracking-[-0.035em] md:text-[2.5rem]">
          {cat === "all" ? "Find the help you need" : categories.find((c) => c.id === cat)!.label}
        </h1>
        <p className="hidden text-lg text-muted sm:block">
          {cat === "all"
            ? "Services offered by students and freelancers in the CampusHold community. Pay only when they accept, and release payment when you approve."
            : categories.find((c) => c.id === cat)!.blurb}
        </p>
      </div>

      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          setParam("q", q.trim() || null);
        }}
        className="relative mt-4 max-w-2xl sm:mt-6"
      >
        <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-subtle" aria-hidden />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Try “logo”, “website”, “product photos”"
          aria-label="Search services and freelancers"
          className="h-12 rounded-full pr-28 pl-11"
        />
        {q && (
          <button
            type="button"
            onClick={() => {
              setQ("");
              setParam("q", null);
            }}
            aria-label="Clear search"
            className="absolute top-1/2 right-24 -translate-y-1/2 rounded-full p-1.5 text-muted hover:bg-surface"
          >
            <X className="size-4" />
          </button>
        )}
        <Button type="submit" size="sm" className="absolute top-1/2 right-1.5 -translate-y-1/2">
          Search
        </Button>
      </form>

      <div className="scrollbar-none mt-6 -mx-5 flex gap-2 overflow-x-auto px-5 pb-1 md:mx-0 md:flex-wrap md:px-0" role="group" aria-label="Category">
        {[{ id: "all" as const, label: "All" }, ...categories].map((c) => (
          <button
            key={c.id}
            aria-pressed={cat === c.id}
            onClick={() => setParam("category", c.id === "all" ? null : c.id)}
            className={cn(
              "shrink-0 rounded-full border px-3.5 py-1.5 text-sm transition-colors",
              cat === c.id ? "border-ink bg-ink text-white" : "border-line-strong bg-canvas hover:bg-surface",
            )}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="mt-6 flex flex-col gap-3 border-t border-line pt-6 lg:flex-row lg:items-center lg:justify-between">
        <Tabs
          label="Browse"
          value={tab}
          onChange={(t) => setParam("tab", t === "services" ? null : t)}
          items={[
            { value: "services", label: "Services", count: filteredServices.length },
            { value: "freelancers", label: "Freelancers", count: freelancers.length },
          ]}
        />
        {tab === "services" && (
          <div className="scrollbar-none -mx-5 flex gap-2 overflow-x-auto px-5 pb-1 sm:mx-0 sm:flex-wrap sm:px-0 sm:pb-0 [&>select]:shrink-0">
            <Select aria-label="Budget" value={budget} onChange={(e) => setBudget(e.target.value as Budget)} className="h-9 w-auto rounded-full text-sm">
              {Object.entries(budgets).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </Select>
            <Select aria-label="Delivery time" value={delivery} onChange={(e) => setDelivery(e.target.value as Delivery)} className="h-9 w-auto rounded-full text-sm">
              <option value="any">Any delivery time</option>
              <option value="3">Within 3 days</option>
              <option value="7">Within a week</option>
              <option value="14">Within 2 weeks</option>
            </Select>
            <Select aria-label="Sort" value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="h-9 w-auto rounded-full text-sm">
              <option value="recommended">Sort: Available first</option>
              <option value="price_low">Price: low to high</option>
              <option value="price_high">Price: high to low</option>
              <option value="fastest">Fastest delivery</option>
              <option value="newest">Newest</option>
            </Select>
          </div>
        )}
      </div>

      {browsing ? (
        <BrowseHome services={services} card={card} onCategory={(c) => setParam("category", c)} countFor={(c) => services.filter((x) => x.category === c).length} />
      ) : tab === "services" ? (
        <Results count={filteredServices.length} filtersActive={filtersActive} onClear={clearAll} noun="service">
          <ServiceGrid>{filteredServices.map(card)}</ServiceGrid>
        </Results>
      ) : (
        <Results count={freelancers.length} filtersActive={filtersActive} onClear={clearAll} noun="freelancer">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {freelancers.map((u) => <FreelancerCard key={u.id} user={u} completed={completedJobsCount(s, u.id)} />)}
          </div>
        </Results>
      )}

      <div className="mt-16 flex flex-col items-start gap-4 rounded-panel border border-line bg-surface p-6 md:flex-row md:items-center md:justify-between md:p-8">
        <div>
          <p className="text-lg font-medium tracking-tight">Have a skill people need?</p>
          <p className="text-muted">List a service and get paid through a workflow that protects your time.</p>
        </div>
        <ButtonLink href={s.signedIn ? "/my-services/new" : "/signup"} variant="secondary">
          Offer a service
          <ArrowRight />
        </ButtonLink>
      </div>
    </div>
  );
}

function BrowseHome({
  services,
  card,
  onCategory,
  countFor,
}: {
  services: Service[];
  card: (s: Service) => React.ReactNode;
  onCategory: (c: CategoryId) => void;
  countFor: (c: CategoryId) => number;
}) {
  const quick = [...services].filter((x) => fastestDelivery(x) <= 3).sort((a, b) => fastestDelivery(a) - fastestDelivery(b)).slice(0, 4);
  const affordable = [...services].filter((x) => startingPrice(x) < 2_000_000).sort((a, b) => startingPrice(a) - startingPrice(b)).slice(0, 4);
  return (
    <div className="mt-8 flex flex-col gap-12 sm:mt-10 sm:gap-14">
      <section aria-labelledby="cats" className="hidden sm:block">
        <h2 id="cats" className="mb-4 text-lg font-medium tracking-tight">Browse by category</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {categories.map((c) => {
            const v = categoryVisual[c.id];
            const Icon = v.icon;
            const n = countFor(c.id);
            return (
              <button
                key={c.id}
                onClick={() => onCategory(c.id)}
                className="flex flex-col items-start gap-3 rounded-card border border-line bg-canvas p-4 text-left transition-shadow hover:shadow-card"
              >
                <span className="flex size-10 items-center justify-center rounded-xl" style={{ backgroundColor: `oklch(0.95 0.03 ${v.hue})`, color: `oklch(0.45 0.09 ${v.hue})` }}>
                  <Icon className="size-5" aria-hidden />
                </span>
                <span>
                  <span className="block font-medium tracking-tight">{c.label}</span>
                  <span className="block text-xs text-muted">{n} {n === 1 ? "service" : "services"}</span>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {quick.length > 0 && <Row title="Done in 3 days or less" className="hidden sm:block">{quick.map(card)}</Row>}
      {affordable.length > 0 && <Row title="Under ₦20,000" className="hidden sm:block">{affordable.map(card)}</Row>}
      <Row title="All services" mobileTitle="For you">{services.map(card)}</Row>
    </div>
  );
}

function Row({
  title,
  mobileTitle,
  className,
  children,
}: {
  title: string;
  mobileTitle?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={className}>
      <h2 className="mb-3 text-lg font-medium tracking-tight sm:mb-4">
        {mobileTitle ? (
          <>
            <span className="sm:hidden">{mobileTitle}</span>
            <span className="hidden sm:inline">{title}</span>
          </>
        ) : (
          title
        )}
      </h2>
      <ServiceGrid>{children}</ServiceGrid>
    </section>
  );
}

function Results({
  count,
  filtersActive,
  onClear,
  noun,
  children,
}: {
  count: number;
  filtersActive: boolean;
  onClear: () => void;
  noun: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-sm text-muted" aria-live="polite">
          {count} {count === 1 ? noun : `${noun}s`}
        </p>
        {filtersActive && (
          <button onClick={onClear} className="text-sm text-muted underline-offset-4 hover:text-ink hover:underline">
            Clear filters
          </button>
        )}
      </div>
      {count === 0 ? (
        <EmptyState
          icon={<SearchX />}
          title={`No ${noun}s match`}
          description="Try a different search or remove some filters. Can't find it? Post a custom job instead."
          action={
            <div className="flex gap-2">
              {filtersActive && <Button size="sm" variant="secondary" onClick={onClear}>Clear filters</Button>}
              <ButtonLink href="/jobs/new" size="sm">Post a custom job</ButtonLink>
            </div>
          }
        />
      ) : (
        children
      )}
    </div>
  );
}
