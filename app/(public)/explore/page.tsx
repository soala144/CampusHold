import type { Metadata } from "next";
import { Suspense } from "react";
import { Explore } from "@/components/explore/explore";

// Stage 2: browser-only page (see app/(public)/layout.tsx).
export const instant = false;

export const metadata: Metadata = {
  title: "Explore services",
  description: "Browse services from students and freelancers in the CampusHold community.",
};

export default function Page() {
  return (
    <Suspense>
      <Explore />
    </Suspense>
  );
}
