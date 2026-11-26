import { ArrowRight } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/primitives";

export function FinalCta() {
  return (
    <Container className="pb-20 md:pb-28">
      <div className="relative overflow-hidden rounded-panel bg-ink px-6 py-16 text-center text-white md:px-12 md:py-20">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:linear-gradient(to_right,white_1px,transparent_1px),linear-gradient(to_bottom,white_1px,transparent_1px)] [background-size:56px_56px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]"
        />
        <div className="relative mx-auto flex max-w-2xl flex-col items-center gap-6">
          <h2 className="font-display text-headline font-medium text-balance">
            Your next job, agreed and on record.
          </h2>
          <p className="text-lg text-white/65">
            Create one account to hire, to offer your services, or both.
          </p>
          <div className="mt-2 flex flex-col gap-3 sm:flex-row">
            <ButtonLink href="/signup" variant="accent" size="lg">
              Create an account
              <ArrowRight />
            </ButtonLink>
            <ButtonLink
              href="#how-it-works"
              variant="outline-inverse"
              size="lg"
            >
              How it works
            </ButtonLink>
          </div>
        </div>
      </div>
    </Container>
  );
}
