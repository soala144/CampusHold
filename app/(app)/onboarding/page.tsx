import type { Metadata } from "next";
import { Suspense } from "react";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";
import { BrowserOnly } from "@/components/ui/browser-only";

export const instant = false;

export const metadata: Metadata = { title: "Set up your account" };

export default function Page() {
  return (
    <Suspense>
      <BrowserOnly reason="The onboarding draft is saved in localStorage.">
        <OnboardingWizard />
      </BrowserOnly>
    </Suspense>
  );
}
