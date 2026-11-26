import { Plus } from "lucide-react";
import { Container, Section, SectionHeader } from "@/components/ui/primitives";

const faqs = [
  {
    q: "What is CampusHold?",
    a: "A freelance marketplace where every job has an agreed scope, a funded payment and its own workspace for messages, files, delivery and approval. It starts with the UNIUYO community and will open more widely.",
  },
  {
    q: "Can I hire freelancers and offer my own services?",
    a: "Yes. One account can do both. During onboarding you choose whether you want to hire, offer services, or both, and you can change this later.",
  },
  {
    q: "When does the freelancer get paid?",
    a: "After the client approves the delivered work, CampusHold asks our payment provider to send the payout to the freelancer’s bank account. Payout timing depends on the provider’s settlement process.",
  },
  {
    q: "What if I’m not happy with the work?",
    a: "You can request a revision inside the job workspace. If you can’t agree, either side can open a dispute. While a dispute is open, payment is not released automatically.",
  },
  {
    q: "Is my money held in escrow?",
    a: "Payments are processed and held by our payment provider, not by CampusHold directly. We’re confirming the exact arrangement with the provider and will publish clear terms before live payments are switched on.",
  },
  {
    q: "What does it cost?",
    a: "We’ll publish our fees before launch. You’ll always see any fee before you confirm a payment.",
  },
  {
    q: "Who can join?",
    a: "We’re starting with students and clients around UNIUYO, then opening to freelancers and businesses across Nigeria.",
  },
];

export function Faq() {
  return (
    <Section id="faq" className="scroll-mt-20">
      <Container className="grid gap-12 lg:grid-cols-[1fr_1.5fr]">
        <SectionHeader
          align="left"
          eyebrow="FAQ"
          title="Questions, answered."
          description="Can’t find what you’re looking for? We’ll add a contact channel before launch."
        />
        <div className="divide-y divide-line border-y border-line">
          {faqs.map((f) => (
            <details key={f.q} className="group">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-5 text-left text-[1.0625rem] font-medium tracking-tight [&::-webkit-details-marker]:hidden">
                {f.q}
                <Plus
                  aria-hidden
                  className="size-4 shrink-0 text-muted transition-transform duration-200 group-open:rotate-45"
                />
              </summary>
              <p className="pr-10 pb-6 text-muted">{f.a}</p>
            </details>
          ))}
        </div>
      </Container>
    </Section>
  );
}
