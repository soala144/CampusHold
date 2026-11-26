import { ButtonLink } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 px-4 text-center">
      <Logo />
      <div className="flex flex-col gap-2">
        <p className="font-mono text-sm text-subtle">404</p>
        <h1 className="font-display text-headline font-medium">Page not found</h1>
        <p className="text-muted">The page you&rsquo;re looking for doesn&rsquo;t exist or has moved.</p>
      </div>
      <div className="flex gap-2">
        <ButtonLink href="/">Go home</ButtonLink>
        <ButtonLink href="/dashboard" variant="secondary">Dashboard</ButtonLink>
      </div>
    </div>
  );
}
