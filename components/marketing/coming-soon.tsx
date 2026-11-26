import { ArrowLeft } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/primitives";

/** Temporary placeholder for routes that arrive in Stage 2. */
export function ComingSoon({ title, body }: { title: string; body: string }) {
  return (
    <Container className="flex flex-col items-center py-28 text-center md:py-36">
      <span className="rounded-full border border-line bg-surface px-3 py-1 text-sm text-muted">
        Coming soon
      </span>
      <h1 className="mt-6 font-display text-headline font-medium">{title}</h1>
      <p className="mt-4 max-w-md text-lg text-muted">{body}</p>
      <ButtonLink href="/" variant="secondary" className="mt-8">
        <ArrowLeft />
        Back to home
      </ButtonLink>
    </Container>
  );
}
