import {
  BadgeCheck,
  FileSignature,
  History,
  Info,
  PauseCircle,
  RefreshCcw,
  Unlock,
} from "lucide-react";
import { Container, IconBadge, Section, SectionHeader } from "@/components/ui/primitives";

const pillars = [
  {
    icon: FileSignature,
    title: "Agreed before it starts",
    body: "Price, deliverables and deadline are fixed in the job before any money moves.",
  },
  {
    icon: BadgeCheck,
    title: "Payments verified, not assumed",
    body: "We confirm every payment directly with our payment provider. A screenshot or redirect never counts.",
  },
  {
    icon: Unlock,
    title: "Released on approval",
    body: "Payout is only requested once the client approves the work, or the agreed release conditions are met.",
  },
  {
    icon: RefreshCcw,
    title: "Revisions built in",
    body: "Clients can ask for changes inside the job, so feedback and fixes stay on record.",
  },
  {
    icon: PauseCircle,
    title: "Disputes pause release",
    body: "If a dispute is raised, nothing is released automatically while it’s reviewed.",
  },
  {
    icon: History,
    title: "One record of everything",
    body: "Messages, files, status changes and payments are logged in the job’s timeline.",
  },
];

export function Trust() {
  return (
    <Section id="trust" className="scroll-mt-20 pt-0 md:pt-0">
      <Container>
        <SectionHeader
          eyebrow="Why it works"
          title="A workflow both sides can rely on."
          description="The rules are the same for everyone, and they’re enforced by the platform — not by whoever is more persistent."
        />

        <div className="mt-14 grid gap-x-10 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
          {pillars.map(({ icon: Icon, title, body }) => (
            <div key={title} className="flex flex-col gap-4">
              <IconBadge>
                <Icon />
              </IconBadge>
              <h3 className="text-lg font-medium tracking-tight">{title}</h3>
              <p className="text-muted">{body}</p>
            </div>
          ))}
        </div>

        <div className="mt-16 flex gap-4 rounded-card border border-line bg-surface p-5 md:p-6">
          <Info className="mt-0.5 size-5 shrink-0 text-muted" aria-hidden />
          <p className="text-sm text-muted">
            <span className="font-medium text-ink">How payments are handled.</span> CampusHold
            coordinates the job and its payment status. Payments themselves are processed by our
            payment provider. Live payments are not yet enabled — we&rsquo;ll publish the exact
            payment, release and refund terms before they are.
          </p>
        </div>
      </Container>
    </Section>
  );
}
