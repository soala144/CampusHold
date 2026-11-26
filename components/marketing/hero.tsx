import { ArrowRight } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/primitives";
import { WorkspacePreview } from "./workspace-preview";

export function Hero() {
  return (
    <section className="relative overflow-hidden pt-14 pb-16 md:pt-20 md:pb-24">
      {/* Soft grid + glow, kept very faint */}
      <div
        aria-hidden
        className="bg-grid pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_60%_50%_at_50%_30%,black,transparent)]"
      />

      <Container className="relative flex flex-col items-center text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-line bg-canvas px-3 py-1 text-sm text-muted">
          <span className="size-1.5 rounded-full bg-accent-strong" />
          Launching first at UNIUYO
        </span>

        <h1 className="mt-6 max-w-4xl font-display text-display font-medium text-balance">
          Hire freelancers. Get paid for your work. Without the guesswork.
        </h1>

        <p className="mt-6 max-w-xl text-lg text-pretty text-muted">
          CampusHold keeps the scope, the payment and the conversation for every job in one
          workspace. Clients fund work before it starts. Freelancers are paid when it&rsquo;s
          approved.
        </p>

        <div className="mt-9 flex flex-col gap-3 sm:flex-row">
          <ButtonLink href="/signup" size="lg">
            Get started
            <ArrowRight />
          </ButtonLink>
          <ButtonLink href="/explore" variant="secondary" size="lg">
            Explore services
          </ButtonLink>
        </div>

        <div className="mt-16 w-full max-w-5xl md:mt-20">
          <WorkspacePreview />
          <p className="mt-4 text-xs text-subtle">Illustrative preview of a job workspace.</p>
        </div>
      </Container>
    </section>
  );
}
