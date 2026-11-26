"use client";

import { LayoutDashboard } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { useSignedIn } from "@/lib/store";

/** Log in / Get started for visitors; Dashboard once signed in. */
export function HeaderActions() {
  const signedIn = useSignedIn();
  if (signedIn) {
    return (
      <ButtonLink href="/dashboard" size="sm">
        <LayoutDashboard />
        Dashboard
      </ButtonLink>
    );
  }
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
