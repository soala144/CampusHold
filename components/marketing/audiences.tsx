import { Check } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { Container, Eyebrow, Section } from "@/components/ui/primitives";
import { cn } from "@/lib/cn";

const audiences = [
  {
    id: "clients",
    eyebrow: "For clients",
    title: "Pay for work you’ve actually received.",
    points: [
      "Agree scope, price and deadline before you pay",
      "Your payment is only released after you approve the delivery",
      "Request revisions inside the job — no chasing in DMs",
      "Raise a dispute if something goes wrong, with the full job history attached",
    ],
    cta: { href: "/signup", label: "Hire a freelancer" },
    dark: false,
  },
  {
    id: "freelancers",
    eyebrow: "For freelancers",
    title: "Start work knowing the job is funded.",
    points: [
      "See payment confirmed before you start",
      "A clear brief and deliverables you can point back to",
      "A profile and portfolio that clients can find",
      "Payout to your bank account once work is approved",
    ],
    cta: { href: "/signup", label: "Offer your services" },
    dark: true,
  },
];

export function Audiences() {
  return (
    <Section>
      <Container>
        <div className="grid gap-4 lg:grid-cols-2">
          {audiences.map((a) => (
            <article
              key={a.id}
              id={a.id}
              className={cn(
                "flex scroll-mt-24 flex-col gap-8 rounded-panel border p-8 md:p-10",
                a.dark ? "border-ink bg-ink text-white" : "border-line bg-surface",
              )}
            >
              <div className="flex flex-col gap-4">
                <Eyebrow className={a.dark ? "text-white/60" : undefined}>{a.eyebrow}</Eyebrow>
                <h2 className="font-display text-[2rem] leading-tight font-medium tracking-[-0.035em] text-balance">
                  {a.title}
                </h2>
              </div>
              <ul className="flex flex-col gap-3.5">
                {a.points.map((p) => (
                  <li key={p} className="flex gap-3">
                    <span
                      className={cn(
                        "mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full",
                        a.dark ? "bg-accent text-accent-ink" : "bg-ink text-white",
                      )}
                    >
                      <Check className="size-3" strokeWidth={3} />
                    </span>
                    <span className={a.dark ? "text-white/80" : "text-ink-soft"}>{p}</span>
                  </li>
                ))}
              </ul>
              <ButtonLink
                href={a.cta.href}
                variant={a.dark ? "accent" : "primary"}
                className="mt-auto self-start"
              >
                {a.cta.label}
              </ButtonLink>
            </article>
          ))}
        </div>
        <p className="mt-6 text-center text-sm text-muted">
          One account does both. Hire on Monday, take on work on Friday.
        </p>
      </Container>
    </Section>
  );
}
