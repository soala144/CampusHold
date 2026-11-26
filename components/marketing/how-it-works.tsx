import { Container, Section, SectionHeader } from "@/components/ui/primitives";

const steps = [
  { title: "Find a freelancer", body: "Browse profiles by skill, service and portfolio." },
  {
    title: "Agree the terms",
    body: "Scope, price, deliverables and deadline — written down before anything starts.",
  },
  {
    title: "Fund the job",
    body: "The client pays the agreed amount through our payment provider. We confirm it before work begins.",
  },
  { title: "Work happens", body: "Messages, files and progress stay in the job’s own workspace." },
  { title: "Submit the work", body: "The freelancer delivers against the agreed deliverables." },
  {
    title: "Review or revise",
    body: "The client approves the delivery or asks for a revision.",
  },
  {
    title: "Payment is released",
    body: "Once the work is approved, CampusHold requests the payout to the freelancer.",
  },
];

export function HowItWorks() {
  return (
    <Section id="how-it-works" className="scroll-mt-20 bg-surface">
      <Container>
        <SectionHeader
          eyebrow="How it works"
          title="Seven clear steps, from first message to final payout."
          description="Both sides always know what’s been agreed, what’s been paid and what happens next."
        />

        <ol className="mt-14 grid gap-px overflow-hidden rounded-panel border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, i) => (
            <li key={step.title} className="flex flex-col gap-3 bg-canvas p-6">
              <span className="font-mono text-xs text-subtle">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className="text-lg font-medium tracking-tight">{step.title}</h3>
              <p className="text-sm text-muted">{step.body}</p>
            </li>
          ))}
          <li className="flex flex-col justify-end gap-2 bg-ink p-6 text-white">
            <span className="inline-flex size-2 rounded-full bg-accent" />
            <p className="text-lg font-medium tracking-tight">Job completed</p>
            <p className="text-sm text-white/60">A full record of the job stays with both of you.</p>
          </li>
        </ol>
      </Container>
    </Section>
  );
}
