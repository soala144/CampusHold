"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogIn, LogOut, Menu, X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Avatar } from "@/components/ui/avatar";
import { ButtonLink } from "@/components/ui/button";
import { Logo, LogoMark } from "@/components/ui/logo";
import { setReturnTo } from "@/lib/return-to";
import { logOut } from "@/lib/server/auth-actions";
import { cn } from "@/lib/cn";
import { currentUser, ops, run, unreadNotifications, useAppState, type Mode } from "@/lib/store";
import { adminNav, adminNavItem, isActive, primaryNav, secondaryNav, type NavItem } from "./nav";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Close the mobile drawer whenever the route changes.
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setOpen(false);
  }

  // Freelancer-only pages switch the sidebar to Working mode.
  const state = useAppState();
  const me = currentUser(state);
  const freelancerPage = pathname.startsWith("/my-services") || pathname === "/wallet/payouts";
  useEffect(() => {
    if (freelancerPage && state.mode === "client" && me?.roles.freelancer) run(ops.setMode("freelancer"));
  }, [freelancerPage, state.mode, me?.roles.freelancer]);

  // New accounts finish onboarding before using the app.
  const router = useRouter();
  const needsOnboarding = state.signedIn && !me?.onboarded && !pathname.startsWith("/onboarding");
  useEffect(() => {
    if (needsOnboarding) router.replace("/onboarding");
  }, [needsOnboarding, router]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  if (!state.signedIn) return <SignedOut />;
  if (pathname.startsWith("/onboarding")) return <>{children}</>;
  if (needsOnboarding) return null;

  return (
    <div className="flex min-h-dvh bg-surface/40">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 border-r border-line bg-canvas lg:flex">
        <Sidebar />
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button aria-label="Close menu" className="absolute inset-0 bg-ink/30" onClick={() => setOpen(false)} />
          <aside className="relative flex h-full w-72 max-w-[85vw] bg-canvas shadow-float">
            <Sidebar />
            <button
              onClick={() => setOpen(false)}
              aria-label="Close menu"
              className="absolute top-4 right-3 rounded-full p-2 text-muted hover:bg-surface"
            >
              <X className="size-4" />
            </button>
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-line bg-canvas/90 px-4 backdrop-blur lg:hidden">
          <button
            onClick={() => setOpen(true)}
            aria-label="Open menu"
            className="rounded-full border border-line-strong p-2 hover:bg-surface"
          >
            <Menu className="size-4" />
          </button>
          <Link href="/dashboard" className="flex items-center gap-2 font-semibold tracking-tight">
            <LogoMark className="size-7" />
            CampusHold
          </Link>
        </header>
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}

function Sidebar() {
  const s = useAppState();
  const me = currentUser(s);
  const pathname = usePathname();
  const router = useRouter();
  const inAdmin = pathname.startsWith("/admin");
  const unread = unreadNotifications(s);
  const both = me.roles.client && me.roles.freelancer;

  function switchMode(mode: Mode) {
    run(ops.setMode(mode));
    if (pathname !== "/dashboard") router.push("/dashboard");
  }

  return (
    <div className="flex w-full flex-col">
      <div className="flex h-16 items-center gap-2.5 px-5">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <LogoMark className="size-7" />
          <span className="text-[1.0625rem] font-semibold tracking-[-0.03em]">CampusHold</span>
        </Link>
      </div>

      {both && !inAdmin && (
        <div className="px-4 pb-2">
          <div role="radiogroup" aria-label="Mode" className="grid grid-cols-2 gap-1 rounded-full border border-line bg-surface p-1 text-sm">
            {(["client", "freelancer"] as const).map((m) => (
              <button
                key={m}
                role="radio"
                aria-checked={s.mode === m}
                onClick={() => switchMode(m)}
                className={cn(
                  "rounded-full py-1.5 transition-colors",
                  s.mode === m ? "bg-canvas font-medium shadow-card" : "text-muted hover:text-ink",
                )}
              >
                {m === "client" ? "Hiring" : "Working"}
              </button>
            ))}
          </div>
        </div>
      )}

      <nav aria-label="App" className="flex flex-1 flex-col gap-6 overflow-y-auto px-3 py-3">
        {inAdmin ? (
          <NavGroup title="Administration" items={adminNav} pathname={pathname} />
        ) : (
          <NavGroup items={primaryNav(s.mode, me.username)} pathname={pathname} />
        )}
        <NavGroup
          title="Account"
          pathname={pathname}
          items={[
            ...(inAdmin ? [{ href: "/dashboard", label: "Back to app", icon: adminNavItem.icon }] : []),
            ...secondaryNav,
            ...(me.isAdmin && !inAdmin ? [adminNavItem] : []),
          ]}
          badges={{ "/notifications": unread }}
        />
      </nav>

      <div className="flex items-center gap-3 border-t border-line p-4">
        <Avatar user={me} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{me.displayName}</p>
          <p className="truncate text-xs text-muted">{me.email}</p>
        </div>
        <button
          onClick={() => {
            void logOut().then(() => {
              router.push("/login");
              router.refresh();
            });
          }}
          aria-label="Log out"
          className="rounded-full p-2 text-muted hover:bg-surface hover:text-ink"
        >
          <LogOut className="size-4" />
        </button>
      </div>
    </div>
  );
}

function NavGroup({
  title,
  items,
  pathname,
  badges = {},
}: {
  title?: string;
  items: NavItem[];
  pathname: string;
  badges?: Record<string, number>;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      {title && <p className="px-3 pb-1.5 text-xs font-medium text-subtle">{title}</p>}
      {items.map((item) => {
        const active = isActive(pathname, item);
        const Icon = item.icon;
        const badge = badges[item.href];
        return (
          <Link
            key={item.href + item.label}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2 text-[0.9375rem] transition-colors",
              active ? "bg-surface font-medium text-ink" : "text-muted hover:bg-surface hover:text-ink",
            )}
          >
            <Icon className="size-4 shrink-0" aria-hidden />
            <span className="flex-1">{item.label}</span>
            {badge ? (
              <span className="rounded-full bg-ink px-1.5 py-0.5 text-[0.6875rem] font-medium text-white tabular-nums">
                {badge}
              </span>
            ) : null}
          </Link>
        );
      })}
    </div>
  );
}

function SignedOut() {
  const pathname = usePathname();
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 px-4 text-center">
      <Logo />
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-medium tracking-[-0.03em]">You&rsquo;re signed out</h1>
        <p className="text-muted">Log in to continue to your CampusHold account.</p>
      </div>
      <div className="flex gap-2">
        <ButtonLink href="/login" onClick={() => setReturnTo(pathname)}>
          <LogIn />
          Log in
        </ButtonLink>
        <ButtonLink href="/explore" variant="secondary">
          Explore services
        </ButtonLink>
      </div>
    </div>
  );
}
