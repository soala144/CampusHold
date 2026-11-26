import { HandCoins, MessagesSquare, UserX } from "lucide-react";
import { Card, Container, IconBadge, Section, SectionHeader } from "@/components/ui/primitives";

const problems = [
  {
    icon: UserX,
    who: "Clients",
    title: "Paying upfront feels like a gamble",
    body: "Send the money first and hope the work arrives — on time, and as agreed.",
  },
  {
    icon: HandCoins,
    who: "Freelancers",
    title: "Finishing first feels like a gamble too",
    body: "Deliver the work first and hope the transfer comes through afterwards.",
  },
  {
    icon: MessagesSquare,
    who: "Both",
    title: "Everything lives in different places",
    body: "Scope in a DM, files on a drive, payment by screenshot. Nobody has the full picture.",
  },
];

export function Problem() {
  return (
    <Section>
      <Container>
        <SectionHeader
          eyebrow="The problem"
          title="Freelancing runs on trust. Right now, someone always goes first."
          description="Most freelance work is arranged informally. When something goes wrong, there’s no shared record of what was agreed, paid or delivered."
        />
        <div className="mt-14 grid gap-4 md:grid-cols-3">
          {problems.map(({ icon: Icon, who, title, body }) => (
            <Card key={title} className="flex flex-col gap-4 p-6">
              <div className="flex items-center justify-between">
                <IconBadge>
                  <Icon />
                </IconBadge>
                <span className="text-xs font-medium text-subtle">{who}</span>
              </div>
              <h3 className="text-lg font-medium tracking-tight">{title}</h3>
              <p className="text-muted">{body}</p>
            </Card>
          ))}
        </div>
      </Container>
    </Section>
  );
}
