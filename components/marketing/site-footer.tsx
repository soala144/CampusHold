import Link from "next/link";
import { Logo } from "@/components/ui/logo";
import { Container } from "@/components/ui/primitives";

const columns = [
  {
    title: "Product",
    links: [
      { href: "/explore", label: "Explore services" },
      { href: "/#how-it-works", label: "How it works" },
      { href: "/#trust", label: "Trust & payments" },
      { href: "/#faq", label: "FAQ" },
    ],
  },
  {
    title: "Get started",
    links: [
      { href: "/#clients", label: "For clients" },
      { href: "/#freelancers", label: "For freelancers" },
      { href: "/signup", label: "Create an account" },
      { href: "/login", label: "Log in" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-line">
      <Container className="grid gap-12 py-14 md:grid-cols-[1.5fr_1fr_1fr]">
        <div className="flex max-w-xs flex-col gap-4">
          <Logo />
          <p className="text-sm text-muted">
            A freelance marketplace with a clear, tracked workflow — from agreed scope to approved
            payout.
          </p>
        </div>
        {columns.map((col) => (
          <nav key={col.title} aria-label={col.title} className="flex flex-col gap-3">
            <p className="text-sm font-medium">{col.title}</p>
            {col.links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="text-sm text-muted transition-colors hover:text-ink"
              >
                {l.label}
              </Link>
            ))}
          </nav>
        ))}
      </Container>
      <Container className="flex flex-col gap-2 border-t border-line py-6 text-xs text-subtle sm:flex-row sm:justify-between">
        <p>© 2026 CampusHold</p>
        <p>Built in Uyo, Nigeria</p>
      </Container>
    </footer>
  );
}
