import {
  Bell,
  Briefcase,
  LayoutDashboard,
  MessagesSquare,
  Scale,
  Search,
  Settings,
  Shield,
  UserRound,
  Wallet,
  Landmark,
  Store,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Mode } from "@/lib/store";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Extra path prefixes that should mark this item active. */
  match?: string[];
}

export function primaryNav(mode: Mode, username: string): NavItem[] {
  if (mode === "client") {
    return [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/explore", label: "Explore services", icon: Search },
      { href: "/jobs", label: "My jobs", icon: Briefcase },
      { href: "/messages", label: "Messages", icon: MessagesSquare },
      { href: "/wallet", label: "Payments", icon: Wallet },
      { href: "/disputes", label: "Disputes", icon: Scale },
    ];
  }
  return [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/jobs", label: "Jobs & requests", icon: Briefcase },
    { href: "/my-services", label: "My services", icon: Store },
    { href: "/messages", label: "Messages", icon: MessagesSquare },
    { href: "/wallet", label: "Earnings", icon: Wallet },
    { href: "/wallet/payouts", label: "Payout account", icon: Landmark },
    { href: `/freelancers/${username}`, label: "My public profile", icon: UserRound },
    { href: "/disputes", label: "Disputes", icon: Scale },
  ];
}

export const secondaryNav: NavItem[] = [
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/settings", label: "Settings", icon: Settings },
];

export const adminNavItem: NavItem = { href: "/admin", label: "Admin", icon: Shield };

export const adminNav: NavItem[] = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/users", label: "Users", icon: UserRound },
  { href: "/admin/jobs", label: "Jobs", icon: Briefcase },
  { href: "/admin/transactions", label: "Transactions", icon: Wallet },
  { href: "/admin/disputes", label: "Disputes", icon: Scale },
];

export function isActive(pathname: string, item: NavItem): boolean {
  const paths = [item.href, ...(item.match ?? [])];
  return paths.some((p) =>
    p === "/admin" || p === "/wallet" ? pathname === p : pathname === p || pathname.startsWith(`${p}/`),
  );
}
