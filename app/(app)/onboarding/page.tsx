import type { Metadata } from "next";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";

// Stage 2: browser-only page (see app/(app)/layout.tsx).
export const instant = false;

export const metadata: Metadata = { title: "Set up your account" };

export default function Page() {
  return <OnboardingWizard />;
}
