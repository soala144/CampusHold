import { LayoutDashboard } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { getSessionUser } from "@/lib/server/session";

export function GuestActions() {
  return (
    <>
      <ButtonLink href="/login" variant="secondary" size="sm">
        Log in
      </ButtonLink>
      <ButtonLink href="/signup" size="sm">
        Get started
      </ButtonLink>
    </>
  );
}

/** Reads the session cookie, so it must render inside a Suspense boundary. */
export async function HeaderActions() {
  const user = await getSessionUser().catch(() => null);
  if (!user) return <GuestActions />;
  return (
    <ButtonLink href={user.onboarded ? "/dashboard" : "/onboarding"} size="sm">
      <LayoutDashboard />
      {user.onboarded ? "Dashboard" : "Finish setup"}
    </ButtonLink>
  );
}
